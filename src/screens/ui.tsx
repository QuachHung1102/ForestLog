import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  EVENT_TYPE_OPTIONS,
  OBSERVATION_SOURCE_OPTIONS,
  SEVERITY_OPTIONS,
  type ObservationWithPhotos,
  type PatrolEventWithPhotos,
} from '../domain';
import { colors } from './theme';

const TABLET_MIN_WIDTH = 600;
const EXPANDED_MIN_WIDTH = 840;
const NAVIGATION_RAIL_WIDTH = 88;

export function useTabletLayout(): boolean {
  return useWindowDimensions().width >= TABLET_MIN_WIDTH;
}

export function useExpandedLayout(): boolean {
  return useWindowDimensions().width >= EXPANDED_MIN_WIDTH;
}

const eventTypeIcons: Record<
  PatrolEventWithPhotos['type'],
  MaterialIconsIconName
> = {
  illegal_logging: 'forest',
  illegal_hunting: 'gps-fixed',
  fire_risk: 'local-fire-department',
  land_encroachment: 'agriculture',
  waste: 'delete-outline',
  no_violation: 'verified-user',
};

export const appStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark },
  shell: { flex: 1, backgroundColor: colors.background },
  tabletShell: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
  },
  contentHost: { flex: 1 },
  tabletContentHost: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  content: { flex: 1 },
  tabletContent: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
});

export function TopAppBar({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={styles.appBar}>
      <Pressable
        accessibilityLabel="Quay lại"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backTarget, pressed && styles.pressed]}
      >
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.surface}
          name="arrow-back"
          size={24}
        />
      </Pressable>
      <Text
        adjustsFontSizeToFit
        ellipsizeMode="tail"
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.appBarTitle}
      >
        {title}
      </Text>
    </View>
  );
}

