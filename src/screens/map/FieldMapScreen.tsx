import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  type InitialViewState,
  OfflineManager,
  type OfflinePack,
  type OfflinePackStatus,
} from '@maplibre/maplibre-react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  ForestArea,
  ObservationWithPhotos,
  PatrolEventWithPhotos,
} from '../../domain';
import type { CapturedLocation } from '../../device/location';
import {
  createAreaPolygon,
  createOfflineMapBounds,
  createPolygonBounds,
  isAreaOfflinePack,
  mapBoundsContainPoint,
  MAP_DEVICE_TILE_LIMIT,
  MAP_DOWNLOAD_MIN_ZOOM,
  MAP_PACK_METADATA_KEY,
  MAP_SOURCE_MAX_ZOOM,
  MAP_STYLE_URL,
  selectOfflineMaxZoom,
  type LngLat,
  type MapBounds,
} from '../../device/offlineMap';
import { colors } from '../theme';
import { OutlineButton, TopAppBar } from '../ui';

export { createOfflineMapBounds, mapBoundsContainPoint };

type MapPointKind = 'event' | 'observation' | 'current';
type LocatedRecord = {
  id: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
};
type PointProperties = {
  id: string;
  kind: MapPointKind;
  accuracy?: number;
};
type MapDownloadState =
  | 'checking'
  | 'missing'
  | 'downloading'
  | 'ready'
  | 'error';

interface FieldMapScreenProps {
  area: ForestArea;
  events: PatrolEventWithPhotos[];
  observations: ObservationWithPhotos[];
  onBack: () => void;
  onLocate: () => Promise<CapturedLocation>;
}

const MAP_DOWNLOAD_RADIUS_KM = 8;

function hasCoordinates(
  value: LocatedRecord,
): value is LocatedRecord & { latitude: number; longitude: number } {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude! >= -90 &&
    value.latitude! <= 90 &&
    value.longitude! >= -180 &&
    value.longitude! <= 180
  );
}

export function createFieldMapPoints(
  events: readonly LocatedRecord[],
  observations: readonly LocatedRecord[],
  current?: CapturedLocation,
): GeoJSON.FeatureCollection<GeoJSON.Point, PointProperties> {
  const features: Array<GeoJSON.Feature<GeoJSON.Point, PointProperties>> = [];
  const append = (value: LocatedRecord, kind: MapPointKind) => {
    if (!hasCoordinates(value)) return;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [value.longitude, value.latitude],
      },
      properties: { id: value.id, kind, accuracy: value.gpsAccuracy },
    });
  };
  events.forEach(value => append(value, 'event'));
  observations.forEach(value => append(value, 'observation'));
  if (current) {
    append(
      {
        id: 'current',
        latitude: current.latitude,
        longitude: current.longitude,
        gpsAccuracy: current.accuracy,
      },
      'current',
    );
  }
  return { type: 'FeatureCollection', features };
}

function getBounds(
  points: GeoJSON.FeatureCollection<GeoJSON.Point, PointProperties>,
): MapBounds | undefined {
  if (!points.features.length) return undefined;
  const coordinates = points.features.map(
    feature => feature.geometry.coordinates,
  );
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const longitudePadding = Math.max((east - west) * 0.2, 0.001);
  const latitudePadding = Math.max((north - south) * 0.2, 0.001);
  return [
    west - longitudePadding,
    south - latitudePadding,
    east + longitudePadding,
    north + latitudePadding,
  ];
}

function initialViewState(
  points: GeoJSON.FeatureCollection<GeoJSON.Point, PointProperties>,
  bounds?: MapBounds,
): InitialViewState {
  if (points.features.length === 1) {
    const [longitude, latitude] = points.features[0].geometry.coordinates;
    return { center: [longitude, latitude], zoom: 16 };
  }
  return bounds
    ? { bounds, padding: { top: 42, right: 42, bottom: 42, left: 42 } }
    : { center: [108.2, 16.2], zoom: 5 };
}

