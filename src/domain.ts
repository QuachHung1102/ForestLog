export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'other';

export type PatrolStatus = 'draft' | 'active' | 'completed';

export type PatrolEventType =
  | 'illegal_logging'
  | 'illegal_hunting'
  | 'fire_risk'
  | 'land_encroachment'
  | 'waste'
  | 'no_violation';

export type SeverityLevel = 'low' | 'medium' | 'high';

export type ObservationSource =
  | 'measured'
  | 'station_reading'
  | 'observed'
  | 'estimated';

export type FireSign = 'none' | 'active' | 'recent' | 'old';

export const OBSERVATION_PROTOCOL = 'quick_weather_v1' as const;

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface ForestArea {
  id: string;
  subZone: string;
  compartment: string;
  plot: string;
  boundary?: GeoCoordinate[];
}

export interface Patrol {
  id: string;
  rangerName: string;
  startedAt: string;
  completedAt?: string;
  forestAreaId: string;
  weather?: WeatherType;
  estimatedDistanceKm?: number;
  emergencyReportRequired?: boolean;
  status: PatrolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatrolSummary extends Patrol {
  eventCount: number;
  observationCount: number;
}

export interface PatrolEvent {
  id: string;
  patrolId: string;
  type: PatrolEventType;
  severity?: SeverityLevel;
  note?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftPhoto {
  id: string;
  localUri: string;
  position: number;
  createdAt: string;
}

export interface EventPhoto extends DraftPhoto {
  eventId: string;
}

export type GpsStatus = 'idle' | 'acquiring' | 'acquired' | 'unavailable';

export interface EventDraft {
  patrolId: string;
  editingEventId?: string;
  type?: PatrolEventType;
  severity?: SeverityLevel;
  note: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  gpsStatus: GpsStatus;
  photos: DraftPhoto[];
  updatedAt: string;
}

export interface PatrolEventWithPhotos extends PatrolEvent {
  photos: EventPhoto[];
}

export interface Observation {
  id: string;
  patrolId: string;
  protocol: typeof OBSERVATION_PROTOCOL;
  source: ObservationSource;
  observedAt: string;
  airTemperatureC?: number;
  relativeHumidityPct?: number;
  weather?: WeatherType;
  rainfallMm?: number;
  rainfallStartedAt?: string;
  rainfallEndedAt?: string;
  stationCode?: string;
  fireSign: FireSign;
  deviceMethod?: string;
  calibrationCheckedAt?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ObservationPhoto extends DraftPhoto {
  observationId: string;
}

export interface ObservationWithPhotos extends Observation {
  photos: ObservationPhoto[];
}

export interface ObservationDraft {
  patrolId: string;
  editingObservationId?: string;
  source?: ObservationSource;
  observedAt: string;
  airTemperature: string;
  relativeHumidity: string;
  weather?: WeatherType;
  rainfall: string;
  rainfallStartedAt: string;
  rainfallEndedAt: string;
  stationCode: string;
  fireSign: FireSign;
  deviceMethod: string;
  calibrationCheckedAt: string;
  note: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  gpsStatus: GpsStatus;
  photos: DraftPhoto[];
  updatedAt: string;
}

export interface SaveEventInput {
  type?: PatrolEventType;
  severity?: SeverityLevel;
  note?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  photos: DraftPhoto[];
}

export interface SaveObservationInput {
  source?: ObservationSource;
  observedAt?: string;
  airTemperatureC?: number;
  relativeHumidityPct?: number;
  weather?: WeatherType;
  rainfallMm?: number;
  rainfallStartedAt?: string;
  rainfallEndedAt?: string;
  stationCode?: string;
  fireSign: FireSign;
  deviceMethod?: string;
  calibrationCheckedAt?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  photos: DraftPhoto[];
}

export interface CreatePatrolInput {
  rangerName: string;
  forestAreaId: string;
  weather?: WeatherType;
}

export interface CreateForestAreaInput {
  subZone: string;
  compartment: string;
  plot: string;
  boundary: GeoCoordinate[];
}

export interface CompletePatrolInput {
  estimatedDistanceKm: number;
  emergencyReportRequired: boolean;
}

export interface CompletePatrolFormDraft {
  patrolId: string;
  distance: string;
  emergency?: boolean;
  confirming: boolean;
}

export interface PatrolFormDraft extends CreatePatrolInput {
  subZone: string;
  compartment: string;
}

export const WEATHER_OPTIONS: ReadonlyArray<{
  value: WeatherType;
  label: string;
}> = [
  { value: 'sunny', label: 'Nắng' },
  { value: 'cloudy', label: 'Nhiều mây' },
  { value: 'rainy', label: 'Mưa' },
  { value: 'foggy', label: 'Sương mù' },
  { value: 'other', label: 'Khác' },
];

export const EVENT_TYPE_OPTIONS: ReadonlyArray<{
  value: PatrolEventType;
  label: string;
}> = [
  { value: 'illegal_logging', label: 'Chặt phá rừng' },
  { value: 'illegal_hunting', label: 'Bẫy / săn bắt trái phép' },
  { value: 'fire_risk', label: 'Cháy / nguy cơ cháy' },
  { value: 'land_encroachment', label: 'Xâm lấn đất' },
  { value: 'waste', label: 'Rác thải' },
  { value: 'no_violation', label: 'Không phát hiện vi phạm' },
];

export const SEVERITY_OPTIONS: ReadonlyArray<{
  value: SeverityLevel;
  label: string;
}> = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
];

export const OBSERVATION_SOURCE_OPTIONS: ReadonlyArray<{
  value: ObservationSource;
  label: string;
}> = [
  { value: 'measured', label: 'Đo trực tiếp' },
  { value: 'station_reading', label: 'Đọc từ trạm' },
  { value: 'observed', label: 'Quan sát' },
  { value: 'estimated', label: 'Ước lượng' },
];

export const FIRE_SIGN_OPTIONS: ReadonlyArray<{
  value: FireSign;
  label: string;
}> = [
  { value: 'none', label: 'Không có' },
  { value: 'active', label: 'Đang cháy' },
  { value: 'recent', label: 'Dấu vết mới' },
  { value: 'old', label: 'Dấu vết cũ' },
];

export const FOREST_AREAS: ReadonlyArray<ForestArea> = [
  { id: 'TK10-K1-L1', subZone: '10', compartment: '1', plot: '1' },
  { id: 'TK10-K1-L2', subZone: '10', compartment: '1', plot: '2' },
  { id: 'TK10-K2-L1', subZone: '10', compartment: '2', plot: '1' },
  { id: 'TK11-K1-L1', subZone: '11', compartment: '1', plot: '1' },
  { id: 'TK11-K1-L2', subZone: '11', compartment: '1', plot: '2' },
  { id: 'TK11-K1-L3', subZone: '11', compartment: '1', plot: '3' },
  { id: 'TK12-K3-L5', subZone: '12', compartment: '3', plot: '5' },
  { id: 'TK12-K3-L6', subZone: '12', compartment: '3', plot: '6' },
  { id: 'TK12-K3-L7', subZone: '12', compartment: '3', plot: '7' },
];

export function parsePatrolFormDraft(
  value: string | undefined,
): PatrolFormDraft | undefined {
  if (!value) return undefined;
  try {
    const draft = JSON.parse(value) as Partial<PatrolFormDraft>;
    if (
      typeof draft.rangerName !== 'string' ||
      typeof draft.subZone !== 'string' ||
      typeof draft.compartment !== 'string' ||
      typeof draft.forestAreaId !== 'string' ||
      (draft.weather !== undefined &&
        !WEATHER_OPTIONS.some(option => option.value === draft.weather))
    ) {
      return undefined;
    }
    return draft as PatrolFormDraft;
  } catch {
    return undefined;
  }
}

export function parseCompletePatrolFormDraft(
  value: string | undefined,
): CompletePatrolFormDraft | undefined {
  if (!value) return undefined;
  try {
    const draft = JSON.parse(value) as Partial<CompletePatrolFormDraft>;
    if (
      typeof draft.patrolId !== 'string' ||
      typeof draft.distance !== 'string' ||
      typeof draft.confirming !== 'boolean' ||
      (draft.emergency !== undefined && typeof draft.emergency !== 'boolean')
    ) {
      return undefined;
    }
    return draft as CompletePatrolFormDraft;
  } catch {
    return undefined;
  }
}

export function validatePatrolInput(input: CreatePatrolInput): string | null {
  if (!input.rangerName.trim()) {
    return 'Vui lòng nhập tên người đi tuần.';
  }
  if (input.rangerName.trim().length > 100) {
    return 'Tên người đi tuần không được dài quá 100 ký tự.';
  }
  if (!input.forestAreaId) {
    return 'Vui lòng chọn đầy đủ Tiểu khu, Khoảnh và Lô.';
  }
  return null;
}

function crossProduct(
  first: GeoCoordinate,
  second: GeoCoordinate,
  third: GeoCoordinate,
): number {
  return (
    (second.longitude - first.longitude) *
      (third.latitude - first.latitude) -
    (second.latitude - first.latitude) *
      (third.longitude - first.longitude)
  );
}

function pointOnSegment(
  point: GeoCoordinate,
  start: GeoCoordinate,
  end: GeoCoordinate,
): boolean {
  return (
    Math.abs(crossProduct(start, end, point)) < 1e-12 &&
    point.longitude >= Math.min(start.longitude, end.longitude) &&
    point.longitude <= Math.max(start.longitude, end.longitude) &&
    point.latitude >= Math.min(start.latitude, end.latitude) &&
    point.latitude <= Math.max(start.latitude, end.latitude)
  );
}

function segmentsIntersect(
  firstStart: GeoCoordinate,
  firstEnd: GeoCoordinate,
  secondStart: GeoCoordinate,
  secondEnd: GeoCoordinate,
): boolean {
  const firstSide = crossProduct(firstStart, firstEnd, secondStart);
  const secondSide = crossProduct(firstStart, firstEnd, secondEnd);
  const thirdSide = crossProduct(secondStart, secondEnd, firstStart);
  const fourthSide = crossProduct(secondStart, secondEnd, firstEnd);
  return (
    (firstSide * secondSide < 0 && thirdSide * fourthSide < 0) ||
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  );
}

function polygonSelfIntersects(boundary: GeoCoordinate[]): boolean {
  // ponytail: O(n²) is fine for human-entered vertices; use a sweep line for bulk imports.
  for (let first = 0; first < boundary.length; first += 1) {
    const firstNext = (first + 1) % boundary.length;
    for (let second = first + 1; second < boundary.length; second += 1) {
      const secondNext = (second + 1) % boundary.length;
      if (
        first === second ||
        firstNext === second ||
        secondNext === first
      ) {
        continue;
      }
      if (
        segmentsIntersect(
          boundary[first],
          boundary[firstNext],
          boundary[second],
          boundary[secondNext],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function validateForestAreaInput(
  input: CreateForestAreaInput,
): string | null {
  if (!input.subZone.trim() || !input.compartment.trim() || !input.plot.trim()) {
    return 'Vui lòng nhập đầy đủ Tiểu khu, Khoảnh và Lô.';
  }
  if (
    input.subZone.trim().length > 40 ||
    input.compartment.trim().length > 40 ||
    input.plot.trim().length > 40
  ) {
    return 'Tên đơn vị khu vực không được dài quá 40 ký tự.';
  }
  if (input.boundary.length < 3) {
    return 'Đa giác cần ít nhất 3 đỉnh.';
  }
  if (
    input.boundary.some(
      point =>
        !Number.isFinite(point.latitude) ||
        !Number.isFinite(point.longitude) ||
        point.latitude < -85 ||
        point.latitude > 85 ||
        point.longitude < -180 ||
        point.longitude > 180,
    )
  ) {
    return 'Tọa độ phải nằm trong phạm vi vĩ độ -85–85 và kinh độ -180–180.';
  }
  const uniquePoints = new Set(
    input.boundary.map(point => `${point.latitude},${point.longitude}`),
  );
  if (uniquePoints.size !== input.boundary.length) {
    return 'Các đỉnh của đa giác không được trùng nhau.';
  }
  if (polygonSelfIntersects(input.boundary)) {
    return 'Các cạnh đa giác không được cắt nhau.';
  }
  const doubledArea = input.boundary.reduce((sum, point, index) => {
    const next = input.boundary[(index + 1) % input.boundary.length];
    return sum + point.longitude * next.latitude - next.longitude * point.latitude;
  }, 0);
  if (Math.abs(doubledArea) < 1e-12) {
    return 'Các đỉnh chưa tạo thành một đa giác có diện tích.';
  }
  return null;
}

export function validateCompletePatrolInput(
  input: CompletePatrolInput,
): string | null {
  if (!Number.isFinite(input.estimatedDistanceKm)) {
    return 'Vui lòng nhập tổng quãng đường.';
  }
  if (input.estimatedDistanceKm < 0) {
    return 'Tổng quãng đường không thể là số âm.';
  }
  return null;
}

export function validateEventInput(input: SaveEventInput): string | null {
  if (!input.type) {
    return 'Vui lòng chọn loại sự kiện.';
  }
  if (input.type === 'no_violation' && input.severity) {
    return 'Không phát hiện vi phạm không áp dụng mức độ.';
  }
  if (input.type !== 'no_violation' && !input.severity) {
    return 'Vui lòng chọn mức độ.';
  }
  if ((input.note?.length ?? 0) > 2000) {
    return 'Ghi chú không được dài quá 2.000 ký tự.';
  }
  return null;
}

export function validateObservationInput(
  input: SaveObservationInput,
): string | null {
  if (!input.source) return 'Vui lòng chọn nguồn số liệu.';
  if (!input.observedAt || Number.isNaN(Date.parse(input.observedAt))) {
    return 'Thời điểm quan trắc không hợp lệ.';
  }
  if (
    input.relativeHumidityPct !== undefined &&
    (!Number.isFinite(input.relativeHumidityPct) ||
      input.relativeHumidityPct < 0 ||
      input.relativeHumidityPct > 100)
  ) {
    return 'Độ ẩm phải nằm trong khoảng 0–100%.';
  }
  if (
    input.airTemperatureC !== undefined &&
    !Number.isFinite(input.airTemperatureC)
  ) {
    return 'Nhiệt độ không hợp lệ.';
  }
  if (
    input.rainfallMm !== undefined &&
    (!Number.isFinite(input.rainfallMm) || input.rainfallMm < 0)
  ) {
    return 'Lượng mưa không thể là số âm.';
  }
  if (input.rainfallMm !== undefined) {
    if (!input.rainfallStartedAt || !input.rainfallEndedAt) {
      return 'Vui lòng nhập đủ thời gian bắt đầu và kết thúc đo mưa.';
    }
    if (
      Date.parse(input.rainfallEndedAt) <= Date.parse(input.rainfallStartedAt)
    ) {
      return 'Thời gian kết thúc đo mưa phải sau thời gian bắt đầu.';
    }
    if (!['measured', 'station_reading'].includes(input.source)) {
      return 'Lượng mưa cần nguồn đo trực tiếp hoặc đọc từ trạm.';
    }
    if (input.source === 'station_reading' && !input.stationCode?.trim()) {
      return 'Vui lòng nhập mã trạm đo mưa.';
    }
  } else if (
    input.rainfallStartedAt ||
    input.rainfallEndedAt ||
    input.stationCode?.trim()
  ) {
    return 'Vui lòng nhập lượng mưa cho khoảng đo đã khai báo.';
  }
  if (input.source === 'measured' && !input.deviceMethod?.trim()) {
    return 'Vui lòng nhập thiết bị hoặc phương pháp đo.';
  }
  if ((input.note?.length ?? 0) > 2000) {
    return 'Ghi chú không được dài quá 2.000 ký tự.';
  }
  if (
    input.airTemperatureC === undefined &&
    input.relativeHumidityPct === undefined &&
    !input.weather &&
    input.rainfallMm === undefined &&
    input.fireSign === 'none' &&
    input.photos.length === 0 &&
    !input.note?.trim()
  ) {
    return 'Vui lòng nhập ít nhất một kết quả quan trắc.';
  }
  return null;
}

export function parseOptionalDecimal(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const result = Number(value.replace(',', '.'));
  return Number.isFinite(result) ? result : Number.NaN;
}

export function parseFieldDateTime(value: string): string | undefined {
  const match = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return undefined;
  }
  return date.toISOString();
}

export function formatFieldDateTime(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatForestArea(area: ForestArea): string {
  return `Tiểu khu ${area.subZone} · Khoảnh ${area.compartment} · Lô ${area.plot}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} · ${pad(
    date.getDate(),
  )}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