export function PrimaryButton({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon?: MaterialIconsIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryPressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.surface}
          name={icon}
          size={22}
        />
      ) : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={styles.primaryText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function OutlineButton({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon?: MaterialIconsIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name={icon}
          size={21}
        />
      ) : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={styles.outlineText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DangerButton({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconsIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
    >
      <MaterialIcons
        accessibilityElementsHidden
        color={colors.danger}
        name={icon}
        size={21}
      />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={styles.dangerText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TextButton({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon?: MaterialIconsIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.textButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name={icon}
          size={19}
        />
      ) : null}
      <Text
        ellipsizeMode="tail"
        numberOfLines={1}
        style={styles.textButtonText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type BottomTab = 'home' | 'history' | 'reports' | 'settings';

const bottomTabs: Array<{
  icon: MaterialIconsIconName;
  label: string;
  value: BottomTab;
}> = [
  { value: 'home', label: 'Trang chủ', icon: 'home' },
  { value: 'history', label: 'Lịch sử', icon: 'assignment' },
  { value: 'reports', label: 'Báo cáo', icon: 'description' },
  { value: 'settings', label: 'Cài đặt', icon: 'settings' },
];

export function BottomNavigation({
  active,
  compactOnly = false,
  onSelect,
  variant = 'bar',
}: {
  active: BottomTab;
  compactOnly?: boolean;
  onSelect: (tab: BottomTab) => void;
  variant?: 'bar' | 'rail';
}) {
  const tablet = useTabletLayout();
  const rail = variant === 'rail';
  if (compactOnly && tablet) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bottomNavigation, rail && styles.navigationRail]}
    >
      {bottomTabs.map(tab => {
        const selected = tab.value === active;
        const color = selected ? colors.primary : colors.textSecondary;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.value}
            onPress={() => onSelect(tab.value)}
            style={({ pressed }) => [
              styles.bottomNavigationItem,
              rail && styles.navigationRailItem,
              selected &&
                (rail
                  ? styles.navigationRailItemActive
                  : styles.bottomNavigationItemActive),
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              accessibilityElementsHidden
              color={color}
              name={tab.icon}
              size={22}
            />
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[
                styles.bottomNavigationLabel,
                selected && styles.bottomNavigationLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LocalSaveRow({ label }: { label: string }) {
  return (
    <View style={styles.localSaveRow}>
      <MaterialIcons
        accessibilityElementsHidden
        color={colors.primary}
        name="check-circle"
        size={19}
      />
      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.localSaveText}>
        {label}
      </Text>
    </View>
  );
}

export function PatrolMetrics({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={styles.metricsRow}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[styles.metric, index > 0 && styles.metricDivider]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={styles.metricValue}
          >
            {item.value}
          </Text>
          <Text numberOfLines={1} style={styles.metricLabel}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FieldJournalHeader({ count }: { count: number }) {
  return (
    <View style={styles.journalHeader}>
      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.journalTitle}>
        Nhật ký hiện trường
      </Text>
      <Text numberOfLines={1} style={styles.journalCount}>
        {count} ghi nhận
      </Text>
    </View>
  );
}

export function FieldJournalEmptyState() {
  return (
    <View style={styles.emptyJournal}>
      <MaterialIcons
        accessibilityElementsHidden
        color={colors.textSecondary}
        name="edit-note"
        size={28}
      />
      <Text style={styles.emptyTitle}>Chưa có ghi nhận</Text>
      <Text style={styles.emptyText}>
        Sự kiện và phiếu quan trắc sẽ xuất hiện theo thứ tự thời gian.
      </Text>
    </View>
  );
}

export function PatrolObservationRow({
  observation,
  onPress,
  variant,
}: {
  observation: ObservationWithPhotos;
  onPress: (observation: ObservationWithPhotos) => void;
  variant: 'journal' | 'detail';
}) {
  const source = OBSERVATION_SOURCE_OPTIONS.find(
    item => item.value === observation.source,
  );
  const measurements = [
    observation.airTemperatureC === undefined
      ? undefined
      : `${observation.airTemperatureC}°C`,
    observation.relativeHumidityPct === undefined
      ? undefined
      : `${observation.relativeHumidityPct}% RH`,
    observation.rainfallMm === undefined
      ? undefined
      : `${observation.rainfallMm} mm mưa`,
  ].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(observation)}
      style={({ pressed }) => [
        styles.eventRow,
        variant === 'detail' && styles.eventRowCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.eventMarker, styles.markerWeather]}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name="water-drop"
          size={variant === 'detail' ? 21 : 24}
        />
      </View>
      <View style={styles.eventCopy}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.eventTitle}>
          Quan trắc thời tiết
        </Text>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.eventMeta}>
          {measurements.join(' · ') || source?.label || 'Quan sát hiện trường'}
        </Text>
      </View>
      <View style={styles.eventTimeColumn}>
        <Text style={styles.eventTime}>
          {new Date(observation.observedAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <MaterialIcons
          accessibilityElementsHidden
          color={
            observation.latitude === undefined
              ? colors.textSecondary
              : colors.primary
          }
          name={
            observation.latitude === undefined ? 'location-off' : 'location-on'
          }
          size={20}
        />
      </View>
    </Pressable>
  );
}

export function PatrolEventRow({
  event,
  onPress,
  variant,
}: {
  event: PatrolEventWithPhotos;
  onPress: (event: PatrolEventWithPhotos) => void;
  variant: 'journal' | 'detail';
}) {
  const type = EVENT_TYPE_OPTIONS.find(item => item.value === event.type);
  const severity = SEVERITY_OPTIONS.find(item => item.value === event.severity);
  const danger = event.severity === 'high';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(event)}
      style={({ pressed }) => [
        styles.eventRow,
        variant === 'detail' && styles.eventRowCompact,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.eventMarker,
          danger ? styles.markerDanger : styles.markerSuccess,
        ]}
      >
        <MaterialIcons
          accessibilityElementsHidden
          color={danger ? colors.danger : colors.primary}
          name={eventTypeIcons[event.type]}
          size={variant === 'detail' ? 21 : 24}
        />
      </View>
      <View style={styles.eventCopy}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.eventTitle}>
          {type?.label ?? event.type}
        </Text>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.eventMeta}>
          Mức độ: {severity?.label ?? 'Không áp dụng'} · {event.photos.length}{' '}
          ảnh
        </Text>
      </View>
      <View style={styles.eventTimeColumn}>
        <Text style={styles.eventTime}>
          {new Date(event.occurredAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <MaterialIcons
          accessibilityElementsHidden
          color={
            event.latitude === undefined ? colors.textSecondary : colors.primary
          }
          name={event.latitude === undefined ? 'location-off' : 'location-on'}
          size={20}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  appBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: -20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.primaryDark,
  },
  backTarget: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  appBarTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.surface,
  },
  primaryButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  primaryText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.surface,
  },
  outlineButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  outlineText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  dangerButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  dangerText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  textButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingRight: 16,
  },
  textButtonText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomNavigation: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    minHeight: 76,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomNavigationItem: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  bottomNavigationItemActive: { borderTopColor: colors.primary },
  navigationRail: {
    width: NAVIGATION_RAIL_WIDTH,
    maxWidth: NAVIGATION_RAIL_WIDTH,
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  navigationRailItem: {
    width: 72,
    minHeight: 72,
    flex: 0,
    borderTopWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderRadius: 12,
  },
  navigationRailItemActive: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.surfaceSubtle,
  },
  bottomNavigationLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  bottomNavigationLabelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  localSaveRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  localSaveText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  metricsRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  metric: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  metricValue: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : undefined,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  journalHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  journalTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  journalCount: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyJournal: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { textAlign: 'center', fontSize: 13, color: colors.textSecondary },
  eventRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventRowCompact: { minHeight: 82, paddingVertical: 10 },
  eventMarker: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  markerDanger: { backgroundColor: colors.dangerSurface },
  markerSuccess: { backgroundColor: colors.successSurface },
  markerWeather: { backgroundColor: colors.surfaceSubtle },
  eventCopy: { flex: 1, minWidth: 0, gap: 5 },
  eventTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.text,
  },
  eventMeta: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  eventTimeColumn: { width: 52, alignItems: 'flex-end', gap: 8 },
  eventTime: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : undefined,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.55 },
});
