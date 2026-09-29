import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {
  WEATHER_OPTIONS,
  formatDateTime,
  formatForestArea,
  type EventDraft,
  type ForestArea,
  type ObservationDraft,
  type ObservationWithPhotos,
  type Patrol,
  type PatrolEventWithPhotos,
} from '../../domain';
import { colors } from '../theme';
import {
  FieldJournalEmptyState,
  FieldJournalHeader,
  LocalSaveRow,
  OutlineButton,
  PatrolEventRow,
  PatrolObservationRow,
  PatrolMetrics,
  PrimaryButton,
  TopAppBar,
} from '../ui';
import { formatDuration } from '../utils';

interface ActivePatrolScreenProps {
  patrol: Patrol;
  area: ForestArea;
  draft?: EventDraft;
  observationDraft?: ObservationDraft;
  events: PatrolEventWithPhotos[];
  observations: ObservationWithPhotos[];
  onHome: () => void;
  onComplete: () => void;
  onOpenMap: () => void;
  onRecordEvent: () => void;
  onRecordObservation: () => void;
  onOpenEvent: (event: PatrolEventWithPhotos) => void;
  onOpenObservation: (observation: ObservationWithPhotos) => void;
}

export function ActivePatrolScreen({
  patrol,
  area,
  draft,
  observationDraft,
  events,
  observations,
  onHome,
  onComplete,
  onOpenMap,
  onRecordEvent,
  onRecordObservation,
  onOpenEvent,
  onOpenObservation,
}: ActivePatrolScreenProps) {
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
  const hasDraft = Boolean(draft || observationDraft);
  const gpsPointCount = [...events, ...observations].filter(
    item => item.latitude !== undefined && item.longitude !== undefined,
  ).length;
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={entries}
      keyExtractor={entry => `${entry.kind}-${entry.value.id}`}
      ListEmptyComponent={<FieldJournalEmptyState />}
      ListFooterComponent={
        <View style={styles.footer}>
          {hasDraft ? (
            <Text style={styles.meta}>Lưu bản nháp trước khi kết thúc.</Text>
          ) : null}
          <LocalSaveRow label="Đã lưu trên thiết bị" />
          <OutlineButton
            disabled={hasDraft}
            icon="flag"
            label="Kết thúc tuần tra"
            onPress={onComplete}
          />
        </View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <TopAppBar onBack={onHome} title="Đang tuần tra" />
          <PatrolCommandSummary
            area={area}
            patrol={patrol}
            weather={weather?.label}
          />
          <PrimaryButton
            icon={draft ? 'edit-note' : 'add'}
            label={draft ? 'Tiếp tục ghi nhận' : 'Ghi nhận sự kiện'}
            onPress={onRecordEvent}
          />
          <OutlineButton
            icon={observationDraft ? 'edit-note' : 'water-drop'}
            label={observationDraft ? 'Tiếp tục quan trắc' : 'Ghi quan trắc'}
            onPress={onRecordObservation}
          />
          <OutlineButton
            icon="map"
            label={`Bản đồ khu vực · ${gpsPointCount} điểm`}
            onPress={onOpenMap}
          />
          <PatrolMetrics
            items={[
              { label: 'Sự kiện', value: String(events.length) },
              {
                label: 'Thời lượng',
                value: formatDuration(patrol.startedAt, undefined, true),
              },
              { label: 'Quan trắc', value: String(observations.length) },
            ]}
          />
          <FieldJournalHeader count={entries.length} />
        </View>
      }
      renderItem={({ item }) =>
        item.kind === 'event' ? (
          <PatrolEventRow
            event={item.value}
            onPress={onOpenEvent}
            variant="journal"
          />
        ) : (
          <PatrolObservationRow
            observation={item.value}
            onPress={onOpenObservation}
            variant="journal"
          />
        )
      }
    />
  );
}

function PatrolCommandSummary({
  area,
  patrol,
  weather,
}: {
  area: ForestArea;
  patrol: Patrol;
  weather?: string;
}) {
  return (
    <View style={styles.commandSummary}>
      <View style={styles.headingRow}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.ranger}>
          {patrol.rangerName}
        </Text>
        <View style={styles.activeBadge}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="radio-button-checked"
            size={15}
          />
          <Text numberOfLines={1} style={styles.activeText}>
            ĐANG CHẠY
          </Text>
        </View>
      </View>
      <View style={styles.commandMetaRow}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.textOnDarkMuted}
          name="forest"
          size={18}
        />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.commandMeta}>
          {formatForestArea(area)}
        </Text>
      </View>
      <View style={styles.commandMetaRow}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.textOnDarkMuted}
          name="schedule"
          size={18}
        />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.commandMeta}>
          Bắt đầu {formatDateTime(patrol.startedAt)}
        </Text>
      </View>
      <View style={styles.commandMetaRow}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.textOnDarkMuted}
          name="cloud"
          size={18}
        />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.commandMeta}>
          {weather ?? 'Chưa ghi nhận'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  header: { gap: 18, paddingBottom: 8 },
  footer: { gap: 12, paddingTop: 16 },
  commandSummary: {
    minHeight: 160,
    gap: 12,
    marginTop: -18,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 18,
    backgroundColor: colors.primaryDark,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ranger: {
    flex: 1,
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.surface,
  },
  activeBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: colors.successSurface,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.primary,
  },
  commandMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commandMeta: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    color: colors.textOnDarkMuted,
  },
  meta: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
