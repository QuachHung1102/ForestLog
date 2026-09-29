import type { Scalar, Transaction } from '@op-engineering/op-sqlite';
import {
  OBSERVATION_PROTOCOL,
  type DraftPhoto,
  type FireSign,
  type GpsStatus,
  type Observation,
  type ObservationDraft,
  type ObservationPhoto,
  type ObservationSource,
  type ObservationWithPhotos,
  type SaveObservationInput,
  type WeatherType,
  validateObservationInput,
} from '../domain';
import { getDatabase } from './database';

let draftWriteQueue = Promise.resolve();

function createLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function optionalNumber(value: Scalar | undefined): number | undefined {
  return value === null || value === undefined ? undefined : Number(value);
}

function optionalString(value: Scalar | undefined): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function mapObservation(row: Record<string, Scalar>): Observation {
  return {
    id: String(row.id),
    patrolId: String(row.patrol_id),
    protocol: OBSERVATION_PROTOCOL,
    source: String(row.source) as ObservationSource,
    observedAt: String(row.observed_at),
    airTemperatureC: optionalNumber(row.air_temperature_c),
    relativeHumidityPct: optionalNumber(row.relative_humidity_pct),
    weather: optionalString(row.weather) as WeatherType | undefined,
    rainfallMm: optionalNumber(row.rainfall_mm),
    rainfallStartedAt: optionalString(row.rainfall_started_at),
    rainfallEndedAt: optionalString(row.rainfall_ended_at),
    stationCode: optionalString(row.station_code),
    fireSign: String(row.fire_sign) as FireSign,
    deviceMethod: optionalString(row.device_method),
    calibrationCheckedAt: optionalString(row.calibration_checked_at),
    note: optionalString(row.note),
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    gpsAccuracy: optionalNumber(row.gps_accuracy),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPhoto(row: Record<string, Scalar>): ObservationPhoto {
  return {
    id: String(row.id),
    observationId: String(row.observation_id),
    localUri: String(row.local_uri),
    position: Number(row.position),
    createdAt: String(row.created_at),
  };
}

function mapDraftPhoto(row: Record<string, Scalar>): DraftPhoto {
  return {
    id: String(row.id),
    localUri: String(row.local_uri),
    position: Number(row.position),
    createdAt: String(row.created_at),
  };
}

export async function getPatrolObservations(
  patrolId: string,
): Promise<ObservationWithPhotos[]> {
  const database = await getDatabase();
  const [observationResult, photoResult] = await Promise.all([
    database.execute(
      `SELECT * FROM observations
       WHERE patrol_id = ? ORDER BY observed_at ASC, created_at ASC`,
      [patrolId],
    ),
    database.execute(
      `SELECT observation_photos.* FROM observation_photos
       JOIN observations ON observations.id = observation_photos.observation_id
       WHERE observations.patrol_id = ?
       ORDER BY observation_photos.position ASC, observation_photos.created_at ASC`,
      [patrolId],
    ),
  ]);
  const photosByObservation = new Map<string, ObservationPhoto[]>();
  for (const row of photoResult.rows) {
    const observationId = String(row.observation_id);
    photosByObservation.set(observationId, [
      ...(photosByObservation.get(observationId) ?? []),
      mapPhoto(row),
    ]);
  }
  return observationResult.rows.map(row => ({
    ...mapObservation(row),
    photos: photosByObservation.get(String(row.id)) ?? [],
  }));
}

export async function getObservationDraft(
  patrolId: string,
): Promise<ObservationDraft | undefined> {
  const database = await getDatabase();
  const [draftResult, photoResult] = await Promise.all([
    database.execute(
      'SELECT * FROM observation_drafts WHERE patrol_id = ? LIMIT 1',
      [patrolId],
    ),
    database.execute(
      `SELECT * FROM observation_draft_photos
       WHERE patrol_id = ? ORDER BY position ASC, created_at ASC`,
      [patrolId],
    ),
  ]);
  const row = draftResult.rows[0];
  if (!row) return undefined;
  return {
    patrolId,
    editingObservationId: optionalString(row.editing_observation_id),
    source: optionalString(row.source) as ObservationSource | undefined,
    observedAt: String(row.observed_at),
    airTemperature: String(row.air_temperature),
    relativeHumidity: String(row.relative_humidity),
    weather: optionalString(row.weather) as WeatherType | undefined,
    rainfall: String(row.rainfall),
    rainfallStartedAt: String(row.rainfall_started_at),
    rainfallEndedAt: String(row.rainfall_ended_at),
    stationCode: String(row.station_code),
    fireSign: String(row.fire_sign) as FireSign,
    deviceMethod: String(row.device_method),
    calibrationCheckedAt: String(row.calibration_checked_at),
    note: String(row.note),
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    gpsAccuracy: optionalNumber(row.gps_accuracy),
    gpsStatus:
      String(row.gps_status) === 'acquiring'
        ? 'unavailable'
        : (String(row.gps_status) as GpsStatus),
    photos: photoResult.rows.map(mapDraftPhoto),
    updatedAt: String(row.updated_at),
  };
}

export function saveObservationDraft(draft: ObservationDraft): Promise<void> {
  draftWriteQueue = draftWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const database = await getDatabase();
      await database.transaction(async transaction => {
        await transaction.execute(
          `INSERT INTO observation_drafts (
            patrol_id, editing_observation_id, source, observed_at,
            air_temperature, relative_humidity, weather, rainfall,
            rainfall_started_at, rainfall_ended_at, station_code, fire_sign,
            device_method, calibration_checked_at, note, latitude, longitude,
            gps_accuracy, gps_status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(patrol_id) DO UPDATE SET
            editing_observation_id = excluded.editing_observation_id,
            source = excluded.source,
            observed_at = excluded.observed_at,
            air_temperature = excluded.air_temperature,
            relative_humidity = excluded.relative_humidity,
            weather = excluded.weather,
            rainfall = excluded.rainfall,
            rainfall_started_at = excluded.rainfall_started_at,
            rainfall_ended_at = excluded.rainfall_ended_at,
            station_code = excluded.station_code,
            fire_sign = excluded.fire_sign,
            device_method = excluded.device_method,
            calibration_checked_at = excluded.calibration_checked_at,
            note = excluded.note,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            gps_accuracy = excluded.gps_accuracy,
            gps_status = excluded.gps_status,
            updated_at = excluded.updated_at`,
          [
            draft.patrolId,
            draft.editingObservationId ?? null,
            draft.source ?? null,
            draft.observedAt,
            draft.airTemperature,
            draft.relativeHumidity,
            draft.weather ?? null,
            draft.rainfall,
            draft.rainfallStartedAt,
            draft.rainfallEndedAt,
            draft.stationCode,
            draft.fireSign,
            draft.deviceMethod,
            draft.calibrationCheckedAt,
            draft.note,
            draft.latitude ?? null,
            draft.longitude ?? null,
            draft.gpsAccuracy ?? null,
            draft.gpsStatus,
            draft.updatedAt,
          ],
        );
        await replaceDraftPhotos(transaction, draft);
      });
    });
  return draftWriteQueue;
}

