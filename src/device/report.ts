import { NativeModules, Platform } from 'react-native';
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
} from '../domain';

interface NativeReportModule {
  generateReport(payload: string): Promise<GeneratedReport>;
  openReport(path: string): Promise<void>;
  shareReport(path: string): Promise<void>;
}

export interface GeneratedReport {
  filePath: string;
  fileUri: string;
  pageCount: number;
}

export class ReportGenerationError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

function getModule(): NativeReportModule {
  if (Platform.OS !== 'android' || !NativeModules.ForestLogReport) {
    throw new ReportGenerationError(
      'Tạo PDF hiện chỉ được hỗ trợ trên Android.',
      'UNSUPPORTED_PLATFORM',
    );
  }
  return NativeModules.ForestLogReport as NativeReportModule;
}

export async function generateReport(
  patrol: PatrolSummary,
  area: ForestArea,
  events: PatrolEventWithPhotos[],
  observations: ObservationWithPhotos[],
): Promise<GeneratedReport> {
  const payload = buildReportPayload(patrol, area, events, observations);

  try {
    return await getModule().generateReport(JSON.stringify(payload));
  } catch (error) {
    const nativeError = error as { code?: string; message?: string };
    throw new ReportGenerationError(
      nativeError.message || 'Không thể tạo báo cáo PDF.',
      nativeError.code || 'REPORT_ERROR',
    );
  }
}

export function buildReportPayload(
  patrol: PatrolSummary,
  area: ForestArea,
  events: PatrolEventWithPhotos[],
  observations: ObservationWithPhotos[],
) {
  const weather = WEATHER_OPTIONS.find(item => item.value === patrol.weather);
  return {
    id: patrol.id,
    fileName: `ForestLog_${patrol.startedAt.slice(0, 10)}_TK${area.subZone}_K${
      area.compartment
    }_L${area.plot}.pdf`.replace(/[^A-Za-z0-9._-]/g, '_'),
    rangerName: patrol.rangerName,
    area: formatForestArea(area),
    startedAt: formatDateTime(patrol.startedAt),
    completedAt: patrol.completedAt
      ? formatDateTime(patrol.completedAt)
      : 'Chưa hoàn thành',
    weather: weather?.label ?? 'Chưa ghi nhận',
    distance: `${patrol.estimatedDistanceKm ?? 0} km`,
    emergency: patrol.emergencyReportRequired ? 'Có' : 'Không',
    events: events.map(event => ({
      type:
        EVENT_TYPE_OPTIONS.find(item => item.value === event.type)?.label ??
        event.type,
      severity:
        SEVERITY_OPTIONS.find(item => item.value === event.severity)?.label ??
        'Không áp dụng',
      occurredAt: formatDateTime(event.occurredAt),
      gps:
        event.latitude === undefined || event.longitude === undefined
          ? 'Không có tọa độ'
          : `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}${
              event.gpsAccuracy === undefined
                ? ''
                : ` · ±${Math.round(event.gpsAccuracy)} m`
            }`,
      note: event.note || 'Không có ghi chú',
      photos: event.photos.map(photo => ({ path: photo.localUri })),
    })),
    observations: observations.map(observation => ({
      source:
        OBSERVATION_SOURCE_OPTIONS.find(
          item => item.value === observation.source,
        )?.label ?? observation.source,
      observedAt: formatDateTime(observation.observedAt),
      gps:
        observation.latitude === undefined ||
        observation.longitude === undefined
          ? 'Không có tọa độ'
          : `${observation.latitude.toFixed(
              6,
            )}, ${observation.longitude.toFixed(6)}${
              observation.gpsAccuracy === undefined
                ? ''
                : ` · ±${Math.round(observation.gpsAccuracy)} m`
            }`,
      airTemperature:
        observation.airTemperatureC === undefined
          ? '—'
          : `${observation.airTemperatureC} °C`,
      relativeHumidity:
        observation.relativeHumidityPct === undefined
          ? '—'
          : `${observation.relativeHumidityPct}%`,
      weather:
        WEATHER_OPTIONS.find(item => item.value === observation.weather)
          ?.label ?? '—',
      rainfall:
        observation.rainfallMm === undefined
          ? '—'
          : `${observation.rainfallMm} mm`,
      rainfallInterval:
        observation.rainfallStartedAt && observation.rainfallEndedAt
          ? `${formatDateTime(
              observation.rainfallStartedAt,
            )} – ${formatDateTime(observation.rainfallEndedAt)}`
          : '—',
      stationCode: observation.stationCode || '—',
      fireSign:
        FIRE_SIGN_OPTIONS.find(item => item.value === observation.fireSign)
          ?.label ?? observation.fireSign,
      deviceMethod: observation.deviceMethod || 'Chưa ghi nhận',
      calibrationCheckedAt: observation.calibrationCheckedAt || 'Chưa ghi nhận',
      note: observation.note || 'Không có ghi chú',
      photos: observation.photos.map(photo => ({ path: photo.localUri })),
    })),
  };
}

export async function shareReport(path: string): Promise<void> {
  return getModule().shareReport(path);
}

export async function openReport(path: string): Promise<void> {
  return getModule().openReport(path);
}
