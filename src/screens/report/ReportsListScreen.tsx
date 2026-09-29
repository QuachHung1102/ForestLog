import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatForestArea,
  type ForestArea,
  type PatrolSummary,
} from '../../domain';
import { colors } from '../theme';
import {
  BottomNavigation,
  type BottomTab,
  PrimaryButton,
  TopAppBar,
} from '../ui';

export function ReportsListScreen({
  areas,
  generatedPatrolId,
  onBack,
  onOpenReport,
  onTabSelect,
  patrols,
}: {
  areas: ForestArea[];
  generatedPatrolId?: string;
  onBack: () => void;
  onOpenReport: (patrol: PatrolSummary) => void;
  onTabSelect: (tab: BottomTab) => void;
  patrols: PatrolSummary[];
}) {
  const sections = [
    {
      title: 'Cần tạo báo cáo',
      suffix: 'chuyến',
      patrols: patrols.filter(patrol => patrol.id !== generatedPatrolId),
    },
    {
      title: 'Đã tạo trên thiết bị',
      suffix: 'tệp',
      patrols: patrols.filter(patrol => patrol.id === generatedPatrolId),
    },
  ].filter(section => section.patrols.length > 0);
  const generatedCount = generatedPatrolId ? 1 : 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.screen}>
        <TopAppBar onBack={onBack} title="Báo cáo" />
        <View style={styles.summary}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="description"
            size={20}
          />
          <Text style={styles.summaryText}>
            {generatedCount} báo cáo trên thiết bị
          </Text>
        </View>

        {patrols.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyMark}>
              <MaterialIcons
                accessibilityElementsHidden
                color={colors.primary}
                name="note-add"
                size={36}
              />
            </View>
            <Text style={styles.title}>Chưa có báo cáo</Text>
            <Text style={styles.metaCentered}>
              Hoàn tất một chuyến tuần tra để tạo PDF ngay trên thiết bị.
            </Text>
            <PrimaryButton
              icon="assignment"
              label="Xem lịch sử tuần tra"
              onPress={() => onTabSelect('history')}
            />
          </View>
        ) : (
          sections.map(section => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.meta}>
                  {section.patrols.length} {section.suffix}
                </Text>
              </View>
              {section.patrols.map(patrol => {
                const area = areas.find(
                  item => item.id === patrol.forestAreaId,
                );
                if (!area) return null;
                const ready = generatedPatrolId === patrol.id;
                const date = new Date(
                  patrol.completedAt ?? patrol.startedAt,
                ).toLocaleDateString('vi-VN');
                return (
                  <Pressable
                    accessibilityLabel={`${
                      ready ? 'Xem' : 'Tạo'
                    } báo cáo ngày ${date}`}
                    accessibilityRole="button"
                    key={patrol.id}
                    onPress={() => onOpenReport(patrol)}
                    style={({ pressed }) => [
                      styles.reportRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={ready ? styles.pdfMarker : styles.pendingMarker}
                    >
                      <MaterialIcons
                        accessibilityElementsHidden
                        color={ready ? colors.danger : colors.warning}
                        name={ready ? 'picture-as-pdf' : 'download'}
                        size={21}
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.reportTitle}>Báo cáo {date}</Text>
                      <Text style={styles.meta}>{patrol.rangerName}</Text>
                      <Text style={styles.reportArea}>
                        {formatForestArea(area)}
                      </Text>
                    </View>
                    <View style={styles.trailing}>
                      <View
                        style={ready ? styles.readyBadge : styles.pendingBadge}
                      >
                        <MaterialIcons
                          accessibilityElementsHidden
                          color={ready ? colors.primary : colors.warning}
                          name={ready ? 'check-circle' : 'schedule'}
                          size={14}
                        />
                        <Text
                          style={ready ? styles.readyText : styles.pendingText}
                        >
                          {ready ? 'ĐÃ TẠO' : 'TẠO PDF'}
                        </Text>
                      </View>
                      <MaterialIcons
                        accessibilityElementsHidden
                        color={colors.primary}
                        name="chevron-right"
                        size={22}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}

        <View style={styles.offlineNote}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.textSecondary}
            name="cloud-off"
            size={18}
          />
          <Text style={styles.meta}>PDF được tạo và lưu hoàn toàn offline</Text>
        </View>
      </ScrollView>
      <BottomNavigation compactOnly active="reports" onSelect={onTabSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  section: { gap: 10 },
  sectionHeading: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
  reportRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pdfMarker: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.dangerSurface,
  },
  pendingMarker: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.warningSurface,
  },
  grow: { flex: 1, gap: 3 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  reportArea: { fontSize: 12, color: colors.textSecondary },
  trailing: { alignItems: 'flex-end', gap: 9 },
  readyBadge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: colors.successSurface,
  },
  pendingBadge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: colors.warningSurface,
  },
  readyText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  pendingText: { fontSize: 10, fontWeight: '800', color: colors.warning },
  empty: { flex: 1, justifyContent: 'center', gap: 14, paddingVertical: 36 },
  emptyMark: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 38,
    backgroundColor: colors.surfaceSubtle,
  },
  title: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '700',
    color: colors.text,
  },
  meta: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  metaCentered: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  offlineNote: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: { opacity: 0.7 },
});