export function FieldMapScreen({
  area,
  events,
  observations,
  onBack,
  onLocate,
}: FieldMapScreenProps) {
  const cameraRef = useRef<CameraRef>(null);
  const matchingPackRef = useRef<OfflinePack | undefined>(undefined);
  const subscribedPackIdRef = useRef<string | undefined>(undefined);
  const mountedRef = useRef(true);
  const [currentLocation, setCurrentLocation] = useState<CapturedLocation>();
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [mapDownloadState, setMapDownloadState] =
    useState<MapDownloadState>('checking');
  const [mapDownloadProgress, setMapDownloadProgress] = useState(0);
  const savedPointCount = useMemo(
    () => createFieldMapPoints(events, observations).features.length,
    [events, observations],
  );
  const points = useMemo(
    () => createFieldMapPoints(events, observations, currentLocation),
    [currentLocation, events, observations],
  );
  const areaPolygon = useMemo(() => createAreaPolygon(area), [area]);
  const areaBounds = useMemo(
    () => (area.boundary ? createPolygonBounds(area.boundary) : undefined),
    [area.boundary],
  );
  const pointBounds = useMemo(() => getBounds(points), [points]);
  const downloadCenter = useMemo<LngLat | undefined>(() => {
    if (areaBounds) {
      return [
        (areaBounds[0] + areaBounds[2]) / 2,
        (areaBounds[1] + areaBounds[3]) / 2,
      ];
    }
    if (currentLocation) {
      return [currentLocation.longitude, currentLocation.latitude];
    }
    if (!pointBounds) return undefined;
    return [
      (pointBounds[0] + pointBounds[2]) / 2,
      (pointBounds[1] + pointBounds[3]) / 2,
    ];
  }, [areaBounds, currentLocation, pointBounds]);
  const offlineBounds = useMemo(
    () =>
      areaBounds ??
      (downloadCenter
        ? createOfflineMapBounds(downloadCenter, MAP_DOWNLOAD_RADIUS_KM)
        : undefined),
    [areaBounds, downloadCenter],
  );
  const firstView = useMemo(
    () => initialViewState(points, areaBounds ?? pointBounds),
    // The initial camera is intentionally stable; later GPS updates use easeTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationError(false);
    try {
      const location = await onLocate();
      setCurrentLocation(location);
      cameraRef.current?.easeTo({
        center: [location.longitude, location.latitude],
        zoom: 16,
        duration: 450,
      });
    } catch {
      setLocationError(true);
    } finally {
      setLocating(false);
    }
  }, [onLocate]);

  useEffect(() => {
    locate();
  }, [locate]);

  const applyPackStatus = useCallback((status: OfflinePackStatus) => {
    if (!mountedRef.current) return;
    const progress = Math.max(0, Math.min(100, Math.round(status.percentage)));
    setMapDownloadProgress(progress);
    if (status.state === 'complete') {
      subscribedPackIdRef.current = undefined;
      setMapDownloadState('ready');
    } else {
      setMapDownloadState('downloading');
    }
  }, []);

  const observePack = useCallback(
    async (pack: OfflinePack) => {
      const status = await pack.status();
      applyPackStatus(status);
      if (status.state === 'complete') return;

      if (subscribedPackIdRef.current) {
        OfflineManager.removeListener(subscribedPackIdRef.current);
      }
      subscribedPackIdRef.current = pack.id;
      await OfflineManager.addListener(
        pack.id,
        (_offlinePack, nextStatus) => applyPackStatus(nextStatus),
        () => {
          if (mountedRef.current) setMapDownloadState('error');
        },
      );
      await pack.resume();
    },
    [applyPackStatus],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (subscribedPackIdRef.current) {
        OfflineManager.removeListener(subscribedPackIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!offlineBounds) {
      setMapDownloadState('missing');
      return;
    }

    setMapDownloadState('checking');
    OfflineManager.getPacks()
      .then(async packs => {
        const matchingPack = packs.find(pack =>
          area.boundary
            ? isAreaOfflinePack(pack, area.id)
            : pack.metadata[MAP_PACK_METADATA_KEY] === true &&
              Boolean(
                downloadCenter &&
                  mapBoundsContainPoint(pack.bounds, downloadCenter),
              ),
        );
        if (cancelled) return;
        matchingPackRef.current = matchingPack;
        if (matchingPack) {
          await observePack(matchingPack);
        } else {
          setMapDownloadProgress(0);
          setMapDownloadState('missing');
        }
      })
      .catch(() => {
        if (!cancelled) setMapDownloadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [area.boundary, area.id, downloadCenter, observePack, offlineBounds]);

  const downloadMap = useCallback(async () => {
    if (!offlineBounds) return;
    const existingPack = matchingPackRef.current;
    const refreshing = mapDownloadState === 'ready' && existingPack;
    setMapDownloadProgress(0);
    setMapDownloadState('downloading');
    try {
      if (refreshing) {
        await OfflineManager.invalidatePack(existingPack.id);
        if (mountedRef.current) {
          setMapDownloadProgress(100);
          setMapDownloadState('ready');
        }
        return;
      }
      if (existingPack) {
        await observePack(existingPack);
        return;
      }
      OfflineManager.setTileCountLimit(MAP_DEVICE_TILE_LIMIT);
      const pack = await OfflineManager.createPack(
        {
          mapStyle: MAP_STYLE_URL,
          bounds: offlineBounds,
          minZoom: MAP_DOWNLOAD_MIN_ZOOM,
          maxZoom: area.boundary
            ? selectOfflineMaxZoom(offlineBounds)
            : MAP_SOURCE_MAX_ZOOM,
          metadata: {
            [MAP_PACK_METADATA_KEY]: true,
            ...(area.boundary
              ? { areaId: area.id }
              : { radiusKm: MAP_DOWNLOAD_RADIUS_KM }),
          },
        },
        (_offlinePack, status) => applyPackStatus(status),
        () => {
          if (mountedRef.current) setMapDownloadState('error');
        },
      );
      matchingPackRef.current = pack;
      subscribedPackIdRef.current = pack.id;
    } catch {
      if (mountedRef.current) setMapDownloadState('error');
    }
  }, [
    applyPackStatus,
    area.boundary,
    area.id,
    mapDownloadState,
    observePack,
    offlineBounds,
  ]);

  const locationDetail = locating
    ? 'Đang xác định vị trí hiện tại…'
    : locationError
    ? 'Chưa lấy được vị trí · có thể thử lại'
    : currentLocation
    ? `Sai số khoảng ±${Math.round(currentLocation.accuracy)} m`
    : 'GPS chỉ dùng để xác định vị trí';
  const mapReady = mapDownloadState === 'ready';
  const downloadTargetLabel = area.boundary
    ? 'Tải bản đồ khu vực'
    : 'Tải vùng 8 km quanh vị trí';
  const mapDownloadLabel = !offlineBounds
    ? 'Cần GPS để chọn vùng tải'
    : mapDownloadState === 'checking'
    ? 'Đang kiểm tra bản đồ đã tải…'
    : mapDownloadState === 'downloading'
    ? `Đang tải bản đồ · ${mapDownloadProgress}%`
    : mapReady
    ? areaBounds
      ? 'Tải lại bản đồ khu vực'
      : downloadTargetLabel
    : mapDownloadState === 'error'
    ? 'Thử tải lại bản đồ khu vực'
    : downloadTargetLabel;
  const mapBadgeLabel = mapReady
    ? 'Đã tải'
    : mapDownloadState === 'downloading'
    ? `${mapDownloadProgress}%`
    : mapDownloadState === 'error'
    ? 'Lỗi tải'
    : 'Cần tải';
  const mapStatusIcon = mapReady
    ? 'check-circle'
    : mapDownloadState === 'error'
    ? 'error-outline'
    : 'cloud-download';
  const downloadDisabled =
    !offlineBounds ||
    mapDownloadState === 'checking' ||
    mapDownloadState === 'downloading';

  return (
    <View style={styles.screen}>
      <TopAppBar onBack={onBack} title="Bản đồ khu vực" />
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              {savedPointCount} điểm GPS đã lưu
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              numberOfLines={1}
              style={styles.statusDetail}
            >
              {locationDetail}
            </Text>
          </View>
          <View
            style={[
              styles.offlineBadge,
              mapReady
                ? styles.readyBadge
                : mapDownloadState === 'error'
                ? styles.errorBadge
                : styles.downloadBadge,
            ]}
          >
            <MaterialIcons
              accessibilityElementsHidden
              color={
                mapDownloadState === 'error' ? colors.danger : colors.primary
              }
              name={mapStatusIcon}
              size={16}
            />
            <Text
              style={[
                styles.offlineText,
                mapDownloadState === 'error' && styles.errorBadgeText,
              ]}
            >
              {mapBadgeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.mapFrame}>
          <Map
            attribution={false}
            compass
            logo={false}
            mapStyle={MAP_STYLE_URL}
            scaleBar={false}
            style={StyleSheet.absoluteFill}
            touchPitch={false}
          >
            <Camera
              initialViewState={firstView}
              maxZoom={20}
              minZoom={3}
              ref={cameraRef}
            />
            {areaPolygon ? (
              <GeoJSONSource data={areaPolygon} id="forest-area-boundary">
                <Layer
                  id="forest-area-fill"
                  paint={{
                    'fill-color': colors.primary,
                    'fill-opacity': 0.14,
                  }}
                  type="fill"
                />
                <Layer
                  id="forest-area-outline"
                  paint={{
                    'line-color': colors.primaryDark,
                    'line-width': 3,
                  }}
                  type="line"
                />
              </GeoJSONSource>
            ) : null}
            <GeoJSONSource data={points} id="field-points">
              <Layer
                filter={['==', ['get', 'kind'], 'event']}
                id="event-points"
                paint={{
                  'circle-color': colors.danger,
                  'circle-radius': 9,
                  'circle-stroke-color': colors.dangerSurface,
                  'circle-stroke-width': 6,
                }}
                type="circle"
              />
              <Layer
                filter={['==', ['get', 'kind'], 'observation']}
                id="observation-points"
                paint={{
                  'circle-color': colors.primary,
                  'circle-radius': 9,
                  'circle-stroke-color': colors.successSurface,
                  'circle-stroke-width': 6,
                }}
                type="circle"
              />
              <Layer
                filter={['==', ['get', 'kind'], 'current']}
                id="current-point"
                paint={{
                  'circle-color': colors.primary,
                  'circle-radius': 11,
                  'circle-stroke-color': colors.surface,
                  'circle-stroke-width': 4,
                }}
                type="circle"
              />
            </GeoJSONSource>
          </Map>
          <Pressable
            accessibilityLabel={
              mapReady ? 'Cập nhật bản đồ offline' : mapDownloadLabel
            }
            accessibilityRole="button"
            disabled={downloadDisabled}
            onPress={downloadMap}
            style={({ pressed }) => [
              styles.downloadAction,
              mapReady && styles.downloadActionReady,
              mapDownloadState === 'error' && styles.downloadActionError,
              pressed && styles.downloadActionPressed,
              downloadDisabled && !mapReady && styles.downloadActionDisabled,
            ]}
          >
            <MaterialIcons
              accessibilityElementsHidden
              color={
                mapDownloadState === 'error' ? colors.danger : colors.primary
              }
              name={mapStatusIcon}
              size={20}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.downloadActionText,
                mapDownloadState === 'error' && styles.downloadActionErrorText,
              ]}
            >
              {mapDownloadLabel}
            </Text>
          </Pressable>
          <Text pointerEvents="none" style={styles.attribution}>
            © OpenFreeMap · © OpenStreetMap
          </Text>
        </View>

        <View accessibilityLabel="Chú giải bản đồ" style={styles.legend}>
          <LegendItem color={colors.danger} icon="camera-alt" label="Sự kiện" />
          <LegendItem
            color={colors.primary}
            icon="water-drop"
            label="Quan trắc"
          />
          <LegendItem
            color={colors.primaryDark}
            icon="navigation"
            label="Hiện tại"
          />
        </View>
        <OutlineButton
          disabled={locating}
          icon="my-location"
          label={
            locating ? 'Đang cập nhật vị trí…' : 'Cập nhật vị trí hiện tại'
          }
          onPress={locate}
        />
      </View>
    </View>
  );
}

