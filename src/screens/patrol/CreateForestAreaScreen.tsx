import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  validateForestAreaInput,
  type CreateForestAreaInput,
  type ForestArea,
  type GeoCoordinate,
} from '../../domain';
import {
  createPolygonBounds,
  downloadForestAreaMap,
  MAP_DOWNLOAD_MIN_ZOOM,
  selectOfflineMaxZoom,
} from '../../device/offlineMap';
import { colors } from '../theme';
import {
  OutlineButton,
  PrimaryButton,
  TopAppBar,
  useExpandedLayout,
} from '../ui';

type VertexDraft = { id: string; latitude: string; longitude: string };

function emptyVertex(id: number): VertexDraft {
  return { id: `vertex-${id}`, latitude: '', longitude: '' };
}

function parseBoundary(vertices: VertexDraft[]): GeoCoordinate[] | undefined {
  const boundary = vertices.map(vertex => ({
    latitude: Number(vertex.latitude.trim().replace(',', '.')),
    longitude: Number(vertex.longitude.trim().replace(',', '.')),
  }));
  return vertices.some(
    vertex => !vertex.latitude.trim() || !vertex.longitude.trim(),
  )
    ? undefined
    : boundary;
}

export function CreateForestAreaScreen({
  onBack,
  onComplete,
  onSave,
}: {
  onBack: () => void;
  onComplete: () => void;
  onSave: (input: CreateForestAreaInput) => Promise<ForestArea>;
}) {
  const nextVertexId = useRef(2);
  const mounted = useRef(true);
  const [subZone, setSubZone] = useState('');
  const [compartment, setCompartment] = useState('');
  const [plot, setPlot] = useState('');
  const [vertices, setVertices] = useState(() => [
    emptyVertex(0),
    emptyVertex(1),
    emptyVertex(2),
  ]);
  const [savedArea, setSavedArea] = useState<ForestArea>();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const boundary = useMemo(() => parseBoundary(vertices), [vertices]);
  const mapPlan = useMemo(() => {
    if (!boundary) return undefined;
    try {
      const bounds = createPolygonBounds(boundary);
      return { bounds, maxZoom: selectOfflineMaxZoom(bounds) };
    } catch {
      return undefined;
    }
  }, [boundary]);

  const updateVertex = (
    id: string,
    field: 'latitude' | 'longitude',
    value: string,
  ) => {
    setError(undefined);
    setVertices(current =>
      current.map(vertex =>
        vertex.id === id ? { ...vertex, [field]: value } : vertex,
      ),
    );
  };

  const submit = async () => {
    let area = savedArea;
    if (!area) {
      const input: CreateForestAreaInput = {
        subZone,
        compartment,
        plot,
        boundary: boundary ?? [],
      };
      const validationError = validateForestAreaInput(input);
      if (validationError) {
        setError(validationError);
        return;
      }
      try {
        area = await onSave(input);
        if (mounted.current) setSavedArea(area);
      } catch (saveError) {
        if (mounted.current) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : 'Không thể lưu khu vực.',
          );
        }
        return;
      }
    }

    setDownloading(true);
    setError(undefined);
    try {
      await downloadForestAreaMap(area, progress => {
        if (mounted.current) setDownloadProgress(progress);
      });
      if (mounted.current) onComplete();
    } catch {
      if (mounted.current) {
        setError(
          'Khu vực đã được lưu. Chưa tải được bản đồ; hãy kết nối mạng và thử lại.',
        );
      }
    } finally {
      if (mounted.current) setDownloading(false);
    }
  };

  const fieldsLocked = Boolean(savedArea) || downloading;
  const expanded = useExpandedLayout();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <TopAppBar onBack={onBack} title="Tạo khu vực" />
        <View style={[styles.formGrid, expanded && styles.formGridExpanded]}>
          <View
            style={[styles.formColumn, expanded && styles.formColumnExpanded]}
          >
            <View style={styles.heading}>
              <Text style={styles.sectionTitle}>Thông tin khu vực</Text>
              <Text style={styles.meta}>
                Nhập đơn vị quản lý và ít nhất 3 đỉnh của đa giác.
              </Text>
            </View>
            <View style={styles.unitRow}>
              {[
                { label: 'Tiểu khu', value: subZone, onChange: setSubZone },
                {
                  label: 'Khoảnh',
                  value: compartment,
                  onChange: setCompartment,
                },
                { label: 'Lô', value: plot, onChange: setPlot },
              ].map(field => (
                <UnitField
                  editable={!fieldsLocked}
                  key={field.label}
                  label={field.label}
                  onChange={value => {
                    setError(undefined);
                    field.onChange(value);
                  }}
                  value={field.value}
                />
              ))}
            </View>
          </View>
          <View
            style={[styles.formColumn, expanded && styles.formColumnExpanded]}
          >
            <View style={styles.heading}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionTitle}>Các đỉnh đa giác</Text>
                <View style={styles.vertexCountBadge}>
                  <Text style={styles.vertexCountText}>
                    {vertices.length} ĐỈNH
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Nhập vĩ độ và kinh độ theo thứ tự quanh ranh giới.
              </Text>
            </View>
            {vertices.map((vertex, index) => (
              <View key={vertex.id} style={styles.vertexRow}>
                <View style={styles.vertexNumber}>
                  <Text style={styles.vertexNumberText}>{index + 1}</Text>
                </View>
                <CoordinateField
                  editable={!fieldsLocked}
                  label="Vĩ độ"
                  onChange={value => updateVertex(vertex.id, 'latitude', value)}
                  pointNumber={index + 1}
                  value={vertex.latitude}
                />
                <CoordinateField
                  editable={!fieldsLocked}
                  label="Kinh độ"
                  onChange={value =>
                    updateVertex(vertex.id, 'longitude', value)
                  }
                  pointNumber={index + 1}
                  value={vertex.longitude}
                />
                <Pressable
                  accessibilityLabel={`Xóa đỉnh ${index + 1}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: fieldsLocked || vertices.length <= 3,
                  }}
                  disabled={fieldsLocked || vertices.length <= 3}
                  hitSlop={4}
                  onPress={() =>
                    setVertices(current =>
                      current.filter(item => item.id !== vertex.id),
                    )
                  }
                  style={[
                    styles.deleteVertex,
                    (fieldsLocked || vertices.length <= 3) &&
                      styles.deleteVertexDisabled,
                  ]}
                >
                  <MaterialIcons
                    accessibilityElementsHidden
                    color={
                      vertices.length <= 3
                        ? colors.textSecondary
                        : colors.danger
                    }
                    name="delete-outline"
                    size={21}
                  />
                </Pressable>
              </View>
            ))}
            <OutlineButton
              disabled={fieldsLocked}
              icon="add"
              label="Thêm đỉnh"
              onPress={() => {
                nextVertexId.current += 1;
                setVertices(current => [
                  ...current,
                  emptyVertex(nextVertexId.current),
                ]);
              }}
            />
          </View>
        </View>
        <View style={styles.mapSummary}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="download-for-offline"
            size={22}
          />
          <View style={styles.grow}>
            <Text style={styles.mapSummaryTitle}>
              {downloading
                ? 'Đang tải bản đồ ngoại tuyến'
                : 'Bản đồ ngoại tuyến'}
            </Text>
            <Text style={styles.mapSummaryDetail}>
              {downloading
                ? `${downloadProgress}% · giữ ứng dụng mở đến khi hoàn tất`
                : mapPlan
                ? `${vertices.length} đỉnh · Zoom ${MAP_DOWNLOAD_MIN_ZOOM}–${mapPlan.maxZoom} · khung bao khu vực`
                : 'OpenFreeMap · Zoom phù hợp · vùng chữ nhật bao quanh'}
            </Text>
            {downloading ? (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${downloadProgress}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </View>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          disabled={downloading}
          icon={downloading ? 'downloading' : 'download'}
          label={
            downloading
              ? `Đang tải bản đồ · ${downloadProgress}%`
              : savedArea
              ? 'Tải lại bản đồ'
              : 'Lưu và tải bản đồ'
          }
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UnitField({
  editable,
  label,
  onChange,
  value,
}: {
  editable: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.unitField}>
      <Text style={[styles.label, focused && styles.focusedLabel]}>
        {label} *
      </Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        maxLength={40}
        onBlur={() => setFocused(false)}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        selectionColor={colors.primary}
        style={[styles.unitInput, focused && styles.focusedInput]}
        value={value}
      />
    </View>
  );
}

function CoordinateField({
  editable,
  label,
  onChange,
  pointNumber,
  value,
}: {
  editable: boolean;
  label: string;
  onChange: (value: string) => void;
  pointNumber: number;
  value: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.coordinateField}>
      <Text style={[styles.coordinateLabel, focused && styles.focusedLabel]}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={`${label} đỉnh ${pointNumber}`}
        editable={editable}
        inputMode="decimal"
        keyboardType="numeric"
        onBlur={() => setFocused(false)}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        selectTextOnFocus
        selectionColor={colors.primary}
        style={[styles.coordinateInput, focused && styles.focusedInput]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark },
  screen: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
    paddingTop: 0,
    paddingBottom: 18,
    backgroundColor: colors.background,
  },
  formGrid: { gap: 18 },
  formGridExpanded: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  formColumn: { gap: 18 },
  formColumnExpanded: { flex: 1 },
  heading: { gap: 5 },
  sectionHeadingRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  vertexCountBadge: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
  },
  vertexCountText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.primary,
  },
  meta: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  unitRow: { flexDirection: 'row', gap: 10 },
  unitField: { flex: 1, gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  unitInput: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  focusedInput: { borderColor: colors.primary, borderWidth: 2 },
  focusedLabel: { color: colors.primary },
  vertexRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  vertexNumber: {
    width: 34,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  vertexNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  coordinateField: { flex: 1, gap: 6 },
  coordinateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  coordinateInput: {
    minHeight: 52,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  deleteVertex: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteVertexDisabled: { opacity: 0.45 },
  mapSummary: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  grow: { flex: 1 },
  mapSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  mapSummaryDetail: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 4,
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: colors.surface,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
    color: colors.danger,
    fontWeight: '600',
  },
});
