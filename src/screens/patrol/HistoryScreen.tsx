import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import {
  type ForestArea,
  type PatrolSummary,
  formatForestArea,
} from '../../domain';
import { colors } from '../theme';
import { BottomNavigation, type BottomTab, TopAppBar } from '../ui';

export function HistoryScreen({
  areas,
  patrols,
  onBack,
  onOpenPatrol,
  onTabSelect,
}: {
  areas: ForestArea[];
  patrols: PatrolSummary[];
  onBack: () => void;
  onOpenPatrol: (patrol: PatrolSummary) => void;
  onTabSelect: (tab: BottomTab) => void;
}) {
  const sections = patrols.reduce<
    Array<{ title: string; data: PatrolSummary[] }>
  >((groups, patrol) => {
    const date = new Date(patrol.completedAt ?? patrol.startedAt);
    const title = `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
    const current = groups[groups.length - 1];
    if (current?.title === title) current.data.push(patrol);
    else groups.push({ title, data: [patrol] });
    return groups;
  }, []);

  return (
    <View style={styles.root}>
      <SectionList
        contentContainerStyle={styles.list}
        keyExtractor={patrol => patrol.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.textSecondary}
              name="assignment"
              size={32}
            />
            <Text style={styles.bodyStrong}>Chưa có chuyến tuần tra nào</Text>
            <Text style={styles.meta}>
              Các chuyến đã hoàn thành sẽ xuất hiện tại đây.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <TopAppBar onBack={onBack} title="Lịch sử tuần tra" />
            <View style={styles.summary}>
              <MaterialIcons
                accessibilityElementsHidden
                color={colors.primary}
                name="storage"
                size={20}
              />
              <Text style={styles.summaryText}>
                {patrols.length} chuyến trên thiết bị
              </Text>
              <Text style={styles.sort}>Mới nhất</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const area = areas.find(
            candidate => candidate.id === item.forestAreaId,
          );
          return area ? (
            <HistoryPatrolCard
              area={area}
              onPress={() => onOpenPatrol(item)}
              patrol={item}
            />
          ) : null;
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>{section.title}</Text>
            <Text style={styles.monthCount}>{section.data.length} chuyến</Text>
          </View>
        )}
        sections={sections}
        stickySectionHeadersEnabled={false}
        style={styles.listView}
      />
      <BottomNavigation compactOnly active="history" onSelect={onTabSelect} />
    </View>
  );
}

function HistoryPatrolCard({
  area,
  onPress,
  patrol,
}: {
  area: ForestArea;
  onPress: () => void;
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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardHeading}>
        <Text style={styles.date}>{date}</Text>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name="chevron-right"
          size={24}
        />
      </View>
      <Text style={styles.ranger}>{patrol.rangerName}</Text>
      <View style={styles.iconTextRow}>
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.textSecondary}
          name="forest"
          size={17}
        />
        <Text style={styles.meta}>{formatForestArea(area)}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>
          {patrol.eventCount} sự kiện · {patrol.observationCount} quan trắc
        </Text>
        {patrol.emergencyReportRequired ? (
          <View style={styles.dangerBadge}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.danger}
              name="warning"
              size={14}
            />
            <Text style={styles.dangerText}>CẦN BÁO CÁO KHẨN</Text>
          </View>
        ) : (
          <Text style={styles.completed}>ĐÃ HOÀN THÀNH</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listView: { flex: 1 },
  list: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  header: { gap: 16, paddingBottom: 14 },
  summary: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  summaryText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sort: { fontSize: 13, fontWeight: '700', color: colors.primary },
  monthHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  monthTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  monthCount: { fontSize: 13, color: colors.textSecondary },
  card: {
    minHeight: 132,
    gap: 7,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: { fontSize: 18, fontWeight: '700', color: colors.text },
  ranger: { fontSize: 15, fontWeight: '700', color: colors.text },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardFooter: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  completed: { fontSize: 10, fontWeight: '800', color: colors.primary },
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
  empty: {
    gap: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
});
