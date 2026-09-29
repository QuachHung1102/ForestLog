import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
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
  EVENT_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  validateEventInput,
  type DraftPhoto,
  type EventDraft,
  type SaveEventInput,
} from '../../domain';
import { LocationPermissionError } from '../../device/location';
import { MediaPermissionError } from '../../device/media';
import { colors } from '../theme';
import { PrimaryButton, TextButton, TopAppBar } from '../ui';
import { PhotoViewer } from './PhotoViewer';

const eventTypeIcons: Record<
  NonNullable<EventDraft['type']>,
  MaterialIconsIconName
> = {
  illegal_logging: 'forest',
  illegal_hunting: 'gps-fixed',
  fire_risk: 'local-fire-department',
  land_encroachment: 'agriculture',
  waste: 'delete-outline',
  no_violation: 'verified-user',
};

interface EventFormScreenProps {
  draft: EventDraft;
  draftSaveError: boolean;
  onBack: () => void;
  onAcquireGps: () => Promise<void>;
  onAddPhotos: (source: 'camera' | 'library') => Promise<void>;
  onChange: (draft: EventDraft) => void;
  onRemovePhoto: (photoId: string) => Promise<void>;
  onSubmit: (input: SaveEventInput) => Promise<void>;
}

export function EventFormScreen({
  draft,
  draftSaveError,
  onBack,
  onAcquireGps,
  onAddPhotos,
  onChange,
  onRemovePhoto,
  onSubmit,
}: EventFormScreenProps) {
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
      setDeviceError('Không thể lấy tọa độ. Bạn vẫn có thể lưu ghi nhận.');
    });
    return () => {
      mounted = false;
    };
  }, [draft.patrolId]);

  const update = (change: Partial<EventDraft>) => {
    if (!saving)
      onChange({ ...draft, ...change, updatedAt: new Date().toISOString() });
  };

  const acquireGps = async () => {
    if (saving) return;
    setDeviceBusy(true);
    setDeviceError(undefined);
    setPermissionError(false);
    setPermissionSource(undefined);
    try {
      await onAcquireGps();
    } catch (locationError) {
      setPermissionError(locationError instanceof LocationPermissionError);
      setPermissionSource('gps');
      setDeviceError('Không thể lấy tọa độ. Bạn vẫn có thể lưu ghi nhận.');
    } finally {
      setDeviceBusy(false);
    }
  };

  const addPhotos = async (source: 'camera' | 'library') => {
    if (saving) return;
    setDeviceBusy(true);
    setDeviceError(undefined);
    setPermissionError(false);
    setPermissionSource(undefined);
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

  const removePhoto = async (photoId: string) => {
    if (saving) return;
    setDeviceError(undefined);
    try {
      await onRemovePhoto(photoId);
    } catch {
      setDeviceError('Không thể xóa ảnh khỏi bản nháp. Vui lòng thử lại.');
    }
  };

  const submit = async () => {
    const input: SaveEventInput = {
      type: draft.type,
      severity: draft.severity,
      note: draft.note,
      latitude: draft.latitude,
      longitude: draft.longitude,
      gpsAccuracy: draft.gpsAccuracy,
      photos: draft.photos,
    };
    const validationError = validateEventInput(input);
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
          : 'Không thể lưu ghi nhận. Nội dung vẫn còn trên máy.',
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
        <TopAppBar
          onBack={onBack}
          title={
            draft.editingEventId ? 'Chỉnh sửa ghi nhận' : 'Ghi nhận sự kiện'
          }
        />
        <GpsStatusRow
          busy={deviceBusy}
          disabled={saving}
          draft={draft}
          onRetry={acquireGps}
        />
        <EventTypeGrid
          disabled={saving}
          onSelect={value =>
            update({
              type: value,
              severity: value === 'no_violation' ? undefined : draft.severity,
            })
          }
          selected={draft.type}
        />
        {draft.type === 'no_violation' ? null : (
          <SeveritySelector
            disabled={saving}
            onSelect={value => update({ severity: value })}
            selected={draft.severity}
          />
        )}
        <FieldPhotoSection
          disabled={deviceBusy || saving}
          onAdd={addPhotos}
          onRemove={removePhoto}
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
                  label={permissionSource === 'gps' ? 'Thử lại GPS' : 'Thử lại'}
                  onPress={() =>
                    permissionSource === 'gps'
                      ? acquireGps()
                      : addPhotos(permissionSource ?? 'camera')
                  }
                />
                <TextButton
                  icon="arrow-forward"
                  label={
                    permissionSource === 'gps'
                      ? 'Tiếp tục không có GPS'
                      : 'Tiếp tục không chụp ảnh'
                  }
                  onPress={() => {
                    setDeviceError(undefined);
                    setPermissionError(false);
                    setPermissionSource(undefined);
                  }}
                />
              </>
            ) : null}
          </View>
        ) : null}
        <View style={styles.section}>
          <Text style={styles.label}>Ghi chú</Text>
          <TextInput
            accessibilityLabel="Ghi chú sự kiện"
            editable={!saving}
            maxLength={2000}
            multiline
            onChangeText={note => update({ note })}
            placeholder="Mô tả ngắn tình trạng tại hiện trường..."
            placeholderTextColor={colors.textSecondary}
            style={styles.notesInput}
            textAlignVertical="top"
            value={draft.note}
          />
        </View>
        {draftSaveError ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            Chưa thể tự lưu bản nháp. Nội dung vẫn được giữ trên màn hình.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={saving}
          icon="save"
          label={saving ? 'Đang lưu trên thiết bị…' : 'Lưu ghi nhận'}
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

export function GpsStatusRow({
  busy,
  disabled,
  draft,
  onRetry,
}: {
  busy: boolean;
  disabled: boolean;
  draft: Pick<
    EventDraft,
    'gpsStatus' | 'latitude' | 'longitude' | 'gpsAccuracy'
  >;
  onRetry: () => void;
}) {
  const unavailable = draft.gpsStatus === 'unavailable';
  const acquired = draft.gpsStatus === 'acquired';
  const detail =
    acquired && draft.latitude !== undefined && draft.longitude !== undefined
      ? `${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}${
          draft.gpsAccuracy === undefined
            ? ''
            : ` · ±${Math.round(draft.gpsAccuracy)} m`
        }`
      : 'GPS không bắt buộc để lưu ghi nhận';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.gpsRow, unavailable && styles.gpsWarning]}
    >
      <View style={styles.gpsMarker}>
        <MaterialIcons
          accessibilityElementsHidden
          color={unavailable ? colors.warning : colors.primary}
          name={
            acquired
              ? 'navigation'
              : draft.gpsStatus === 'acquiring'
              ? 'my-location'
              : 'location-off'
          }
          size={20}
        />
      </View>
      <View style={styles.grow}>
        <Text style={styles.gpsTitle}>
          {acquired
            ? 'Đã lấy tọa độ GPS'
            : draft.gpsStatus === 'acquiring'
            ? 'Đang lấy tọa độ…'
            : 'Không lấy được vị trí GPS'}
        </Text>
        <Text style={styles.gpsDetail}>{detail}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onRetry}
        style={styles.retryTarget}
      >
        <Text style={[styles.retryText, unavailable && styles.retryWarning]}>
          {busy ? 'Đang lấy…' : 'Lấy lại'}
        </Text>
      </Pressable>
    </View>
  );
}

