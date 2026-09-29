import { open, type DB, type Transaction } from '@op-engineering/op-sqlite';
import { FOREST_AREAS } from '../domain';

const database = open({ name: 'forestlog.sqlite' });
let initialization: Promise<void> | undefined;

const migrationOne = [
  `CREATE TABLE IF NOT EXISTS forest_areas (
    id TEXT PRIMARY KEY,
    sub_zone TEXT NOT NULL,
    compartment TEXT NOT NULL,
    plot TEXT NOT NULL
  ) STRICT`,
  `CREATE TABLE IF NOT EXISTS patrols (
    id TEXT PRIMARY KEY,
    ranger_name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    forest_area_id TEXT NOT NULL REFERENCES forest_areas(id),
    weather TEXT CHECK (weather IN ('sunny', 'cloudy', 'rainy', 'foggy', 'other')),
    estimated_distance_km REAL CHECK (estimated_distance_km >= 0),
    emergency_report_required INTEGER CHECK (emergency_report_required IN (0, 1)),
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT`,
  `CREATE TABLE IF NOT EXISTS patrol_events (
    id TEXT PRIMARY KEY,
    patrol_id TEXT NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
      'illegal_logging', 'illegal_hunting', 'fire_risk',
      'land_encroachment', 'waste', 'no_violation'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    note TEXT,
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT`,
  `CREATE TABLE IF NOT EXISTS event_photos (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES patrol_events(id) ON DELETE CASCADE,
    local_uri TEXT NOT NULL,
    created_at TEXT NOT NULL
  ) STRICT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_patrol
    ON patrols(status) WHERE status = 'active'`,
  `CREATE INDEX IF NOT EXISTS idx_patrols_started_at
    ON patrols(started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_patrol_events_patrol_id
    ON patrol_events(patrol_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_photos_event_id
    ON event_photos(event_id)`,
] as const;

const migrationTwo = [
  `CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT`,
] as const;

const migrationThree = [
  'ALTER TABLE event_photos RENAME TO event_photos_v2',
  'ALTER TABLE patrol_events RENAME TO patrol_events_v2',
  `CREATE TABLE patrol_events (
    id TEXT PRIMARY KEY,
    patrol_id TEXT NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
      'illegal_logging', 'illegal_hunting', 'fire_risk',
      'land_encroachment', 'waste', 'no_violation'
    )),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    note TEXT,
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
      (type = 'no_violation' AND severity IS NULL) OR
      (type <> 'no_violation' AND severity IS NOT NULL)
    )
  ) STRICT`,
  `INSERT INTO patrol_events
     SELECT id, patrol_id, type,
       CASE WHEN type = 'no_violation' THEN NULL ELSE severity END,
       note, latitude, longitude, gps_accuracy, occurred_at, created_at, updated_at
     FROM patrol_events_v2`,
  `CREATE TABLE event_photos (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES patrol_events(id) ON DELETE CASCADE,
    local_uri TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL
  ) STRICT`,
  `INSERT INTO event_photos (id, event_id, local_uri, position, created_at)
     SELECT id, event_id, local_uri, 0, created_at FROM event_photos_v2`,
  'DROP TABLE event_photos_v2',
  'DROP TABLE patrol_events_v2',
  `CREATE TABLE event_drafts (
    patrol_id TEXT PRIMARY KEY REFERENCES patrols(id) ON DELETE CASCADE,
    editing_event_id TEXT REFERENCES patrol_events(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN (
      'illegal_logging', 'illegal_hunting', 'fire_risk',
      'land_encroachment', 'waste', 'no_violation'
    )),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    note TEXT NOT NULL DEFAULT '',
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    gps_status TEXT NOT NULL CHECK (
      gps_status IN ('idle', 'acquiring', 'acquired', 'unavailable')
    ),
    updated_at TEXT NOT NULL
  ) STRICT`,
  `CREATE TABLE event_draft_photos (
    id TEXT PRIMARY KEY,
    patrol_id TEXT NOT NULL REFERENCES event_drafts(patrol_id) ON DELETE CASCADE,
    local_uri TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX idx_patrol_events_patrol_id ON patrol_events(patrol_id)`,
  `CREATE INDEX idx_event_photos_event_id ON event_photos(event_id, position)`,
  `CREATE INDEX idx_event_draft_photos_patrol_id
     ON event_draft_photos(patrol_id, position)`,
] as const;

