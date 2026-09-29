import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { useMemo, useState } from 'react';
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
  WEATHER_OPTIONS,
  formatDateTime,
  validatePatrolInput,
  type ForestArea,
  type PatrolFormDraft,
  type WeatherType,
} from '../../domain';
import { colors } from '../theme';
import { OutlineButton, PrimaryButton, TopAppBar } from '../ui';

const weatherIcons: Record<WeatherType, MaterialIconsIconName> = {
  sunny: 'wb-sunny',
  cloudy: 'cloud',
  rainy: 'water-drop',
  foggy: 'foggy',
  other: 'more-horiz',
};

interface CreatePatrolScreenProps {
  areas: ForestArea[];
  initialDraft?: PatrolFormDraft;
  onAddArea: () => void;
  onBack: () => void;
  onDraftChange: (draft: PatrolFormDraft) => void;
  onSubmit: (input: {
    rangerName: string;
    forestAreaId: string;
    weather?: WeatherType;
  }) => Promise<void>;
}

export function CreatePatrolScreen({
  areas,
  initialDraft,
  onAddArea,
  onBack,
  onDraftChange,
  onSubmit,
}: CreatePatrolScreenProps) {
  const [rangerName, setRangerName] = useState(initialDraft?.rangerName ?? '');
  const [subZone, setSubZone] = useState(initialDraft?.subZone ?? '');
  const [compartment, setCompartment] = useState(initialDraft?.compartment ?? '');
  const [forestAreaId, setForestAreaId] = useState(initialDraft?.forestAreaId ?? '');
  const [weather, setWeather] = useState<WeatherType | undefined>(initialDraft?.weather);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const subZones = useMemo(() => [...new Set(areas.map(area => area.subZone))], [areas]);
  const compartments = useMemo(
    () => [...new Set(areas.filter(area => area.subZone === subZone).map(area => area.compartment))],
    [areas, subZone],
  );
  const plots = useMemo(
    () => areas.filter(area => area.subZone === subZone && area.compartment === compartment),
    [areas, compartment, subZone],
  );

  const updateDraft = (change: Partial<PatrolFormDraft>) => {
    onDraftChange({ rangerName, subZone, compartment, forestAreaId, weather, ...change });
  };

  const submit = async () => {
    const input = { rangerName, forestAreaId, weather };
    const validationError = validatePatrolInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit(input);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể bắt đầu chuyến tuần tra. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <TopAppBar onBack={onBack} title="Tạo chuyến tuần tra" />
        <AutomaticTimeRow />
        <RangerField
          onChange={value => {
            setRangerName(value);
            updateDraft({ rangerName: value });
          }}
          value={rangerName}
        />
        <View style={styles.areaHeading}>
          <Text style={styles.sectionTitle}>Khu vực tuần tra</Text>
          <Text style={styles.meta}>Chọn lần lượt tiểu khu, khoảnh và lô.</Text>
        </View>
        <OutlineButton
          icon="add-location-alt"
          label="Tạo khu vực mới"
          onPress={onAddArea}
        />
        <AreaChoiceGroup
          label="Tiểu khu *"
          onSelect={value => {
            setSubZone(value);
            setCompartment('');
            setForestAreaId('');
            updateDraft({ subZone: value, compartment: '', forestAreaId: '' });
          }}
          options={subZones.map(value => ({ label: value, value }))}
          selected={subZone}
        />
        <AreaChoiceGroup
          label="Khoảnh *"
          onSelect={value => {
            setCompartment(value);
            setForestAreaId('');
            updateDraft({ compartment: value, forestAreaId: '' });
          }}
          options={compartments.map(value => ({ label: value, value }))}
          selected={compartment}
        />
        <AreaChoiceGroup
          label="Lô *"
          onSelect={value => {
            setForestAreaId(value);
            updateDraft({ forestAreaId: value });
          }}
          options={plots.map(area => ({ label: area.plot, value: area.id }))}
          selected={forestAreaId}
        />
        <WeatherSelector
          disabled={saving}
          onSelect={value => {
            setWeather(value);
            updateDraft({ weather: value });
          }}
          selected={weather}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          disabled={saving}
          icon="play-arrow"
          label={saving ? 'Đang lưu…' : 'Bắt đầu tuần tra'}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AutomaticTimeRow() {
  return (
    <View style={styles.automaticTimeRow}>
      <View style={styles.iconMarker}>
        <MaterialIcons accessibilityElementsHidden color={colors.primary} name="schedule" size={20} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.meta}>Thời gian bắt đầu tự động</Text>
        <Text style={styles.fieldData}>{formatDateTime(new Date().toISOString())}</Text>
      </View>
    </View>
  );
}

function RangerField({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.label}>Người đi tuần *</Text>
      <View style={styles.inputWithIcon}>
        <MaterialIcons accessibilityElementsHidden color={colors.textSecondary} name="person" size={21} />
        <TextInput
          accessibilityLabel="Tên người đi tuần"
          autoCapitalize="words"
          maxLength={100}
          onChangeText={onChange}
          placeholder="Nhập họ và tên"
          placeholderTextColor={colors.textSecondary}
          style={styles.inputInline}
          value={value}
        />
      </View>
    </View>
  );
}

function AreaChoiceGroup({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  selected?: string;
}) {
  if (options.length === 0) return null;
  return (
    <View style={styles.formSection}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceGrid}>
        {options.map(option => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.choice, isSelected && styles.selected]}
            >
              <Text style={[styles.choiceText, isSelected && styles.selectedText]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WeatherSelector({
  disabled,
  onSelect,
  selected,
}: {
  disabled: boolean;
  onSelect: (value: WeatherType) => void;
  selected?: WeatherType;
}) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.label}>Thời tiết (không bắt buộc)</Text>
      <View style={styles.choiceGrid}>
        {WEATHER_OPTIONS.map(option => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.weatherChoice, isSelected && styles.selected, disabled && styles.disabled]}
            >
              <MaterialIcons
                accessibilityElementsHidden
                color={isSelected ? colors.primary : colors.textSecondary}
                name={weatherIcons[option.value]}
                size={19}
              />
              <Text style={[styles.weatherText, isSelected && styles.selectedText]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark },
  screen: { flexGrow: 1, gap: 21, padding: 20, paddingTop: 0, paddingBottom: 18, backgroundColor: colors.background },
  automaticTimeRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.successSurface },
  iconMarker: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },
  grow: { flex: 1 },
  meta: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  fieldData: { fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : undefined, fontSize: 17, lineHeight: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  formSection: { gap: 9 },
  areaHeading: { gap: 4, paddingTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  inputWithIcon: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  inputInline: { flex: 1, minHeight: 54, padding: 0, fontSize: 17, color: colors.text },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 48, flexGrow: 1, flexBasis: '20%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  choiceText: { fontSize: 16, color: colors.text },
  weatherChoice: { minHeight: 48, flexGrow: 1, flexBasis: '30%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  weatherText: { flexShrink: 1, fontSize: 14, color: colors.text },
  selected: { borderColor: colors.primary, backgroundColor: colors.successSurface },
  selectedText: { fontWeight: '800', color: colors.primary },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  error: { padding: 12, borderRadius: 8, backgroundColor: colors.warningSurface, color: colors.danger, fontWeight: '600' },
});
