import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EVENT_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  formatDateTime,
  formatForestArea,
  type DraftPhoto,
  type ForestArea,
  type PatrolEventWithPhotos,
} from '../../domain';
import { colors } from '../theme';
import { DangerButton, LocalSaveRow, PrimaryButton, TopAppBar } from '../ui';
import { PhotoViewer } from './PhotoViewer';

export function EventDetailScreen({
  event,
  area,
  editable,
  draftActive,
  onBack,
  onEdit,
  onDelete,
}: {
  event: PatrolEventWithPhotos;
  area?: ForestArea;
  editable: boolean;
  draftActive: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (event: PatrolEventWithPhotos) => Promise<void>;
}) {
  const [error, setError] = useState<string>();
  const [viewingPhoto, setViewingPhoto] = useState<number>();
  const type = EVENT_TYPE_OPTIONS.find(item => item.value === event.type);
  const severity = SEVERITY_OPTIONS.find(item => item.value === event.severity);

  const confirmDelete = () => {
    Alert.alert(
      'Xóa ghi nhận?',
      'Ghi nhận và các ảnh liên quan sẽ bị xóa khỏi thiết bị.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            onDelete(event).catch(deleteError =>
              setError(
                deleteError instanceof Error
                  ? deleteError.message
                  : 'Không thể xóa ghi nhận.',
              ),
            ),
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <TopAppBar onBack={onBack} title="Chi tiết ghi nhận" />
      <View style={styles.commandSummary}>
        <View style={styles.headingRow}>
          <Text style={styles.commandTitle}>{type?.label ?? event.type}</Text>
          <View style={styles.dangerBadge}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.danger}
              name="warning"
              size={15}
            />
            <Text style={styles.dangerText}>
              {(severity?.label ?? 'Không áp dụng').toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.commandMeta}>
          {formatDateTime(event.occurredAt)}
        </Text>
        <Text style={styles.commandMeta}>
          {area ? formatForestArea(area) : 'Khu vực chưa xác định'}
        </Text>
      </View>
      <GpsInfoRow event={event} />
      <FeaturedPhotoSection onView={setViewingPhoto} photos={event.photos} />
      <View style={styles.notes}>
        <Text style={styles.label}>Ghi chú</Text>
        <Text style={styles.body}>{event.note || 'Không có ghi chú'}</Text>
      </View>
      <LocalSaveRow label={`Đã lưu tại ${formatDateTime(event.updatedAt)}`} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {draftActive ? (
        <Text style={styles.warning}>
          Hãy hoàn tất bản nháp đang ghi trước khi sửa hoặc xóa sự kiện này.
        </Text>
      ) : null}
      {editable ? (
        <View style={styles.actions}>
          <PrimaryButton
            icon="edit"
            label="Chỉnh sửa ghi nhận"
            onPress={onEdit}
          />
          <DangerButton
            icon="delete-outline"
            label="Xóa ghi nhận"
            onPress={confirmDelete}
          />
        </View>
      ) : null}
      <PhotoViewer
        initialIndex={viewingPhoto}
        onClose={() => setViewingPhoto(undefined)}
        photos={event.photos}
      />
    </ScrollView>
  );
}

function GpsInfoRow({ event }: { event: PatrolEventWithPhotos }) {
  const hasGps = event.latitude !== undefined && event.longitude !== undefined;
  return (
    <View style={styles.gpsRow}>
      <MaterialIcons
        accessibilityElementsHidden
        color={colors.primary}
        name={hasGps ? 'navigation' : 'location-off'}
        size={20}
      />
      <View style={styles.grow}>
        <Text style={styles.gpsTitle}>
          {hasGps ? 'Có tọa độ GPS' : 'Không có tọa độ GPS'}
        </Text>
        {hasGps ? (
          <Text style={styles.gpsDetail}>
            {event.latitude!.toFixed(6)}, {event.longitude!.toFixed(6)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function FeaturedPhotoSection({
  onView,
  photos,
}: {
  onView: (index: number) => void;
  photos: DraftPhoto[];
}) {
  if (photos.length === 0) {
    return (
      <View style={styles.photoSection}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Ảnh hiện trường</Text>
          <Text style={styles.sectionCount}>0 ảnh</Text>
        </View>
        <Text style={styles.meta}>Ghi nhận này không có ảnh.</Text>
      </View>
    );
  }
  return (
    <View style={styles.photoSection}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Ảnh hiện trường</Text>
        <Text style={styles.sectionCount}>{photos.length} ảnh</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onView(0)}
        style={styles.featuredPhoto}
      >
        <Image source={{ uri: photos[0].localUri }} style={styles.photoImage} />
        <View style={styles.photoControl}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.surface}
            name="fullscreen"
            size={20}
          />
          <Text style={styles.photoControlText}>Xem ảnh toàn màn hình</Text>
        </View>
      </Pressable>
      <View style={styles.thumbnails}>
        {photos.slice(0, 3).map((photo, index) => (
          <Pressable
            accessibilityRole="button"
            key={photo.id}
            onPress={() => onView(index)}
            style={[
              styles.thumbnailButton,
              index === 0 && styles.thumbnailSelected,
            ]}
          >
            <Image source={{ uri: photo.localUri }} style={styles.thumbnail} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    gap: 17,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  commandSummary: {
    minHeight: 122,
    gap: 8,
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
  commandTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 25,
    fontWeight: '700',
    color: colors.surface,
  },
  commandMeta: { fontSize: 14, lineHeight: 19, color: colors.textOnDarkMuted },
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
  gpsRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  grow: { flex: 1 },
  gpsTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  gpsDetail: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  photoSection: { gap: 10 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  featuredPhoto: {
    height: 170,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 10,
  },
  photoImage: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  photoControl: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#0B2418CC',
  },
  photoControlText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
  },
  thumbnails: { height: 72, flexDirection: 'row', gap: 8 },
  thumbnailButton: {
    height: 72,
    flex: 1,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  thumbnailSelected: { borderWidth: 2, borderColor: colors.primary },
  thumbnail: { width: '100%', height: '100%', borderRadius: 4 },
  notes: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  meta: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  actions: { gap: 10 },
  warning: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
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
