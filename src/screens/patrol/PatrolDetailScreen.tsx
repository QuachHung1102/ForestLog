import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {
  WEATHER_OPTIONS,
  formatDateTime,
  formatForestArea,
  type ForestArea,
  type ObservationWithPhotos,
  type PatrolEventWithPhotos,
  type PatrolSummary,
} from '../../domain';
import { colors } from '../theme';
import {
  FieldJournalHeader,
  PatrolEventRow,
  PatrolObservationRow,
  PrimaryButton,
  TopAppBar,
} from '../ui';

export function PatrolDetailScreen({
  patrol,
  area,
  events,
  observations,
  eventsLoadError,
  eventsLoading,
  onBack,
  onExportReport,
  onOpenEvent,
  onOpenObservation,
}: {
  patrol: PatrolSummary;
  area: ForestArea;
  events: PatrolEventWithPhotos[];
  observations: ObservationWithPhotos[];
  eventsLoadError: boolean;
  eventsLoading: boolean;
  onBack: () => void;
  onExportReport: () => void;
  onOpenEvent: (event: PatrolEventWithPhotos) => void;
  onOpenObservation: (observation: ObservationWithPhotos) => void;
}) {
  const weather = WEATHER_OPTIONS.find(item => item.value === patrol.weather);
  const entries = [
    ...events.map(value => ({
      kind: 'event' as const,
      at: value.occurredAt,
      value,
    })),
    ...observations.map(value => ({
      kind: 'observation' as const,
      at: value.observedAt,
      value,
    })),
  ].sort((left, right) => left.at.localeCompare(right.at));
  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={eventsLoading || eventsLoadError ? [] : entries}
      keyExtractor={entry => `${entry.kind}-${entry.value.id}`}
      ListEmptyComponent={
        <Text style={eventsLoadError ? styles.error : styles.meta}>
          {eventsLoadError
            ? 'Không thể mở nhật ký hiện trường. Hãy quay lại và thử lần nữa.'
            : eventsLoading
            ? 'Đang mở nhật ký hiện trường…'
            : 'Chuyến này chưa có ghi nhận.'}
        </Text>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <View style={styles.reportSummary}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.primary}
              name="description"
              size={22}
            />
            <View style={styles.grow}>
              <Text style={styles.bodyStrong}>
                PDF gồm sự kiện và quan trắc
              </Text>
            </View>
          </View>
          <PrimaryButton
            disabled={eventsLoading || eventsLoadError}
            icon="description"
            label="Xuất báo cáo"
            onPress={onExportReport}
          />
        </View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <TopAppBar onBack={onBack} title="Chi tiết tuần tra" />
          <PatrolCommandSummary area={area} patrol={patrol} />
          <View style={styles.readOnly}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.textSecondary}
              name="lock"
              size={18}
            />
            <Text style={styles.readOnlyText}>
              Đã hoàn thành · Chỉ đọc
            </Text>
          </View>
          <MetadataCard
            rows={[
              ['schedule', 'Bắt đầu', formatDateTime(patrol.startedAt)],
              [
                'event-available',
                'Kết thúc',
                patrol.completedAt ? formatDateTime(patrol.completedAt) : '—',
              ],
              ['cloud', 'Thời tiết', weather?.label ?? 'Chưa ghi nhận'],
              ['route', 'Quãng đường', `${patrol.estimatedDistanceKm ?? 0} km`],
            ]}
          />
          <FieldJournalHeader
            count={patrol.eventCount + patrol.observationCount}
          />
        </View>
      }
      renderItem={({ item }) =>
        item.kind === 'event' ? (
          <PatrolEventRow
            event={item.value}
            onPress={onOpenEvent}
            variant="detail"
          />
        ) : (
          <PatrolObservationRow
            observation={item.value}
            onPress={onOpenObservation}
            variant="detail"
          />
        )
      }
    />
  );
}

function PatrolCommandSummary({
  area,
  patrol,
}: {
  area: ForestArea;
  patrol: PatrolSummary;
}) {
  const date = new Date(
    patrol.completedAt ?? patrol.startedAt,
  ).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    <View style={styles.commandSummary}>
      <View style={styles.headingRow}>
        <Text style={styles.date}>{date}</Text>
        {patrol.emergencyReportRequired ? (
          <View style={styles.dangerBadge}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.danger}
              name="warning"
              size={15}
            />
            <Text style={styles.dangerText}>BÁO CÁO KHẨN</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.ranger}>{patrol.rangerName}</Text>
      <View style={styles.commandMetaRow}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.textOnDarkMuted}
          name="forest"
          size={18}
        />
        <Text style={styles.commandMeta}>{formatForestArea(area)}</Text>
      </View>
    </View>
  );
}

function MetadataCard({
  rows,
}: {
  rows: Array<[MaterialIconsIconName, string, string]>;
}) {
  return (
    <View style={styles.metadataCard}>
      {rows.map(([icon, label, value], index) => (
        <View
          key={label}
          style={[
            styles.metadataRow,
            index < rows.length - 1 && styles.rowDivider,
          ]}
        >
          <View style={styles.metadataIcon}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.primary}
              name={icon}
              size={19}
            />
          </View>
          <Text style={styles.metadataLabel}>{label}</Text>
          <Text style={styles.metadataValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  header: { gap: 17, paddingBottom: 8 },
  footer: { gap: 12, paddingTop: 16 },
  commandSummary: {
    minHeight: 132,
    gap: 9,
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
    gap: 12,
  },
  date: {
    flex: 1,
    flexShrink: 1,
    fontSize: 26,
    fontWeight: '700',
    color: colors.surface,
  },
  ranger: { fontSize: 17, fontWeight: '700', color: colors.surface },
  commandMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commandMeta: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    color: colors.textOnDarkMuted,
  },
  dangerBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.dangerSurface,
  },
  dangerText: { fontSize: 10, fontWeight: '800', color: colors.danger },
  readOnly: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  readOnlyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metadataCard: {
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  metadataRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  metadataIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.successSurface,
  },
  metadataLabel: { width: 76, fontSize: 13, color: colors.textSecondary },
  metadataValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  reportSummary: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  grow: { flex: 1 },
  bodyStrong: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
  },
  meta: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
    color: colors.danger,
    fontWeight: '600',
  },
});
