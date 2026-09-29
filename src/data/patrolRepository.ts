import type { Scalar } from '@op-engineering/op-sqlite';
import {
  type CreateForestAreaInput,
  type CreatePatrolInput,
  type CompletePatrolInput,
  type ForestArea,
  type GeoCoordinate,
  type Patrol,
  type PatrolStatus,
  type PatrolSummary,
  type WeatherType,
  validateForestAreaInput,
  validatePatrolInput,
  validateCompletePatrolInput,
} from '../domain';
import { getDatabase } from './database';

function createLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function optionalString(value: Scalar | undefined): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function parseBoundary(value: Scalar | undefined): GeoCoordinate[] | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.length < 3 ||
      parsed.some(
        point =>
          typeof point !== 'object' ||
          point === null ||
          !Number.isFinite((point as GeoCoordinate).latitude) ||
          !Number.isFinite((point as GeoCoordinate).longitude) ||
          Math.abs((point as GeoCoordinate).latitude) > 85 ||
          Math.abs((point as GeoCoordinate).longitude) > 180,
      )
    ) {
      return undefined;
    }
    return parsed as GeoCoordinate[];
  } catch {
    return undefined;
  }
}

function mapPatrol(row: Record<string, Scalar>): Patrol {
  const emergency = row.emergency_report_required;
  return {
    id: String(row.id),
    rangerName: String(row.ranger_name),
    startedAt: String(row.started_at),
    completedAt: optionalString(row.completed_at),
    forestAreaId: String(row.forest_area_id),
    weather: optionalString(row.weather) as WeatherType | undefined,
    estimatedDistanceKm:
      row.estimated_distance_km === null ||
      row.estimated_distance_km === undefined
        ? undefined
        : Number(row.estimated_distance_km),
    emergencyReportRequired:
      emergency === null || emergency === undefined
        ? undefined
        : Number(emergency) === 1,
    status: String(row.status) as PatrolStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getForestAreas(): Promise<ForestArea[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT id, sub_zone, compartment, plot, boundary_json
     FROM forest_areas
     ORDER BY CAST(sub_zone AS INTEGER), CAST(compartment AS INTEGER), CAST(plot AS INTEGER)`,
  );
  return result.rows.map(row => ({
    id: String(row.id),
    subZone: String(row.sub_zone),
    compartment: String(row.compartment),
    plot: String(row.plot),
    boundary: parseBoundary(row.boundary_json),
  }));
}

export async function createForestArea(
  input: CreateForestAreaInput,
): Promise<ForestArea> {
  const validationError = validateForestAreaInput(input);
  if (validationError) throw new Error(validationError);

  const area: ForestArea = {
    id: `area-${createLocalId()}`,
    subZone: input.subZone.trim(),
    compartment: input.compartment.trim(),
    plot: input.plot.trim(),
    boundary: input.boundary,
  };
  const database = await getDatabase();
  await database.transaction(async transaction => {
    const existing = await transaction.execute(
      `SELECT 1 FROM forest_areas
       WHERE sub_zone = ? COLLATE NOCASE
         AND compartment = ? COLLATE NOCASE
         AND plot = ? COLLATE NOCASE
       LIMIT 1`,
      [area.subZone, area.compartment, area.plot],
    );
    if (existing.rows.length > 0) {
      throw new Error('Tiểu khu, Khoảnh và Lô này đã tồn tại.');
    }
    await transaction.execute(
      `INSERT INTO forest_areas (
        id, sub_zone, compartment, plot, boundary_json
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        area.id,
        area.subZone,
        area.compartment,
        area.plot,
        JSON.stringify(area.boundary),
      ],
    );
  });
  return area;
}

export async function getActivePatrol(): Promise<Patrol | undefined> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT * FROM patrols WHERE status = 'active' LIMIT 1`,
  );
  return result.rows[0] ? mapPatrol(result.rows[0]) : undefined;
}

export async function getCompletedPatrols(): Promise<PatrolSummary[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT patrols.*,
       (SELECT COUNT(*) FROM patrol_events WHERE patrol_id = patrols.id) AS event_count,
       (SELECT COUNT(*) FROM observations WHERE patrol_id = patrols.id) AS observation_count
     FROM patrols
     WHERE patrols.status = 'completed'
     ORDER BY patrols.completed_at DESC, patrols.started_at DESC`,
  );
  return result.rows.map(row => ({
    ...mapPatrol(row),
    eventCount: Number(row.event_count),
    observationCount: Number(row.observation_count),
  }));
}

export async function createPatrol(input: CreatePatrolInput): Promise<Patrol> {
  const validationError = validatePatrolInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const database = await getDatabase();
  const now = new Date().toISOString();
  const patrol: Patrol = {
    id: createLocalId(),
    rangerName: input.rangerName.trim(),
    startedAt: now,
    forestAreaId: input.forestAreaId,
    weather: input.weather,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await database.transaction(async transaction => {
    const active = await transaction.execute(
      `SELECT 1 FROM patrols WHERE status = 'active' LIMIT 1`,
    );
    if (active.rows.length > 0) {
      throw new Error('Đã có một chuyến tuần tra đang diễn ra.');
    }
    const area = await transaction.execute(
      `SELECT 1 FROM forest_areas WHERE id = ? LIMIT 1`,
      [patrol.forestAreaId],
    );
    if (area.rows.length === 0) {
      throw new Error('Khu vực đã chọn không còn hợp lệ.');
    }
    await transaction.execute(
      `INSERT INTO patrols (
        id, ranger_name, started_at, forest_area_id, weather,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patrol.id,
        patrol.rangerName,
        patrol.startedAt,
        patrol.forestAreaId,
        patrol.weather ?? null,
        patrol.status,
        patrol.createdAt,
        patrol.updatedAt,
      ],
    );
  });

  return patrol;
}

export async function completePatrol(
  patrolId: string,
  input: CompletePatrolInput,
): Promise<Patrol> {
  const validationError = validateCompletePatrolInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database.execute(
    `UPDATE patrols SET
       status = 'completed',
       completed_at = ?,
       estimated_distance_km = ?,
       emergency_report_required = ?,
       updated_at = ?
     WHERE id = ? AND status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM event_drafts WHERE event_drafts.patrol_id = patrols.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM observation_drafts
         WHERE observation_drafts.patrol_id = patrols.id
       )
     RETURNING *`,
    [
      now,
      input.estimatedDistanceKm,
      input.emergencyReportRequired ? 1 : 0,
      now,
      patrolId,
    ],
  );
  if (!result.rows[0]) {
    throw new Error(
      'Hãy hoàn tất bản nháp ghi nhận trước khi kết thúc chuyến tuần tra.',
    );
  }
  return mapPatrol(result.rows[0]);
}