function EventTypeGrid({
  disabled,
  onSelect,
  selected,
}: {
  disabled: boolean;
  onSelect: (value: NonNullable<EventDraft['type']>) => void;
  selected?: EventDraft['type'];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Loại sự kiện *</Text>
        <Text style={styles.meta}>Chọn 1</Text>
      </View>
      <View style={styles.typeGrid}>
        {EVENT_TYPE_OPTIONS.map(option => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.typeTile,
                isSelected && styles.selected,
                disabled && styles.disabled,
              ]}
            >
              <MaterialIcons
                accessibilityElementsHidden
                color={isSelected ? colors.primary : colors.textSecondary}
                name={eventTypeIcons[option.value]}
                size={22}
              />
              <Text
                style={[styles.typeText, isSelected && styles.selectedText]}
              >
                {option.label}
              </Text>
              {isSelected ? (
                <MaterialIcons
                  accessibilityElementsHidden
                  color={colors.primary}
                  name="check-circle"
                  size={18}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SeveritySelector({
  disabled,
  onSelect,
  selected,
}: {
  disabled: boolean;
  onSelect: (value: NonNullable<EventDraft['severity']>) => void;
  selected?: EventDraft['severity'];
}) {
  const icons: Record<
    NonNullable<EventDraft['severity']>,
    MaterialIconsIconName
  > = { low: 'south', medium: 'remove', high: 'priority-high' };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mức độ *</Text>
      <View style={styles.severityRow}>
        {SEVERITY_OPTIONS.map(option => {
          const isSelected = selected === option.value;
          const isDanger = isSelected && option.value === 'high';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.severityChoice,
                isSelected && styles.selected,
                isDanger && styles.dangerSelected,
                disabled && styles.disabled,
              ]}
            >
              <MaterialIcons
                accessibilityElementsHidden
                color={
                  isDanger
                    ? colors.danger
                    : isSelected
                    ? colors.primary
                    : colors.textSecondary
                }
                name={icons[option.value]}
                size={17}
              />
              <Text
                style={[
                  styles.severityText,
                  isSelected && styles.selectedText,
                  isDanger && styles.dangerSelectedText,
                ]}
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

export function FieldPhotoSection({
  disabled,
  onAdd,
  onRemove,
  onView,
  photos,
}: {
  disabled: boolean;
  onAdd: (source: 'camera' | 'library') => Promise<void>;
  onRemove: (photoId: string) => Promise<void>;
  onView: (index: number) => void;
  photos: DraftPhoto[];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Ảnh hiện trường</Text>
        <Text style={styles.sectionCount}>{photos.length} ảnh</Text>
      </View>
      {photos.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.photoStrip}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {photos.map((photo, index) => (
            <View key={photo.id} style={styles.photoPreview}>
              <Image
                accessibilityLabel={`Ảnh hiện trường ${index + 1}`}
                source={{ uri: photo.localUri }}
                style={styles.photoImage}
              />
              <View style={styles.photoOverlay}>
                <Pressable
                  accessibilityLabel={`Xem ảnh ${index + 1}`}
                  accessibilityRole="button"
                  hitSlop={5}
                  onPress={() => onView(index)}
                  style={styles.viewTarget}
                >
                  <MaterialIcons
                    accessibilityElementsHidden
                    color={colors.surface}
                    name="visibility"
                    size={17}
                  />
                  <Text style={styles.overlayText}>Ảnh {index + 1}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Xóa ảnh ${index + 1}`}
                  accessibilityRole="button"
                  disabled={disabled}
                  hitSlop={8}
                  onPress={() => onRemove(photo.id)}
                  style={styles.removeTarget}
                >
                  <MaterialIcons
                    accessibilityElementsHidden
                    color={colors.danger}
                    name="delete-outline"
                    size={17}
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.emptyPhotoActions}>
        <PhotoAction
          disabled={disabled}
          icon="camera-alt"
          label={photos.length > 0 ? 'Chụp thêm' : 'Chụp ảnh'}
          onPress={() => onAdd('camera')}
          primary
        />
        <PhotoAction
          disabled={disabled}
          icon="photo-library"
          label={photos.length > 0 ? 'Chọn nhiều ảnh' : 'Chọn ảnh'}
          onPress={() => onAdd('library')}
        />
      </View>
    </View>
  );
}

function PhotoAction({
  disabled,
  icon,
  label,
  onPress,
  primary = false,
}: {
  disabled: boolean;
  icon: MaterialIconsIconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.photoAction,
        primary && styles.primaryPhotoAction,
        disabled && styles.disabled,
      ]}
    >
      <MaterialIcons
        accessibilityElementsHidden
        color={primary ? colors.primary : colors.textSecondary}
        name={icon}
        size={21}
      />
      <Text style={[styles.photoActionText, primary && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
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
  grow: { flex: 1 },
  section: { gap: 10 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  gpsRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  gpsWarning: {
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningSurface,
  },
  gpsMarker: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.surface,
  },
  gpsTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  gpsDetail: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  retryTarget: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  retryText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  retryWarning: { color: colors.warning },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeTile: {
    width: '48.8%',
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  typeText: { flex: 1, flexShrink: 1, fontSize: 14, color: colors.text },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChoice: {
    minHeight: 54,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  severityText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    color: colors.text,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.successSurface,
  },
  selectedText: { fontWeight: '800', color: colors.primary },
  dangerSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  dangerSelectedText: { color: colors.danger },
  disabled: { opacity: 0.55 },
  photoStrip: { gap: 10 },
  photoPreview: {
    width: 172,
    height: 126,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#0B2418CC',
  },
  viewTarget: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayText: { fontSize: 12, fontWeight: '700', color: colors.surface },
  removeTarget: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFFE6',
  },
  emptyPhotoActions: { flexDirection: 'row', gap: 10 },
  photoAction: {
    minHeight: 56,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  primaryPhotoAction: { borderColor: colors.primary },
  photoActionText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  notesInput: {
    minHeight: 96,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
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