function LegendItem({
  color,
  icon,
  label,
}: {
  color: string;
  icon: 'camera-alt' | 'navigation' | 'water-drop';
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendMarker, { backgroundColor: color }]}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.surface}
          name={icon}
          size={14}
        />
      </View>
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  statusRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  statusDetail: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  offlineBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 17,
  },
  readyBadge: { backgroundColor: colors.successSurface },
  downloadBadge: { backgroundColor: colors.warningSurface },
  errorBadge: { backgroundColor: colors.dangerSurface },
  offlineText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  errorBadgeText: { color: colors.danger },
  mapFrame: {
    minHeight: 320,
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  downloadAction: {
    position: 'absolute',
    top: 12,
    right: 52,
    left: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  downloadActionReady: {
    borderColor: colors.border,
    backgroundColor: colors.successSurface,
  },
  downloadActionError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  downloadActionPressed: { backgroundColor: colors.successSurface },
  downloadActionDisabled: { opacity: 0.78 },
  downloadActionText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  downloadActionErrorText: { color: colors.danger },
  attribution: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    paddingHorizontal: 3,
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: `${colors.surface}D9`,
  },
  legend: { height: 72, flexDirection: 'row', gap: 8 },
  legendItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  legendMarker: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  legendText: { fontSize: 12, fontWeight: '700', color: colors.text },
});
