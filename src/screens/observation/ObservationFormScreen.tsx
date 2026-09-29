import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  FIRE_SIGN_OPTIONS,
  OBSERVATION_SOURCE_OPTIONS,
  WEATHER_OPTIONS,
  parseFieldDateTime,
  parseOptionalDecimal,
  validateObservationInput,
  type ObservationDraft,
  type FireSign,
  type ObservationSource,
  type SaveObservationInput,
  type WeatherType,
} from '../../domain';
import { LocationPermissionError } from '../../device/location';
import { MediaPermissionError } from '../../device/media';
import { GpsStatusRow, FieldPhotoSection } from '../event/EventFormScreen';
import { PhotoViewer } from '../event/PhotoViewer';
import { colors } from '../theme';
import { PrimaryButton, TextButton, TopAppBar } from '../ui';

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

interface ObservationFormScreenProps {
  draft: ObservationDraft;
  draftSaveError: boolean;
  onBack: () => void;
  onAcquireGps: () => Promise<void>;
  onAddPhotos: (source: 'camera' | 'library') => Promise<void>;
  onChange: (draft: ObservationDraft) => void;
  onRemovePhoto: (photoId: string) => Promise<void>;
  onSubmit: (input: SaveObservationInput) => Promise<void>;
}

export function ObservationFormScreen({
  draft,
  draftSaveError,
  onBack,
  onAcquireGps,
  onAddPhotos,
  onChange,
  onRemovePhoto,
  onSubmit,
}: ObservationFormScreenProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [deviceError, setDeviceError] = useState<string>();
  const [permissionError, setPermissionError] = useState(false);
  const [permissionSource, setPermissionSource] = useState<
    'camera' | 'library' | 'gps'
  >();
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<number>();
  const acquireGpsRef = useRef(onAcquireGps);
  const initialGpsStatus = useRef(draft.gpsStatus);
  acquireGpsRef.current = onAcquireGps;

  useEffect(() => {
    if (initialGpsStatus.current !== 'idle') return;
    let mounted = true;
    acquireGpsRef.current().catch(locationError => {
      if (!mounted) return;
      setPermissionError(locationError instanceof LocationPermissionError);
      setPermissionSource('gps');
      setDeviceError(
        'Không thể lấy tọa độ. Bạn vẫn có thể lưu phiếu quan trắc.',
      );
    });
    return () => {
      mounted = false;
    };
  }, [draft.patrolId]);

  const update = (change: Partial<ObservationDraft>) => {
    if (!saving) {
      onChange({ ...draft, ...change, updatedAt: new Date().toISOString() });
    }
  };

  const acquireGps = async () => {
    if (saving) return;
    setDeviceBusy(true);
    setDeviceError(undefined);
    try {
      await onAcquireGps();
    } catch (locationError) {
      setPermissionError(locationError instanceof LocationPermissionError);
      setPermissionSource('gps');
      setDeviceError(
        'Không thể lấy tọa độ. Bạn vẫn có thể lưu phiếu quan trắc.',
      );
    } finally {
      setDeviceBusy(false);
    }
  };

  const addPhotos = async (source: 'camera' | 'library') => {
    if (saving) return;
    setDeviceBusy(true);
    setDeviceError(undefined);
    try {
      await onAddPhotos(source);
    } catch (mediaError) {
      setPermissionError(mediaError instanceof MediaPermissionError);
      setPermissionSource(source);
      setDeviceError(
        mediaError instanceof Error
          ? mediaError.message
          : 'Không thể thêm ảnh. Vui lòng thử lại.',
      );
    } finally {
      setDeviceBusy(false);
    }
  };

  const submit = async () => {
    const input: SaveObservationInput = {
      source: draft.source,
      observedAt: parseFieldDateTime(draft.observedAt),
      airTemperatureC: parseOptionalDecimal(draft.airTemperature),
      relativeHumidityPct: parseOptionalDecimal(draft.relativeHumidity),
      weather: draft.weather,
      rainfallMm: parseOptionalDecimal(draft.rainfall),
      rainfallStartedAt: draft.rainfallStartedAt
        ? parseFieldDateTime(draft.rainfallStartedAt)
        : undefined,
      rainfallEndedAt: draft.rainfallEndedAt
        ? parseFieldDateTime(draft.rainfallEndedAt)
        : undefined,
      stationCode: draft.stationCode,
      fireSign: draft.fireSign,
      deviceMethod: draft.deviceMethod,
      calibrationCheckedAt: draft.calibrationCheckedAt,
      note: draft.note,
      latitude: draft.latitude,
      longitude: draft.longitude,
      gpsAccuracy: draft.gpsAccuracy,
      photos: draft.photos,
    };
    const validationError = validateObservationInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit(input);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể lưu phiếu quan trắc. Nội dung vẫn còn trên máy.',
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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <TopAppBar
          onBack={onBack}
          title={
            draft.editingObservationId ? 'Chỉnh sửa quan trắc' : 'Ghi quan trắc'
          }
        />
        <View style={styles.timeContext}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="schedule"
            size={20}
          />
          <View style={styles.grow}>
            <Text style={styles.timeLabel}>Thời điểm quan trắc</Text>
            <TextInput
              accessibilityLabel="Thời điểm quan trắc"
              maxLength={100}
              onChangeText={observedAt => update({ observedAt })}
              placeholder="DD/MM/YYYY HH:mm"
              placeholderTextColor={colors.textSecondary}
              style={styles.timeInput}
              value={draft.observedAt}
            />
          </View>
        </View>
        <GpsStatusRow
          busy={deviceBusy}
          disabled={saving}
          draft={draft}
          onRetry={acquireGps}
        />
        <ChoiceGrid
          icons={sourceIcons}
          label="Nguồn dữ liệu *"
          onSelect={source =>
            update({ source: source as ObservationDraft['source'] })
          }
          options={OBSERVATION_SOURCE_OPTIONS}
          selected={draft.source}
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số đo vi khí hậu</Text>
          <View style={styles.inputRow}>
            <LabeledInput
              keyboardType="decimal-pad"
              label="Nhiệt độ không khí (°C)"
              onChangeText={airTemperature => update({ airTemperature })}
              placeholder="28,5"
              value={draft.airTemperature}
            />
            <LabeledInput
              keyboardType="decimal-pad"
              label="Độ ẩm tương đối (%)"
              onChangeText={relativeHumidity => update({ relativeHumidity })}
              placeholder="78"
              value={draft.relativeHumidity}
            />
          </View>
          <ChoiceGrid
            compact
            icons={weatherIcons}
            label="Trạng thái thời tiết"
            onSelect={weather =>
              update({ weather: weather as ObservationDraft['weather'] })
            }
            options={WEATHER_OPTIONS}
            selected={draft.weather}
          />
        </View>
        <View style={styles.rainCard}>
          <View style={styles.cardHeading}>
            <Text style={styles.sectionTitle}>Lượng mưa tích lũy</Text>
            <Text style={styles.optional}>Tùy chọn</Text>
          </View>
          <View style={styles.rainRule}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.warning}
              name="info-outline"
              size={18}
            />
            <Text style={styles.rainRuleText}>
              Có số mm phải có khoảng đo và mã trạm / ống đo.
            </Text>
          </View>
          <View style={styles.inputRow}>
            <LabeledInput
              keyboardType="decimal-pad"
              label="Lượng mưa (mm)"
              onChangeText={rainfall => update({ rainfall })}
              placeholder="12,4"
              value={draft.rainfall}
            />
            <LabeledInput
              label="Mã trạm / ống đo"
              onChangeText={stationCode => update({ stationCode })}
              placeholder="MUA-TK12-03"
              value={draft.stationCode}
            />
          </View>
          <View style={styles.inputRow}>
            <LabeledInput
              label="Bắt đầu khoảng đo"
              onChangeText={rainfallStartedAt => update({ rainfallStartedAt })}
              placeholder="DD/MM/YYYY HH:mm"
              value={draft.rainfallStartedAt}
            />
            <LabeledInput
              label="Kết thúc"
              onChangeText={rainfallEndedAt => update({ rainfallEndedAt })}
              placeholder="DD/MM/YYYY HH:mm"
              value={draft.rainfallEndedAt}
            />
          </View>
        </View>
        <ChoiceGrid
          icons={fireSignIcons}
          label="Dấu hiệu cháy"
          onSelect={fireSign =>
            update({ fireSign: fireSign as ObservationDraft['fireSign'] })
          }
          options={FIRE_SIGN_OPTIONS}
          selected={draft.fireSign}
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thiết bị và phương pháp</Text>
          <LabeledInput
            label="Thiết bị / phương pháp đo"
            onChangeText={deviceMethod => update({ deviceMethod })}
            placeholder="Ví dụ: Ẩm nhiệt kế Kestrel 5500"
            value={draft.deviceMethod}
          />
          <LabeledInput
            label="Kiểm tra hiệu chuẩn gần nhất"
            onChangeText={calibrationCheckedAt =>
              update({ calibrationCheckedAt })
            }
            placeholder="DD/MM/YYYY hoặc ghi chú"
            value={draft.calibrationCheckedAt}
          />
        </View>
        <FieldPhotoSection
          disabled={deviceBusy || saving}
          onAdd={addPhotos}
          onRemove={onRemovePhoto}
          onView={setViewingPhoto}
          photos={draft.photos}
        />
        {deviceError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{deviceError}</Text>
            {permissionError ? (
              <>
                <TextButton
                  icon="settings"
                  label="Mở cài đặt quyền"
                  onPress={() => Linking.openSettings()}
                />
                <TextButton
                  icon="refresh"
                  label="Thử lại"
                  onPress={() =>
                    permissionSource === 'gps'
                      ? acquireGps()
                      : addPhotos(permissionSource ?? 'camera')
                  }
                />
              </>
            ) : null}
          </View>
        ) : null}
        <LabeledInput
          label="Ghi chú"
          multiline
          onChangeText={note => update({ note })}
          placeholder="Điều kiện địa hình, tán che hoặc bất thường tại điểm đo..."
          value={draft.note}
        />
        {draftSaveError ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            Chưa thể tự lưu bản nháp. Nội dung vẫn được giữ trên màn hình.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={saving || deviceBusy || draft.gpsStatus === 'acquiring'}
          icon="save"
          label={saving ? 'Đang lưu trên thiết bị…' : 'Lưu phiếu quan trắc'}
          onPress={submit}
        />
        <PhotoViewer
          initialIndex={viewingPhoto}
          onClose={() => setViewingPhoto(undefined)}
          photos={draft.photos}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChoiceGrid({
  compact = false,
  icons,
  label,
  onSelect,
  options,
  selected,
}: {
  compact?: boolean;
  icons: Record<string, MaterialIconsIconName>;
  label: string;
  onSelect: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected?: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={compact ? styles.label : styles.sectionTitle}>{label}</Text>
      <View style={styles.choiceGrid}>
        {options.map(option => {
          const active = option.value === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.choice, active && styles.selected]}
            >
              <MaterialIcons
                accessibilityElementsHidden
                color={active ? colors.primary : colors.textSecondary}
                name={icons[option.value]}
                size={18}
              />
              <Text style={[styles.choiceText, active && styles.selectedText]}>
                {option.label}
              </Text>
              {active ? (
                <MaterialIcons
                  accessibilityElementsHidden
                  color={colors.primary}
                  name="check-circle"
                  size={17}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LabeledInput({
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'decimal-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        maxLength={multiline ? 2000 : 100}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, multiline && styles.notesInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark },
  screen: {
    flexGrow: 1,
    gap: 20,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  timeContext: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  grow: { flex: 1 },
  timeLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  timeInput: {
    minHeight: 24,
    padding: 0,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text,
  },
  field: { flex: 1, gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    minHeight: 54,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  notesInput: { minHeight: 96, paddingTop: 13 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    width: '48.8%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  choiceText: { flex: 1, fontSize: 14, color: colors.text },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.successSurface,
  },
  selectedText: { fontWeight: '800', color: colors.primary },
  rainCard: {
    gap: 10,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  optional: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  rainRule: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
  },
  rainRuleText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.warning },
  errorBox: {
    gap: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
  },
  errorText: { fontSize: 16, lineHeight: 24, color: colors.danger },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
    color: colors.danger,
    fontWeight: '600',
  },
});
