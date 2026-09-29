import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EVENT_TYPE_OPTIONS,
  FIRE_SIGN_OPTIONS,
  OBSERVATION_SOURCE_OPTIONS,
  SEVERITY_OPTIONS,
  WEATHER_OPTIONS,
  formatDateTime,
  formatForestArea,
  type ForestArea,
  type ObservationWithPhotos,
  type PatrolEventWithPhotos,
  type PatrolSummary,
} from '../../domain';
import type { GeneratedReport } from '../../device/report';
import { colors } from '../theme';
import { LocalSaveRow, OutlineButton, PrimaryButton, TopAppBar } from '../ui';

interface ReportScreenProps {
  patrol: PatrolSummary;
  area: ForestArea;
  events: PatrolEventWithPhotos[];
  observations: ObservationWithPhotos[];
  status: 'idle' | 'generating' | 'ready' | 'storageError' | 'error';
  error?: string;
  generatedReport?: GeneratedReport;
  onBack: () => void;
  onRetry: () => Promise<void>;
  onShare: () => Promise<void>;
}

export function ReportScreen({
  patrol,
  area,
  events,
  observations,
  status,
  error,
  generatedReport,
  onBack,
  onRetry,
  onShare,
}: ReportScreenProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const photoCount = [...events, ...observations].reduce(
    (count, entry) => count + entry.photos.length,
    0,
  );
  const estimatedStorageMb = Math.max(2, photoCount * 3 + 2);
  const fileName =
    generatedReport?.filePath.split('/').pop() ?? 'ForestLog.pdf';

  const runAction = async (action: () => Promise<void>) => {
    setActionError(undefined);
    try {
      await action();
    } catch (actionFailure) {
      setActionError(
        actionFailure instanceof Error
          ? actionFailure.message
          : 'Không thể mở tác vụ trên thiết bị.',
      );
    }
  };

  if (status === 'ready' && showPreview) {
    return (
      <ScrollView contentContainerStyle={styles.previewScreen}>
        <TopAppBar onBack={() => setShowPreview(false)} title="Xem báo cáo" />
        <View style={styles.documentStatus}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="description"
            size={19}
          />
          <Text style={styles.documentName}>
            {generatedReport?.pageCount ?? 0} trang · {events.length} sự kiện ·{' '}
            {observations.length} quan trắc · {photoCount} ảnh
          </Text>
          <Text style={styles.documentCount}>
            1 / {generatedReport?.pageCount ?? 0}
          </Text>
        </View>
        <ReportPreviewDocument
          area={area}
          events={events}
          observations={observations}
          patrol={patrol}
        />
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        <PrimaryButton
          icon="share"
          label="Chia sẻ báo cáo"
          onPress={() => runAction(onShare)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <TopAppBar
        onBack={onBack}
        title={status === 'ready' ? 'Báo cáo tuần tra' : 'Tạo báo cáo'}
      />
      {status === 'generating' || status === 'idle' ? (
        <ReportGenerating photoCount={photoCount} />
      ) : status === 'storageError' ? (
        <>
          <ReportStateMark icon="warning" tone="warning" />
          <View style={styles.heading}>
            <Text style={styles.title}>Không đủ dung lượng</Text>
            <Text style={styles.subtitle}>
              Chưa thể tạo tệp PDF gồm {photoCount} ảnh hiện trường.
            </Text>
          </View>
          <View style={styles.storageRecovery}>
            <View style={styles.recoveryHeading}>
              <MaterialIcons
                accessibilityElementsHidden
                color={colors.warning}
                name="storage"
                size={22}
              />
              <Text style={styles.bodyStrong}>Cách khắc phục</Text>
            </View>
            <Text style={styles.body}>
              Giải phóng dung lượng trên thiết bị, sau đó thử tạo báo cáo lại
              (cần khoảng {estimatedStorageMb} MB).
            </Text>
          </View>
          <LocalSaveRow label="Dữ liệu tuần tra và ảnh vẫn an toàn" />
          <PrimaryButton
            icon="refresh"
            label="Thử tạo lại"
            onPress={() => runAction(onRetry)}
          />
          <OutlineButton
            icon="arrow-back"
            label="Quay lại chi tiết"
            onPress={onBack}
          />
        </>
      ) : status === 'error' ? (
        <>
          <ReportStateMark icon="error-outline" tone="warning" />
          <Text style={styles.title}>Chưa thể tạo báo cáo</Text>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton
            icon="refresh"
            label="Thử lại"
            onPress={() => runAction(onRetry)}
          />
        </>
      ) : (
        <>
          <ReportStateMark icon="check-circle" tone="success" />
          <View accessibilityLiveRegion="polite" style={styles.heading}>
            <Text style={styles.title}>Báo cáo đã được tạo</Text>
            <Text style={styles.subtitle}>
              Tệp PDF đã lưu trên thiết bị và sẵn sàng chia sẻ.
            </Text>
          </View>
          <ReportFileCard
            area={area}
            fileName={fileName}
            pageCount={generatedReport?.pageCount ?? 0}
            patrol={patrol}
          />
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
          <PrimaryButton
            icon="visibility"
            label="Xem báo cáo"
            onPress={() => setShowPreview(true)}
          />
          <OutlineButton
            icon="share"
            label="Chia sẻ bằng ứng dụng trên thiết bị"
            onPress={() => runAction(onShare)}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={styles.closeAction}
          >
            <Text style={styles.closeText}>Đóng</Text>
          </Pressable>
          <View style={styles.offlineNote}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.textSecondary}
              name="cloud-off"
              size={17}
            />
            <Text style={styles.meta}>Báo cáo được tạo hoàn toàn offline</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function ReportGenerating({ photoCount }: { photoCount: number }) {
  return (
    <>
      <ReportStateMark icon="picture-as-pdf" tone="neutral" />
      <View style={styles.heading}>
        <Text accessibilityLiveRegion="polite" style={styles.title}>
          Đang tạo báo cáo
        </Text>
        <Text style={styles.subtitle}>
          Đang sắp xếp dữ liệu và ảnh vào tệp PDF. Báo cáo nhiều ảnh có thể mất
          thêm thời gian.
        </Text>
      </View>
      <View style={styles.progressCard}>
        <ProgressRow
          icon="check-circle"
          label="Dữ liệu tuần tra"
          status="Đã chuẩn bị"
          tone="success"
        />
        <ProgressRow
          icon="check-circle"
          label="Ảnh đính kèm"
          status={`${photoCount} / ${photoCount}`}
          tone="success"
        />
        <ProgressRow
          icon="schedule"
          label="Tệp PDF"
          status="Đang tạo"
          tone="warning"
        />
      </View>
      <LocalSaveRow label="Dữ liệu và ảnh vẫn được giữ trên thiết bị" />
      <PrimaryButton
        disabled
        icon="autorenew"
        label="Đang tạo báo cáo…"
        onPress={() => undefined}
      />
    </>
  );
}

function ProgressRow({
  icon,
  label,
  status,
  tone,
}: {
  icon: MaterialIconsIconName;
  label: string;
  status: string;
  tone: 'success' | 'warning';
}) {
  const color = tone === 'success' ? colors.primary : colors.warning;
  return (
    <View style={styles.progressRow}>
      <View
        style={[
          styles.progressMarker,
          tone === 'warning' && styles.progressWarning,
        ]}
      >
        <MaterialIcons
          accessibilityElementsHidden
          color={color}
          name={icon}
          size={18}
        />
      </View>
      <Text style={styles.progressLabel}>{label}</Text>
      <Text style={[styles.progressStatus, { color }]}>{status}</Text>
    </View>
  );
}

function ReportStateMark({
  icon,
  tone,
}: {
  icon: MaterialIconsIconName;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const color = tone === 'warning' ? colors.warning : colors.primary;
  return (
    <View
      style={[
        styles.stateMark,
        tone === 'warning'
          ? styles.markWarning
          : tone === 'success'
          ? styles.markSuccess
          : styles.markNeutral,
      ]}
    >
      <MaterialIcons
        accessibilityElementsHidden
        color={color}
        name={icon}
        size={38}
      />
    </View>
  );
}

function ReportFileCard({
  area,
  fileName,
  pageCount,
  patrol,
}: {
  area: ForestArea;
  fileName: string;
  pageCount: number;
  patrol: PatrolSummary;
}) {
  return (
    <View style={styles.fileCard}>
      <View style={styles.fileHeader}>
        <View style={styles.pdfIconBox}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.danger}
            name="picture-as-pdf"
            size={27}
          />
        </View>
        <View style={styles.grow}>
          <Text style={styles.fileName}>{fileName}</Text>
          <Text style={styles.meta}>PDF · {pageCount} trang</Text>
        </View>
      </View>
      <View style={styles.fileMeta}>
        <Text style={styles.fileRanger}>{patrol.rangerName}</Text>
        <Text style={styles.fileArea}>
          TK{area.subZone} · K{area.compartment} · L{area.plot}
        </Text>
      </View>
    </View>
  );
}

function ReportPreviewDocument({
  area,
  events,
  observations,
  patrol,
}: {
  area: ForestArea;
  events: PatrolEventWithPhotos[];
  observations: ObservationWithPhotos[];
  patrol: PatrolSummary;
}) {
  const weather =
    WEATHER_OPTIONS.find(item => item.value === patrol.weather)?.label ??
    'Chưa ghi nhận';
  return (
    <View style={styles.document}>
      <View style={styles.documentHeading}>
        <Text style={styles.documentTitle}>BÁO CÁO TUẦN TRA RỪNG</Text>
        <Text style={styles.documentId}>{patrol.id}</Text>
      </View>
      <Text style={styles.documentSectionTitle}>
        I. THÔNG TIN CHUYẾN TUẦN TRA
      </Text>
      <View>
        {[
          ['Người đi tuần', patrol.rangerName],
          [
            'Thời gian',
            `${formatDateTime(patrol.startedAt)} – ${
              patrol.completedAt ? formatDateTime(patrol.completedAt) : '—'
            }`,
          ],
          ['Khu vực', formatForestArea(area)],
          ['Thời tiết', weather],
          ['Quãng đường', `${patrol.estimatedDistanceKm ?? 0} km`],
          ['Số sự kiện', String(events.length)],
          ['Số phiếu quan trắc', String(observations.length)],
        ].map(([label, value]) => (
          <View key={label} style={styles.documentRow}>
            <Text style={styles.documentLabel}>{label}</Text>
            <Text style={styles.documentValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.documentSectionTitle}>II. DANH SÁCH GHI NHẬN</Text>
      {events.length === 0 ? (
        <Text style={styles.documentBody}>Không có sự kiện.</Text>
      ) : (
        events.map((event, index) => (
          <View key={event.id} style={styles.documentEvent}>
            <View style={styles.documentEventHeader}>
              <View style={styles.eventNumber}>
                <Text style={styles.eventNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.documentEventTitle}>
                {EVENT_TYPE_OPTIONS.find(option => option.value === event.type)
                  ?.label ?? event.type}
                {event.severity
                  ? ` · Mức độ ${
                      SEVERITY_OPTIONS.find(
                        option => option.value === event.severity,
                      )?.label ?? event.severity
                    }`
                  : ''}
              </Text>
              <Text style={styles.documentEventTime}>
                {new Date(event.occurredAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Text style={styles.documentBody}>
              {event.note || 'Không có ghi chú'}
            </Text>
            {event.photos.length > 0 ? (
              <View style={styles.documentPhotos}>
                {event.photos.slice(0, 3).map(photo => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.localUri }}
                    style={styles.documentPhoto}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
      <Text style={styles.documentSectionTitle}>III. KẾT QUẢ QUAN TRẮC</Text>
      {observations.length === 0 ? (
        <Text style={styles.documentBody}>Không có phiếu quan trắc.</Text>
      ) : (
        observations.map((observation, index) => (
          <View key={observation.id} style={styles.documentObservation}>
            <View style={styles.documentObservationHeader}>
              <View style={styles.observationNumber}>
                <Text style={styles.eventNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.documentEventTitle}>Quan trắc thời tiết</Text>
              <Text style={styles.documentEventTime}>
                {new Date(observation.observedAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Text style={styles.documentBody}>
              {
                OBSERVATION_SOURCE_OPTIONS.find(
                  option => option.value === observation.source,
                )?.label
              }{' '}
              · Nhiệt độ {observation.airTemperatureC ?? '—'}°C · Độ ẩm{' '}
              {observation.relativeHumidityPct ?? '—'}% · Mưa{' '}
              {observation.rainfallMm ?? '—'} mm
            </Text>
            <Text style={styles.documentBody}>
              Dấu hiệu cháy:{' '}
              {
                FIRE_SIGN_OPTIONS.find(
                  option => option.value === observation.fireSign,
                )?.label
              }
            </Text>
            {observation.photos.length > 0 ? (
              <View style={styles.documentPhotos}>
                {observation.photos.slice(0, 3).map(photo => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.localUri }}
                    style={styles.documentPhoto}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
      <Text style={styles.documentFooter}>
        ForestLog · Báo cáo được tạo offline trên thiết bị
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'stretch',
    gap: 20,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  previewScreen: {
    flexGrow: 1,
    gap: 14,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.surfaceSubtle,
  },
  heading: { alignItems: 'center', gap: 7 },
  title: {
    textAlign: 'center',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  stateMark: {
    width: 76,
    height: 76,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
  },
  markSuccess: { backgroundColor: colors.successSurface },
  markWarning: { backgroundColor: colors.warningSurface },
  markNeutral: { backgroundColor: colors.surfaceSubtle },
  progressCard: {
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  progressRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressMarker: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.successSurface,
  },
  progressWarning: { backgroundColor: colors.warningSurface },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  progressStatus: { fontSize: 12, fontWeight: '800' },
  storageRecovery: {
    gap: 10,
    padding: 16,
    borderRadius: 10,
    backgroundColor: colors.warningSurface,
  },
  recoveryHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bodyStrong: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
  },
  body: { fontSize: 14, lineHeight: 21, color: colors.text },
  fileCard: {
    height: 166,
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  fileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pdfIconBox: {
    width: 46,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.dangerSurface,
  },
  grow: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  fileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fileRanger: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  fileArea: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  closeAction: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  offlineNote: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warningSurface,
    color: colors.danger,
    fontWeight: '600',
  },
  documentStatus: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  documentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  documentCount: { fontSize: 12, fontWeight: '800', color: colors.primary },
  document: {
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  documentHeading: { alignItems: 'center', gap: 5 },
  documentTitle: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  documentId: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  documentSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  documentRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  documentLabel: { width: 116, fontSize: 11, color: colors.textSecondary },
  documentValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  documentEvent: { gap: 10 },
  documentObservation: { gap: 10 },
  documentEventHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.dangerSurface,
  },
  documentObservationHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.successSurface,
  },
  eventNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.danger,
  },
  observationNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  eventNumberText: { fontSize: 11, fontWeight: '800', color: colors.surface },
  documentEventTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  documentEventTime: { fontSize: 11, fontWeight: '700', color: colors.text },
  documentBody: { fontSize: 11, lineHeight: 16, color: colors.text },
  documentPhotos: { height: 92, flexDirection: 'row', gap: 8 },
  documentPhoto: { height: 92, flex: 1, borderRadius: 4 },
  documentFooter: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
