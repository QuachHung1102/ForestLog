import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FIRE_SIGN_OPTIONS,
  OBSERVATION_SOURCE_OPTIONS,
  WEATHER_OPTIONS,
  formatDateTime,
  formatForestArea,
  type FireSign,
  type ForestArea,
  type ObservationSource,
  type ObservationWithPhotos,
  type WeatherType,
} from '../../domain';
import { FeaturedPhotoSection } from '../event/EventDetailScreen';
import { PhotoViewer } from '../event/PhotoViewer';
import { colors } from '../theme';
import { DangerButton, LocalSaveRow, PrimaryButton, TopAppBar } from '../ui';

const sourceIcons: Record<ObservationSource, MaterialIconsIconName> = {
  measured: 'speed',
  station_reading: 'warehouse',
  observed: 'visibility',
  estimated: 'center-focus-weak',
};

const weatherIcons: Record<WeatherType, MaterialIconsIconName> = {
  sunny: 'wb-sunny',
  cloudy: 'cloud',
  rainy: 'water-drop',
  foggy: 'foggy',
  other: 'more-horiz',
};

const fireSignIcons: Record<FireSign, MaterialIconsIconName> = {
  none: 'verified-user',
  active: 'local-fire-department',
  recent: 'whatshot',
  old: 'history',
};

