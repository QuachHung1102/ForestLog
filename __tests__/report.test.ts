import { buildReportPayload } from '../src/device/report';
import type {
  ForestArea,
  ObservationWithPhotos,
  PatrolEventWithPhotos,
  PatrolSummary,
} from '../src/domain';

test('keeps stored event and photo order in the report payload', () => {
  const patrol: PatrolSummary = {
    id: 'p1',
    rangerName: 'Nguyễn Văn A',
    forestAreaId: 'a1',
    startedAt: '2026-08-15T01:00:00.000Z',
    completedAt: '2026-08-15T02:00:00.000Z',
    status: 'completed',
    eventCount: 1,
    observationCount: 1,
    createdAt: '2026-08-15T01:00:00.000Z',
    updatedAt: '2026-08-15T02:00:00.000Z',
  };
  const area: ForestArea = {
    id: 'a1',
    subZone: '12',
    compartment: '3',
    plot: '7',
  };
  const events: PatrolEventWithPhotos[] = [
    {
      id: 'e1',
      patrolId: 'p1',
      type: 'no_violation',
      occurredAt: '2026-08-15T01:30:00.000Z',
      createdAt: '2026-08-15T01:30:00.000Z',
      updatedAt: '2026-08-15T01:30:00.000Z',
      photos: [
        {
          id: 'photo-1',
          eventId: 'e1',
          localUri: 'file:///photo-1.jpg',
          position: 0,
          createdAt: '2026-08-15T01:30:00.000Z',
        },
        {
          id: 'photo-2',
          eventId: 'e1',
          localUri: 'file:///photo-2.jpg',
          position: 1,
          createdAt: '2026-08-15T01:31:00.000Z',
        },
      ],
    },
  ];
  const observations: ObservationWithPhotos[] = [
    {
      id: 'o1',
      patrolId: 'p1',
      protocol: 'quick_weather_v1',
      source: 'measured',
      observedAt: '2026-08-15T01:45:00.000Z',
      airTemperatureC: 28.5,
      relativeHumidityPct: 78,
      rainfallMm: 12.4,
      rainfallStartedAt: '2026-08-14T23:00:00.000Z',
      rainfallEndedAt: '2026-08-15T01:00:00.000Z',
      fireSign: 'none',
      deviceMethod: 'Kestrel 5500',
      createdAt: '2026-08-15T01:45:00.000Z',
      updatedAt: '2026-08-15T01:45:00.000Z',
      photos: [],
    },
  ];

  const payload = buildReportPayload(patrol, area, events, observations);

  expect(payload.fileName).toBe('ForestLog_2026-08-15_TK12_K3_L7.pdf');
  expect(payload.events[0]?.severity).toBe('Không áp dụng');
  expect(payload.events[0]?.photos).toEqual([
    { path: 'file:///photo-1.jpg' },
    { path: 'file:///photo-2.jpg' },
  ]);
  expect(payload.observations[0]).toMatchObject({
    source: 'Đo trực tiếp',
    airTemperature: '28.5 °C',
    relativeHumidity: '78%',
    rainfall: '12.4 mm',
  });
});
