import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useState } from 'react';
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
  formatForestArea,
  validateCompletePatrolInput,
  type CompletePatrolFormDraft,
  type CompletePatrolInput,
  type ForestArea,
  type Patrol,
} from '../../domain';
import { colors } from '../theme';
import { PatrolMetrics, PrimaryButton, TopAppBar } from '../ui';
import { formatDuration } from '../utils';

interface CompletePatrolScreenProps {
  patrol: Patrol;
  area: ForestArea;
  eventCount: number;
  observationCount: number;
  initialDraft?: CompletePatrolFormDraft;
  onBack: () => void;
  onDraftChange: (draft: CompletePatrolFormDraft) => void;
  onSubmit: (input: CompletePatrolInput) => Promise<void>;
}

export function CompletePatrolScreen({
  patrol,
  area,
  eventCount,
  observationCount,
  initialDraft,
  onBack,
  onDraftChange,
  onSubmit,
}: CompletePatrolScreenProps) {
  const [distance, setDistance] = useState(initialDraft?.distance ?? '');
  const [emergency, setEmergency] = useState<boolean | undefined>(
    initialDraft?.emergency,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const distanceNumber = Number(distance.replace(',', '.'));

  const submit = async () => {
    if (emergency === undefined) {
      setError('Vui lòng chọn có cần báo cáo khẩn hay không.');
      return;
    }
    const validationError = validateCompletePatrolInput({
      estimatedDistanceKm: distance ? distanceNumber : Number.NaN,
      emergencyReportRequired: emergency,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        estimatedDistanceKm: distanceNumber,
        emergencyReportRequired: emergency,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể hoàn thành chuyến tuần tra. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

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
        <TopAppBar onBack={onBack} title="Kết thúc chuyến tuần tra" />
        <View style={styles.finalityNotice}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.warning}
            name="warning"
            size={22}
          />
          <Text style={styles.finalityText}>
            Sau khi hoàn thành, chuyến tuần tra sẽ chuyển sang chế độ chỉ đọc.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Tổng quãng đường đi bộ *</Text>
          <View style={styles.distanceRow}>
            <TextInput
              accessibilityLabel="Tổng quãng đường đi bộ"
              keyboardType="decimal-pad"
              onChangeText={value => {
                setDistance(value);
                onDraftChange({
                  patrolId: patrol.id,
                  distance: value,
                  emergency,
                  confirming: false,
                });
              }}
              placeholder="Ví dụ: 6,5"
              placeholderTextColor={colors.textSecondary}
              style={styles.distanceInput}
              value={distance}
            />
            <Text style={styles.distanceUnit}>km</Text>
          </View>
        </View>
        <PatrolMetrics
          items={[
            { label: 'Thời lượng', value: formatDuration(patrol.startedAt) },
            { label: 'Sự kiện', value: String(eventCount) },
            { label: 'Quan trắc', value: String(observationCount) },
          ]}
        />
        <EmergencySelector
          onSelect={value => {
            setEmergency(value);
            onDraftChange({
              patrolId: patrol.id,
              distance,
              emergency: value,
              confirming: false,
            });
          }}
          selected={emergency}
        />
        <ConfirmationSummary
          rows={[
            ['Người đi tuần', patrol.rangerName],
            ['Khu vực', formatForestArea(area)],
            ['Quãng đường', distance ? `${distanceNumber} km` : 'Chưa nhập'],
            [
              'Báo cáo khẩn',
              emergency === undefined
                ? 'Chưa chọn'
                : emergency
                ? 'Có'
                : 'Không',
            ],
          ]}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={saving}
          icon="check-circle"
          label={saving ? 'Đang hoàn thành…' : 'Hoàn thành chuyến tuần tra'}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EmergencySelector({
  onSelect,
  selected,
}: {
  onSelect: (value: boolean) => void;
  selected?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Có cần báo cáo khẩn không? *</Text>
      <View style={styles.binaryRow}>
        {[
          { label: 'Có', value: true },
          { label: 'Không', value: false },
        ].map(option => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.label}
              onPress={() => onSelect(option.value)}
              style={[styles.binaryChoice, isSelected && styles.selected]}
            >
              <MaterialIcons
                accessibilityElementsHidden
                color={isSelected ? colors.primary : colors.textSecondary}
                name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                size={19}
              />
              <Text
                style={[styles.choiceText, isSelected && styles.selectedText]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ConfirmationSummary({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={styles.confirmationCard}>
      <Text style={styles.sectionTitle}>Xác nhận thông tin</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.confirmationRow}>
          <Text style={styles.confirmationLabel}>{label}</Text>
          <Text style={styles.confirmationValue}>{value}</Text>
        </View>
      ))}
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
    backgroundColor: colors.background,
  },
  finalityNotice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
  },
  finalityText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.text,
  },
  section: { gap: 10 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  distanceInput: {
    minHeight: 60,
    flex: 1,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  distanceUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  binaryRow: { flexDirection: 'row', gap: 8 },
  binaryChoice: {
    minHeight: 56,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.successSurface,
  },
  choiceText: { fontSize: 16, color: colors.text },
  selectedText: { fontWeight: '800', color: colors.primary },
  confirmationCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  confirmationRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmationLabel: { width: 110, fontSize: 13, color: colors.textSecondary },
  confirmationValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
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