export function ObservationDetailScreen({
  observation,
  area,
  editable,
  draftActive,
  onBack,
  onEdit,
  onDelete,
}: {
  observation: ObservationWithPhotos;
  area?: ForestArea;
  editable: boolean;
  draftActive: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (observation: ObservationWithPhotos) => Promise<void>;
}) {
  const [error, setError] = useState<string>();
  const [viewingPhoto, setViewingPhoto] = useState<number>();
  const source = OBSERVATION_SOURCE_OPTIONS.find(
    item => item.value === observation.source,
  )?.label;
  const weather = WEATHER_OPTIONS.find(
    item => item.value === observation.weather,
  )?.label;
  const fireSign = FIRE_SIGN_OPTIONS.find(
    item => item.value === observation.fireSign,
  )?.label;

  const confirmDelete = () => {
    Alert.alert(
      'Xóa phiếu quan trắc?',
      'Phiếu và các ảnh liên quan sẽ bị xóa khỏi thiết bị.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            onDelete(observation).catch(deleteError =>
              setError(
                deleteError instanceof Error
                  ? deleteError.message
                  : 'Không thể xóa phiếu quan trắc.',
              ),
            ),
        },
      ],
    );
  };

  const hasGps =
    observation.latitude !== undefined && observation.longitude !== undefined;
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <TopAppBar onBack={onBack} title="Chi tiết quan trắc" />
      <View style={styles.commandSummary}>
        <View style={styles.headingRow}>
          <Text style={styles.commandTitle}>Quan trắc nhanh</Text>
          <View style={styles.sourceBadge}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.primary}
              name={sourceIcons[observation.source]}
              size={15}
            />
            <Text style={styles.sourceText}>{source?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.commandMeta}>
          {formatDateTime(observation.observedAt)}
        </Text>
        <Text style={styles.commandMeta}>
          {area ? formatForestArea(area) : 'Khu vực chưa xác định'}
        </Text>
      </View>
      <View style={styles.gpsRow}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name={hasGps ? 'navigation' : 'location-off'}
          size={20}
        />
        <View style={styles.grow}>
          <Text style={styles.gpsTitle}>
            {hasGps ? 'Có tọa độ GPS' : 'Không có tọa độ GPS'}
          </Text>
          {hasGps ? (
            <Text style={styles.meta}>
              {observation.latitude!.toFixed(6)},{' '}
              {observation.longitude!.toFixed(6)}
              {observation.gpsAccuracy === undefined
                ? ''
                : ` · ±${Math.round(observation.gpsAccuracy)} m`}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.metricGrid}>
        <Metric
          icon="thermostat"
          label="Nhiệt độ"
          value={
            observation.airTemperatureC === undefined
              ? '—'
              : `${observation.airTemperatureC} °C`
          }
        />
        <Metric
          icon="water-drop"
          label="Độ ẩm"
          value={
            observation.relativeHumidityPct === undefined
              ? '—'
              : `${observation.relativeHumidityPct}%`
          }
        />
        <Metric
          icon={
            observation.weather
              ? weatherIcons[observation.weather]
              : 'cloud-off'
          }
          label="Thời tiết"
          value={weather ?? '—'}
        />
      </View>
      {observation.rainfallMm === undefined ? null : (
        <View style={styles.rainCard}>
          <View style={styles.headingRow}>
            <View style={styles.titleWithIcon}>
              <MaterialIcons
                accessibilityElementsHidden
                color={colors.primary}
                name="water-drop"
                size={22}
              />
              <Text style={styles.sectionTitle}>Lượng mưa tích lũy</Text>
            </View>
            <Text style={styles.rainfallValue}>
              {observation.rainfallMm} mm
            </Text>
          </View>
          <DetailRow
            label="Bắt đầu"
            value={formatDateTime(observation.rainfallStartedAt!)}
          />
          <DetailRow
            label="Kết thúc"
            value={formatDateTime(observation.rainfallEndedAt!)}
          />
          {observation.stationCode ? (
            <DetailRow label="Mã trạm" value={observation.stationCode} />
          ) : null}
        </View>
      )}
      <View
        style={[
          styles.fireRow,
          observation.fireSign !== 'none' && styles.fireWarning,
        ]}
      >
        <MaterialIcons
          accessibilityElementsHidden
          color={
            observation.fireSign === 'none' ? colors.primary : colors.warning
          }
          name={fireSignIcons[observation.fireSign]}
          size={22}
        />
        <Text style={styles.fireLabel}>
          {observation.fireSign === 'none'
            ? 'Không ghi nhận dấu hiệu cháy'
            : `Dấu hiệu cháy · ${fireSign}`}
        </Text>
      </View>
      <View style={styles.card}>
        <DetailRow
          icon="storage"
          label="Nguồn"
          value={source ?? observation.source}
        />
        <DetailRow
          icon="speed"
          label="Thiết bị / phương pháp"
          value={observation.deviceMethod || 'Chưa ghi nhận'}
        />
        <DetailRow
          icon="verified"
          label="Kiểm tra hiệu chuẩn"
          value={observation.calibrationCheckedAt || 'Chưa ghi nhận'}
        />
      </View>
      <FeaturedPhotoSection
        onView={setViewingPhoto}
        photos={observation.photos}
      />
      <View style={styles.notes}>
        <Text style={styles.label}>Ghi chú</Text>
        <Text style={styles.body}>
          {observation.note || 'Không có ghi chú'}
        </Text>
      </View>
      <LocalSaveRow
        label={`Đã lưu tại ${formatDateTime(observation.updatedAt)}`}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {draftActive ? (
        <Text style={styles.warning}>
          Hãy hoàn tất bản nháp quan trắc trước khi sửa hoặc xóa phiếu này.
        </Text>
      ) : null}
      {editable ? (
        <View style={styles.actions}>
          <PrimaryButton
            icon="edit"
            label="Chỉnh sửa quan trắc"
            onPress={onEdit}
          />
          <DangerButton
            icon="delete-outline"
            label="Xóa phiếu quan trắc"
            onPress={confirmDelete}
          />
        </View>
      ) : null}
      <PhotoViewer
        initialIndex={viewingPhoto}
        onClose={() => setViewingPhoto(undefined)}
        photos={observation.photos}
      />
    </ScrollView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: MaterialIconsIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <MaterialIcons
        accessibilityElementsHidden
        color={colors.primary}
        name={icon}
        size={19}
      />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: MaterialIconsIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      {icon ? (
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name={icon}
          size={18}
        />
      ) : null}
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    gap: 17,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  commandSummary: {
    minHeight: 122,
    gap: 8,
    marginTop: -17,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: colors.primaryDark,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commandTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 25,
    fontWeight: '700',
    color: colors.surface,
  },
  commandMeta: { fontSize: 14, lineHeight: 19, color: colors.textOnDarkMuted },
  sourceBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: colors.successSurface,
  },
  sourceText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  gpsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  grow: { flex: 1 },
  gpsTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  metricGrid: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    minHeight: 96,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  rainCard: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
  },
  card: {
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  rainfallValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  detailRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  fireRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  fireWarning: { backgroundColor: colors.warningSurface },
  fireLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  notes: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  meta: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  actions: { gap: 10 },
  warning: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
    color: colors.text,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
    color: colors.danger,
    fontWeight: '600',
  },
});
