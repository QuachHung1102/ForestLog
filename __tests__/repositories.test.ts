import type { DB, Transaction } from '@op-engineering/op-sqlite';
import { getDatabase } from '../src/data/database';
import {
  completePatrol,
  createForestArea,
  createPatrol,
  getActivePatrol,
} from '../src/data/patrolRepository';
import {
  deletePatrolEvent,
  savePatrolEvent,
} from '../src/data/eventRepository';
import {
  deletePatrolObservation,
  savePatrolObservation,
} from '../src/data/observationRepository';

jest.mock('../src/data/database', () => ({ getDatabase: jest.fn() }));

const mockedGetDatabase = getDatabase as jest.MockedFunction<
  typeof getDatabase
>;

function databaseWith(execute: jest.Mock): {
  database: DB;
  transaction: Transaction;
} {
  const transaction = { execute } as unknown as Transaction;
  const database = {
    execute,
    transaction: async (work: (value: Transaction) => Promise<unknown>) =>
      work(transaction),
  } as unknown as DB;
  return { database, transaction };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('stores a forest-area boundary in SQLite', async () => {
  const execute: jest.Mock = jest.fn(async () => ({
    rows: [],
    rowsAffected: 1,
  }));
  const { database } = databaseWith(execute);
  mockedGetDatabase.mockResolvedValue(database);
  const boundary = [
    { latitude: 16.2, longitude: 108.2 },
    { latitude: 16.2, longitude: 108.3 },
    { latitude: 16.3, longitude: 108.3 },
  ];

  const area = await createForestArea({
    subZone: '12',
    compartment: '3',
    plot: '7',
    boundary,
  });

  expect(area.boundary).toEqual(boundary);
  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO forest_areas'),
    expect.arrayContaining(['12', '3', '7', JSON.stringify(boundary)]),
  );
});

test('creates and retrieves the one active patrol from SQLite', async () => {
  const execute: jest.Mock = jest.fn(async (sql: string) => {
    if (sql.includes("WHERE status = 'active' LIMIT 1")) {
      return { rows: [] };
    }
    if (sql.includes('FROM forest_areas')) {
      return { rows: [{ found: 1 }] };
    }
    return { rows: [], rowsAffected: 1 };
  });
  const { database } = databaseWith(execute);
  mockedGetDatabase.mockResolvedValue(database);

  const created = await createPatrol({
    rangerName: '  Nguyễn Văn A  ',
    forestAreaId: 'TK12-K3-L7',
    weather: 'cloudy',
  });

  expect(created.rangerName).toBe('Nguyễn Văn A');
  expect(created.status).toBe('active');
  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO patrols'),
    expect.arrayContaining(['Nguyễn Văn A', 'TK12-K3-L7', 'cloudy', 'active']),
  );

  execute.mockResolvedValueOnce({
    rows: [
      {
        id: created.id,
        ranger_name: created.rangerName,
        started_at: created.startedAt,
        completed_at: null,
        forest_area_id: created.forestAreaId,
        weather: created.weather,
        estimated_distance_km: null,
        emergency_report_required: null,
        status: 'active',
        created_at: created.createdAt,
        updated_at: created.updatedAt,
      },
    ],
  });
  await expect(getActivePatrol()).resolves.toMatchObject({
    id: created.id,
    status: 'active',
  });
});

test('completes a patrol so it is no longer returned as active', async () => {
  const now = new Date().toISOString();
  const execute: jest.Mock = jest
    .fn()
    .mockResolvedValueOnce({
      rows: [
        {
          id: 'patrol-1',
          ranger_name: 'Nguyễn Văn A',
          started_at: now,
          completed_at: now,
          forest_area_id: 'TK12-K3-L7',
          weather: 'sunny',
          estimated_distance_km: 6.5,
          emergency_report_required: 1,
          status: 'completed',
          created_at: now,
          updated_at: now,
        },
      ],
      rowsAffected: 1,
    })
    .mockResolvedValueOnce({ rows: [] });
  const { database } = databaseWith(execute);
  mockedGetDatabase.mockResolvedValue(database);

  await expect(
    completePatrol('patrol-1', {
      estimatedDistanceKm: 6.5,
      emergencyReportRequired: true,
    }),
  ).resolves.toMatchObject({ status: 'completed', estimatedDistanceKm: 6.5 });
  await expect(getActivePatrol()).resolves.toBeUndefined();
});

test('saves ordered event photos and returns their files when deleting', async () => {
  const execute: jest.Mock = jest.fn(async (sql: string) => {
    if (sql.includes("status = 'active' LIMIT 1")) {
      return { rows: [{ found: 1 }] };
    }
    if (sql.includes('SELECT event_photos.local_uri')) {
      return { rows: [{ local_uri: 'file:///evidence-1.jpg' }] };
    }
    return { rows: [], rowsAffected: 1 };
  });
  const { database } = databaseWith(execute);
  mockedGetDatabase.mockResolvedValue(database);

  await savePatrolEvent('patrol-1', {
    type: 'illegal_logging',
    severity: 'high',
    note: 'Cây mới bị cưa hạ',
    photos: [
      {
        id: 'photo-1',
        localUri: 'file:///evidence-1.jpg',
        position: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  });
  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO event_photos'),
    expect.arrayContaining(['photo-1', 'file:///evidence-1.jpg', 0]),
  );

  await expect(deletePatrolEvent('patrol-1', 'event-1')).resolves.toEqual([
    'file:///evidence-1.jpg',
  ]);
});

test('saves a measured observation and returns its photo when deleting', async () => {
  const execute: jest.Mock = jest.fn(async (sql: string) => {
    if (sql.includes("status = 'active' LIMIT 1")) {
      return { rows: [{ found: 1 }] };
    }
    if (sql.includes('SELECT observation_photos.local_uri')) {
      return { rows: [{ local_uri: 'file:///rain-gauge.jpg' }] };
    }
    return { rows: [], rowsAffected: 1 };
  });
  const { database } = databaseWith(execute);
  mockedGetDatabase.mockResolvedValue(database);

  await savePatrolObservation('patrol-1', {
    source: 'measured',
    observedAt: '2026-08-15T02:45:00.000Z',
    airTemperatureC: 28.5,
    relativeHumidityPct: 78,
    fireSign: 'none',
    deviceMethod: 'Kestrel 5500',
    photos: [
      {
        id: 'photo-2',
        localUri: 'file:///rain-gauge.jpg',
        position: 0,
        createdAt: '2026-08-15T02:45:00.000Z',
      },
    ],
  });
  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO observation_photos'),
    expect.arrayContaining(['photo-2', 'file:///rain-gauge.jpg', 0]),
  );

  await expect(
    deletePatrolObservation('patrol-1', 'observation-1'),
  ).resolves.toEqual(['file:///rain-gauge.jpg']);
});
