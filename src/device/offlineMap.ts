import {
  OfflineManager,
  type OfflinePack,
  type OfflinePackStatus,
} from '@maplibre/maplibre-react-native';
import type { Feature, Polygon } from 'geojson';
import type { ForestArea, GeoCoordinate } from '../domain';

export type LngLat = [longitude: number, latitude: number];
export type MapBounds = [west: number, south: number, east: number, north: number];

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const MAP_DOWNLOAD_MIN_ZOOM = 8;
export const MAP_SOURCE_MAX_ZOOM = 14;
export const MAP_PACK_TILE_BUDGET = 5_000;
export const MAP_DEVICE_TILE_LIMIT = 50_000;
export const MAP_PACK_METADATA_KEY = 'forestLogFieldMap';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function createPolygonBounds(boundary: GeoCoordinate[]): MapBounds {
  if (boundary.length < 3) throw new Error('Đa giác cần ít nhất 3 đỉnh.');
  return boundary.reduce<MapBounds>(
    (bounds, point) => [
      Math.min(bounds[0], point.longitude),
      Math.min(bounds[1], point.latitude),
      Math.max(bounds[2], point.longitude),
      Math.max(bounds[3], point.latitude),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

export function createOfflineMapBounds(
  [longitude, latitude]: LngLat,
  radiusKm = 8,
): MapBounds {
  const safeLatitude = clamp(latitude, -85, 85);
  const latitudeDelta = radiusKm / 110.574;
  const longitudeDelta =
    radiusKm /
    (111.32 * Math.max(Math.cos((safeLatitude * Math.PI) / 180), 0.1));
  return [
    clamp(longitude - longitudeDelta, -180, 180),
    clamp(safeLatitude - latitudeDelta, -85, 85),
    clamp(longitude + longitudeDelta, -180, 180),
    clamp(safeLatitude + latitudeDelta, -85, 85),
  ];
}

export function mapBoundsContainPoint(
  bounds: MapBounds,
  [longitude, latitude]: LngLat,
): boolean {
  return (
    longitude >= bounds[0] &&
    longitude <= bounds[2] &&
    latitude >= bounds[1] &&
    latitude <= bounds[3]
  );
}

function longitudeTile(longitude: number, zoom: number): number {
  const tileCount = 2 ** zoom;
  return clamp(Math.floor(((longitude + 180) / 360) * tileCount), 0, tileCount - 1);
}

function latitudeTile(latitude: number, zoom: number): number {
  const radians = (clamp(latitude, -85.05112878, 85.05112878) * Math.PI) / 180;
  const tileCount = 2 ** zoom;
  return clamp(
    Math.floor(
      ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * tileCount,
    ),
    0,
    tileCount - 1,
  );
}

export function countMapTiles(
  bounds: MapBounds,
  minZoom: number,
  maxZoom: number,
): number {
  let total = 0;
  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const west = longitudeTile(bounds[0], zoom);
    const east = longitudeTile(bounds[2], zoom);
    const north = latitudeTile(bounds[3], zoom);
    const south = latitudeTile(bounds[1], zoom);
    total += (east - west + 1) * (south - north + 1);
  }
  return total;
}

export function selectOfflineMaxZoom(
  bounds: MapBounds,
  tileBudget = MAP_PACK_TILE_BUDGET,
): number {
  for (
    let zoom = MAP_SOURCE_MAX_ZOOM;
    zoom >= MAP_DOWNLOAD_MIN_ZOOM;
    zoom -= 1
  ) {
    if (countMapTiles(bounds, MAP_DOWNLOAD_MIN_ZOOM, zoom) <= tileBudget) {
      return zoom;
    }
  }
  throw new Error('Khu vực quá lớn để tải một lần. Vui lòng chia thành khu vực nhỏ hơn.');
}

export function createAreaPolygon(area: ForestArea): Feature<Polygon> | undefined {
  if (!area.boundary) return undefined;
  const coordinates = area.boundary.map<LngLat>(point => [
    point.longitude,
    point.latitude,
  ]);
  return {
    type: 'Feature',
    properties: { areaId: area.id },
    geometry: {
      type: 'Polygon',
      coordinates: [[...coordinates, coordinates[0]]],
    },
  };
}

export function isAreaOfflinePack(pack: OfflinePack, areaId: string): boolean {
  return (
    pack.metadata[MAP_PACK_METADATA_KEY] === true &&
    pack.metadata.areaId === areaId
  );
}

export async function downloadForestAreaMap(
  area: ForestArea,
  onProgress: (percentage: number) => void,
): Promise<void> {
  if (!area.boundary) throw new Error('Khu vực chưa có ranh giới để tải bản đồ.');

  const bounds = createPolygonBounds(area.boundary);
  const maxZoom = selectOfflineMaxZoom(bounds);
  OfflineManager.setTileCountLimit(MAP_DEVICE_TILE_LIMIT);
  const existing = (await OfflineManager.getPacks()).find(pack =>
    isAreaOfflinePack(pack, area.id),
  );
  if (existing) {
    const status = await existing.status();
    onProgress(Math.round(status.percentage));
    if (status.state === 'complete') return;
  }

  let resolveDownload!: () => void;
  let rejectDownload!: (reason?: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveDownload = resolve;
    rejectDownload = reject;
  });
  const progress = (pack: OfflinePack, status: OfflinePackStatus) => {
    onProgress(clamp(Math.round(status.percentage), 0, 100));
    if (status.state === 'complete') {
      OfflineManager.removeListener(pack.id);
      resolveDownload();
    }
  };
  const failure = (pack: OfflinePack) => {
    OfflineManager.removeListener(pack.id);
    rejectDownload(new Error('Không thể tải bản đồ khu vực.'));
  };

  try {
    if (existing) {
      await OfflineManager.addListener(existing.id, progress, failure);
      await existing.resume();
    } else {
      const created = await OfflineManager.createPack(
        {
          mapStyle: MAP_STYLE_URL,
          bounds,
          minZoom: MAP_DOWNLOAD_MIN_ZOOM,
          maxZoom,
          metadata: {
            [MAP_PACK_METADATA_KEY]: true,
            areaId: area.id,
            maxZoom,
          },
        },
        progress,
        failure,
      );
      progress(created, await created.status());
    }
  } catch (error) {
    rejectDownload(error);
  }
  await completion;
}