async function replaceDraftPhotos(
  transaction: Transaction,
  draft: ObservationDraft,
): Promise<void> {
  await transaction.execute(
    'DELETE FROM observation_draft_photos WHERE patrol_id = ?',
    [draft.patrolId],
  );
  for (const [position, photo] of draft.photos.entries()) {
    await transaction.execute(
      `INSERT INTO observation_draft_photos
       (id, patrol_id, local_uri, position, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [photo.id, draft.patrolId, photo.localUri, position, photo.createdAt],
    );
  }
}

export async function savePatrolObservation(
  patrolId: string,
  input: SaveObservationInput,
  observationId?: string,
): Promise<void> {
  const validationError = validateObservationInput(input);
  if (validationError) throw new Error(validationError);
  if (!input.source || !input.observedAt) {
    throw new Error('Phiếu quan trắc chưa đủ thông tin bắt buộc.');
  }

  await draftWriteQueue.catch(() => undefined);
  const database = await getDatabase();
  const now = new Date().toISOString();
  const id = observationId ?? createLocalId();
  const values = [
    input.source,
    input.observedAt,
    input.airTemperatureC ?? null,
    input.relativeHumidityPct ?? null,
    input.weather ?? null,
    input.rainfallMm ?? null,
    input.rainfallStartedAt ?? null,
    input.rainfallEndedAt ?? null,
    input.stationCode?.trim() || null,
    input.fireSign,
    input.deviceMethod?.trim() || null,
    input.calibrationCheckedAt?.trim() || null,
    input.note?.trim() || null,
    input.latitude ?? null,
    input.longitude ?? null,
    input.gpsAccuracy ?? null,
  ];

  await database.transaction(async transaction => {
    const patrolResult = await transaction.execute(
      `SELECT 1 FROM patrols WHERE id = ? AND status = 'active' LIMIT 1`,
      [patrolId],
    );
    if (patrolResult.rows.length === 0) {
      throw new Error('Chuyến tuần tra đã hoàn thành và không thể chỉnh sửa.');
    }

    if (observationId) {
      const result = await transaction.execute(
        `UPDATE observations SET
          source = ?, observed_at = ?, air_temperature_c = ?,
          relative_humidity_pct = ?, weather = ?, rainfall_mm = ?,
          rainfall_started_at = ?, rainfall_ended_at = ?, station_code = ?,
          fire_sign = ?, device_method = ?, calibration_checked_at = ?, note = ?,
          latitude = ?, longitude = ?, gps_accuracy = ?, updated_at = ?
         WHERE id = ? AND patrol_id = ?`,
        [...values, now, id, patrolId],
      );
      if (result.rowsAffected === 0) {
        throw new Error('Không tìm thấy phiếu quan trắc cần chỉnh sửa.');
      }
      await transaction.execute(
        'DELETE FROM observation_photos WHERE observation_id = ?',
        [id],
      );
    } else {
      await transaction.execute(
        `INSERT INTO observations (
          id, patrol_id, protocol, source, observed_at, air_temperature_c,
          relative_humidity_pct, weather, rainfall_mm, rainfall_started_at,
          rainfall_ended_at, station_code, fire_sign, device_method,
          calibration_checked_at, note, latitude, longitude, gps_accuracy,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patrolId, OBSERVATION_PROTOCOL, ...values, now, now],
      );
    }

    for (const [position, photo] of input.photos.entries()) {
      await transaction.execute(
        `INSERT INTO observation_photos
         (id, observation_id, local_uri, position, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [photo.id, id, photo.localUri, position, photo.createdAt],
      );
    }
    await transaction.execute(
      'DELETE FROM observation_drafts WHERE patrol_id = ?',
      [patrolId],
    );
  });
}

export async function deletePatrolObservation(
  patrolId: string,
  observationId: string,
): Promise<string[]> {
  const database = await getDatabase();
  const photoResult = await database.execute(
    `SELECT observation_photos.local_uri FROM observation_photos
     JOIN observations ON observations.id = observation_photos.observation_id
     JOIN patrols ON patrols.id = observations.patrol_id
     WHERE observations.id = ? AND observations.patrol_id = ?
       AND patrols.status = 'active'`,
    [observationId, patrolId],
  );
  const result = await database.execute(
    `DELETE FROM observations
     WHERE id = ? AND patrol_id = ?
       AND EXISTS (
         SELECT 1 FROM patrols
         WHERE patrols.id = observations.patrol_id
           AND patrols.status = 'active'
       )`,
    [observationId, patrolId],
  );
  if (result.rowsAffected === 0) {
    throw new Error('Phiếu quan trắc không còn có thể xóa.');
  }
  return photoResult.rows.map(row => String(row.local_uri));
}
