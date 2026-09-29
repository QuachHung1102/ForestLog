import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  formatDateTime,
  formatForestArea,
  type ForestArea,
  type Patrol,
  type PatrolSummary,
} from '../../domain';
import { colors } from '../theme';
import { BottomNavigation, type BottomTab, PrimaryButton } from '../ui';

interface HomeScreenProps {
  activePatrol?: Patrol;
  activeArea?: ForestArea;
  completedPatrols: PatrolSummary[];
  onStart: () => void;
  onContinue: () => void;
  onHistory: () => void;
  onTabSelect: (tab: BottomTab) => void;
}

export function HomeScreen({
  activePatrol,
  activeArea,
  completedPatrols,
  onStart,
  onContinue,
  onHistory,
  onTabSelect,
}: HomeScreenProps) {
  const [online, setOnline] = useState<boolean>();

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      setOnline(
        state.isConnected === true && state.isInternetReachable !== false,
      );
    });
  }, []);

  const connectionLabel =
    online === undefined ? 'ĐANG KIỂM TRA' : online ? 'ONLINE' : 'OFFLINE';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brand}>
              <MaterialIcons
                accessibilityElementsHidden
                color={colors.surface}
                name="forest"
                size={28}
              />
              <Text style={styles.brandName}>ForestLog</Text>
            </View>
            <View
              accessibilityLiveRegion="polite"
              style={[styles.offlineBadge, online && styles.onlineBadge]}
            >
              <MaterialIcons
                accessibilityElementsHidden
                color={colors.primary}
                name={online ? 'cloud-done' : 'cloud-off'}
                size={16}
              />
              <Text style={styles.offlineText}>{connectionLabel}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Ghi nhận tuần tra rừng</Text>
          <Text style={styles.headerSubtitle}>
            Dữ liệu hiện trường luôn ở lại trên thiết bị.
          </Text>
        </View>

        {activePatrol && activeArea ? (
          <ActiveRecoveryBlock
            area={activeArea}
            onContinue={onContinue}
            patrol={activePatrol}
          />
        ) : (
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>
              Sẵn sàng cho chuyến tuần tra mới
            </Text>
            <Text style={styles.body}>
              Chọn khu vực, bắt đầu ghi nhận và làm việc ngay cả khi không có
              sóng.
            </Text>
            <PrimaryButton
              icon="play-arrow"
              label="Bắt đầu chuyến tuần tra"
              onPress={onStart}
            />
          </View>
        )}

        <View style={styles.localStatus}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="storage"
            size={22}
          />
          <View style={styles.grow}>
            <Text style={styles.bodyStrong}>Dữ liệu cục bộ đã sẵn sàng</Text>
            <Text style={styles.meta}>
              Mọi ghi nhận được lưu trên thiết bị.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onHistory}
          style={({ pressed }) => [
            styles.historyLink,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.grow}>
            <Text style={styles.sectionTitle}>Lịch sử tuần tra</Text>
            <Text style={styles.meta}>
              {completedPatrols.length === 0
                ? 'Chưa có chuyến tuần tra nào.'
                : `${completedPatrols.length} chuyến đã hoàn thành.`}
            </Text>
          </View>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="chevron-right"
            size={28}
          />
        </Pressable>
      </ScrollView>
      <BottomNavigation compactOnly active="home" onSelect={onTabSelect} />
    </View>
  );
}

function ActiveRecoveryBlock({
  area,
  onContinue,
  patrol,
}: {
  area: ForestArea;
  onContinue: () => void;
  patrol: Patrol;
}) {
  return (
    <View style={styles.recovery}>
      <View style={styles.recoveryHeading}>
        <Text numberOfLines={1} style={styles.recoveryTitle}>
          Đang tuần tra
        </Text>
        <View style={styles.warningBadge}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.warning}
            name="radio-button-checked"
            size={15}
          />
          <Text numberOfLines={1} style={styles.warningBadgeText}>
            ĐANG CHẠY
          </Text>
        </View>
      </View>
      <View style={styles.recoverySummary}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.bodyStrong}>
          {patrol.rangerName}
        </Text>
        <View style={styles.iconTextRow}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.textSecondary}
            name="forest"
            size={18}
          />
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.meta}>
            {formatForestArea(area)}
          </Text>
        </View>
        <View style={styles.iconTextRow}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.textSecondary}
            name="schedule"
            size={18}
          />
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.fieldData}>
            Bắt đầu {formatDateTime(patrol.startedAt)}
          </Text>
        </View>
      </View>
      <PrimaryButton
        icon="arrow-forward"
        label="Tiếp tục tuần tra"
        onPress={onContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 20,
    padding: 20,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 172,
    gap: 14,
    marginTop: -20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: colors.primaryDark,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontSize: 22, fontWeight: '800', color: colors.surface },
  offlineBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: colors.successSurface,
  },
  onlineBadge: { backgroundColor: colors.surface },
  offlineText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.surface,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textOnDarkMuted,
  },
  hero: { gap: 14, paddingVertical: 4 },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  bodyStrong: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  fieldData: {
    flexShrink: 1,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : undefined,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  grow: { flex: 1 },
  recovery: { gap: 16 },
  recoveryHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recoveryTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    color: colors.text,
  },
  warningBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: colors.warningSurface,
  },
  warningBadgeText: { fontSize: 10, fontWeight: '800', color: colors.warning },
  recoverySummary: {
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  localStatus: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  historyLink: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  pressed: { opacity: 0.7 },
});
