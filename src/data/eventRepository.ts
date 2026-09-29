import type { Scalar, Transaction } from '@op-engineering/op-sqlite';
import {
  type EventDraft,
  type DraftPhoto,
  type EventPhoto,
  type GpsStatus,
  type PatrolEvent,
  type PatrolEventType,
  type PatrolEventWithPhotos,
  type SaveEventInput,
  type SeverityLevel,
  validateEventInput,
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

function mapEvent(row: Record<string, Scalar>): PatrolEvent {
  return {
    id: String(row.id),
    patrolId: String(row.patrol_id),
    type: String(row.type) as PatrolEventType,
    severity: optionalString(row.severity) as SeverityLevel | undefined,
    note: optionalString(row.note),
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    gpsAccuracy: optionalNumber(row.gps_accuracy),
    occurredAt: String(row.occurred_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPhoto(row: Record<string, Scalar>): EventPhoto {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
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

export async function getPatrolEvents(
  patrolId: string,
): Promise<PatrolEventWithPhotos[]> {
  const database = await getDatabase();
  const [eventResult, photoResult] = await Promise.all([
    database.execute(
      `SELECT * FROM patrol_events
       WHERE patrol_id = ? ORDER BY occurred_at ASC, created_at ASC`,
      [patrolId],
    ),
    database.execute(
      `SELECT event_photos.* FROM event_photos
       JOIN patrol_events ON patrol_events.id = event_photos.event_id
       WHERE patrol_events.patrol_id = ?
       ORDER BY event_photos.position ASC, event_photos.created_at ASC`,
      [patrolId],
    ),
  ]);
  const photosByEvent = new Map<string, EventPhoto[]>();
  for (const row of photoResult.rows) {
    const eventId = String(row.event_id);
    photosByEvent.set(eventId, [
      ...(photosByEvent.get(eventId) ?? []),
      mapPhoto(row),
    ]);
  }
  return eventResult.rows.map(row => ({
    ...mapEvent(row),
    photos: photosByEvent.get(String(row.id)) ?? [],
  }));
}

export async function getPatrolPhotoUris(patrolId: string): Promise<string[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT event_photos.local_uri FROM event_photos
       JOIN patrol_events ON patrol_events.id = event_photos.event_id
       WHERE patrol_events.patrol_id = ?
     UNION
     SELECT local_uri FROM event_draft_photos WHERE patrol_id = ?
     UNION
     SELECT observation_photos.local_uri FROM observation_photos
       JOIN observations ON observations.id = observation_photos.observation_id
       WHERE observations.patrol_id = ?
     UNION
     SELECT local_uri FROM observation_draft_photos WHERE patrol_id = ?`,
    [patrolId, patrolId, patrolId, patrolId],
  );
  return result.rows.map(row => String(row.local_uri));
}

export async function getEventDraft(
  patrolId: string,
): Promise<EventDraft | undefined> {
  const database = await getDatabase();
  const [draftResult, photoResult] = await Promise.all([
    database.execute('SELECT * FROM event_drafts WHERE patrol_id = ? LIMIT 1', [
      patrolId,
    ]),
    database.execute(
      `SELECT * FROM event_draft_photos
       WHERE patrol_id = ? ORDER BY position ASC, created_at ASC`,
      [patrolId],
    ),
  ]);
  const row = draftResult.rows[0];
  if (!row) {
    return undefined;
  }
  return {
    patrolId,
    editingEventId: optionalString(row.editing_event_id),
    type: optionalString(row.type) as PatrolEventType | undefined,
    severity: optionalString(row.severity) as SeverityLevel | undefined,
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

export function saveEventDraft(draft: EventDraft): Promise<void> {
  draftWriteQueue = draftWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const database = await getDatabase();
      await database.transaction(async transaction => {
        await transaction.execute(
          `INSERT INTO event_drafts (
          patrol_id, editing_event_id, type, severity, note,
          latitude, longitude, gps_accuracy, gps_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(patrol_id) DO UPDATE SET
          editing_event_id = excluded.editing_event_id,
          type = excluded.type,
          severity = excluded.severity,
          note = excluded.note,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          gps_accuracy = excluded.gps_accuracy,
          gps_status = excluded.gps_status,
          updated_at = excluded.updated_at`,
          [
            draft.patrolId,
            draft.editingEventId ?? null,
            draft.type ?? null,
            draft.severity ?? null,
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
  draft: EventDraft,
): Promise<void> {
  await transaction.execute(
    'DELETE FROM event_draft_photos WHERE patrol_id = ?',
    [draft.patrolId],
  );
  for (const [position, photo] of draft.photos.entries()) {
    await transaction.execute(
      `INSERT INTO event_draft_photos
       (id, patrol_id, local_uri, position, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [photo.id, draft.patrolId, photo.localUri, position, photo.createdAt],
    );
  }
}

export async function savePatrolEvent(
  patrolId: string,
  input: SaveEventInput,
  eventId?: string,
): Promise<void> {
  const validationError = validateEventInput(input);
  if (validationError) {
    throw new Error(validationError);
  }
  if (!input.type) {
    throw new Error('Vui lòng chọn loại sự kiện.');
  }
  const eventType = input.type;

  await draftWriteQueue.catch(() => undefined);
  const database = await getDatabase();
  const now = new Date().toISOString();
  const id = eventId ?? createLocalId();
  await database.transaction(async transaction => {
    const patrolResult = await transaction.execute(
      `SELECT 1 FROM patrols WHERE id = ? AND status = 'active' LIMIT 1`,
      [patrolId],
    );
    if (patrolResult.rows.length === 0) {
      throw new Error('Chuyến tuần tra đã hoàn thành và không thể chỉnh sửa.');
    }

    if (eventId) {
      const updateResult = await transaction.execute(
        `UPDATE patrol_events SET
          type = ?, severity = ?, note = ?, latitude = ?, longitude = ?,
          gps_accuracy = ?, updated_at = ?
         WHERE id = ? AND patrol_id = ?`,
        [
          eventType,
          input.severity ?? null,
          input.note?.trim() || null,
          input.latitude ?? null,
          input.longitude ?? null,
          input.gpsAccuracy ?? null,
          now,
          id,
          patrolId,
        ],
      );
      if (updateResult.rowsAffected === 0) {
        throw new Error('Không tìm thấy sự kiện cần chỉnh sửa.');
      }
      await transaction.execute('DELETE FROM event_photos WHERE event_id = ?', [
        id,
      ]);
    } else {
      await transaction.execute(
        `INSERT INTO patrol_events (
          id, patrol_id, type, severity, note, latitude, longitude,
          gps_accuracy, occurred_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          patrolId,
          eventType,
          input.severity ?? null,
          input.note?.trim() || null,
          input.latitude ?? null,
          input.longitude ?? null,
          input.gpsAccuracy ?? null,
          now,
          now,
          now,
        ],
      );
    }

    for (const [position, photo] of input.photos.entries()) {
      await transaction.execute(
        `INSERT INTO event_photos
         (id, event_id, local_uri, position, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [photo.id, id, photo.localUri, position, photo.createdAt],
      );
    }
    await transaction.execute('DELETE FROM event_drafts WHERE patrol_id = ?', [
      patrolId,
    ]);
  });
}

export async function deletePatrolEvent(
  patrolId: string,
  eventId: string,
): Promise<string[]> {
  const database = await getDatabase();
  const photoResult = await database.execute(
    `SELECT event_photos.local_uri FROM event_photos
     JOIN patrol_events ON patrol_events.id = event_photos.event_id
     JOIN patrols ON patrols.id = patrol_events.patrol_id
     WHERE patrol_events.id = ? AND patrol_events.patrol_id = ?
       AND patrols.status = 'active'`,
    [eventId, patrolId],
  );
  const result = await database.execute(
    `DELETE FROM patrol_events
     WHERE id = ? AND patrol_id = ?
       AND EXISTS (
         SELECT 1 FROM patrols
         WHERE patrols.id = patrol_events.patrol_id
           AND patrols.status = 'active'
       )`,
    [eventId, patrolId],
  );
  if (result.rowsAffected === 0) {
    throw new Error('Sự kiện không còn có thể xóa.');
  }
  return photoResult.rows.map(row => String(row.local_uri));
}