const migrationFour = [
  `CREATE TABLE observations (
    id TEXT PRIMARY KEY,
    patrol_id TEXT NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL CHECK (protocol = 'quick_weather_v1'),
    source TEXT NOT NULL CHECK (
      source IN ('measured', 'station_reading', 'observed', 'estimated')
    ),
    observed_at TEXT NOT NULL,
    air_temperature_c REAL,
    relative_humidity_pct REAL CHECK (
      relative_humidity_pct BETWEEN 0 AND 100
    ),
    weather TEXT CHECK (weather IN ('sunny', 'cloudy', 'rainy', 'foggy', 'other')),
    rainfall_mm REAL CHECK (rainfall_mm >= 0),
    rainfall_started_at TEXT,
    rainfall_ended_at TEXT,
    station_code TEXT,
    fire_sign TEXT NOT NULL CHECK (
      fire_sign IN ('none', 'active', 'recent', 'old')
    ),
    device_method TEXT,
    calibration_checked_at TEXT,
    note TEXT,
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
      (rainfall_mm IS NULL AND rainfall_started_at IS NULL AND rainfall_ended_at IS NULL) OR
      (rainfall_mm IS NOT NULL AND rainfall_started_at IS NOT NULL AND rainfall_ended_at IS NOT NULL)
    )
  ) STRICT`,
  `CREATE TABLE observation_photos (
    id TEXT PRIMARY KEY,
    observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    local_uri TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL
  ) STRICT`,
  `CREATE TABLE observation_drafts (
    patrol_id TEXT PRIMARY KEY REFERENCES patrols(id) ON DELETE CASCADE,
    editing_observation_id TEXT REFERENCES observations(id) ON DELETE SET NULL,
    source TEXT CHECK (
      source IN ('measured', 'station_reading', 'observed', 'estimated')
    ),
    observed_at TEXT NOT NULL,
    air_temperature TEXT NOT NULL DEFAULT '',
    relative_humidity TEXT NOT NULL DEFAULT '',
    weather TEXT CHECK (weather IN ('sunny', 'cloudy', 'rainy', 'foggy', 'other')),
    rainfall TEXT NOT NULL DEFAULT '',
    rainfall_started_at TEXT NOT NULL DEFAULT '',
    rainfall_ended_at TEXT NOT NULL DEFAULT '',
    station_code TEXT NOT NULL DEFAULT '',
    fire_sign TEXT NOT NULL CHECK (
      fire_sign IN ('none', 'active', 'recent', 'old')
    ),
    device_method TEXT NOT NULL DEFAULT '',
    calibration_checked_at TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    gps_status TEXT NOT NULL CHECK (
      gps_status IN ('idle', 'acquiring', 'acquired', 'unavailable')
    ),
    updated_at TEXT NOT NULL
  ) STRICT`,
  `CREATE TABLE observation_draft_photos (
    id TEXT PRIMARY KEY,
    patrol_id TEXT NOT NULL REFERENCES observation_drafts(patrol_id) ON DELETE CASCADE,
    local_uri TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX idx_observations_patrol_id
     ON observations(patrol_id, observed_at)`,
  `CREATE INDEX idx_observation_photos_observation_id
     ON observation_photos(observation_id, position)`,
  `CREATE INDEX idx_observation_draft_photos_patrol_id
     ON observation_draft_photos(patrol_id, position)`,
] as const;

const migrationFive = [
  `ALTER TABLE forest_areas ADD COLUMN boundary_json TEXT`,
  `CREATE UNIQUE INDEX idx_forest_areas_unit
     ON forest_areas(
       sub_zone COLLATE NOCASE,
       compartment COLLATE NOCASE,
       plot COLLATE NOCASE
     )`,
] as const;

async function runMigrationOne(transaction: Transaction): Promise<void> {
  for (const statement of migrationOne) {
    await transaction.execute(statement);
  }
  for (const area of FOREST_AREAS) {
    await transaction.execute(
      `INSERT OR IGNORE INTO forest_areas (id, sub_zone, compartment, plot)
       VALUES (?, ?, ?, ?)`,
      [area.id, area.subZone, area.compartment, area.plot],
    );
  }
  await transaction.execute('PRAGMA user_version = 1');
}

async function runMigrationTwo(transaction: Transaction): Promise<void> {
  for (const statement of migrationTwo) {
    await transaction.execute(statement);
  }
  await transaction.execute('PRAGMA user_version = 2');
}

async function runMigrationThree(transaction: Transaction): Promise<void> {
  for (const statement of migrationThree) {
    await transaction.execute(statement);
  }
  await transaction.execute('PRAGMA user_version = 3');
}

async function runMigrationFour(transaction: Transaction): Promise<void> {
  for (const statement of migrationFour) {
    await transaction.execute(statement);
  }
  await transaction.execute('PRAGMA user_version = 4');
}

async function runMigrationFive(transaction: Transaction): Promise<void> {
  for (const statement of migrationFive) {
    await transaction.execute(statement);
  }
  await transaction.execute('PRAGMA user_version = 5');
}

async function initialize(): Promise<void> {
  await database.execute('PRAGMA foreign_keys = ON');
  const result = await database.execute('PRAGMA user_version');
  const version = Number(result.rows[0]?.user_version ?? 0);

  if (version < 1) {
    await database.transaction(runMigrationOne);
  }
  if (version < 2) {
    await database.transaction(runMigrationTwo);
  }
  if (version < 3) {
    await database.transaction(runMigrationThree);
  }
  if (version < 4) {
    await database.transaction(runMigrationFour);
  }
  if (version < 5) {
    await database.transaction(runMigrationFive);
  }
}

export async function getDatabase(): Promise<DB> {
  if (!initialization) {
    initialization = initialize().catch(error => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
  return database;
}
