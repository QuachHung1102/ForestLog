import {
  formatDateTime,
  parseFieldDateTime,
  formatForestArea,
  parseCompletePatrolFormDraft,
  parsePatrolFormDraft,
  validateCompletePatrolInput,
  validateForestAreaInput,
  validateEventInput,
  validateObservationInput,
  validatePatrolInput,
} from '../src/domain';

test('validates a forest-area polygon entered by vertex', () => {
  expect(
    validateForestAreaInput({
      subZone: '12',
      compartment: '3',
      plot: '7',
      boundary: [
        { latitude: 16.2, longitude: 108.2 },
        { latitude: 16.3, longitude: 108.3 },
        { latitude: 16.2, longitude: 108.3 },
        { latitude: 16.3, longitude: 108.2 },
      ],
    }),
  ).toBe('Các cạnh đa giác không được cắt nhau.');
  expect(
    validateForestAreaInput({
      subZone: '12',
      compartment: '3',
      plot: '7',
      boundary: [
        { latitude: 16.2, longitude: 108.2 },
        { latitude: 16.2, longitude: 108.3 },
        { latitude: 16.3, longitude: 108.3 },
      ],
    }),
  ).toBeNull();
});

test('validates the minimum patrol input', () => {
  expect(validatePatrolInput({ rangerName: '', forestAreaId: '' })).toBe(
    'Vui lòng nhập tên người đi tuần.',
  );
  expect(
    validatePatrolInput({ rangerName: 'Nguyễn Văn A', forestAreaId: '' }),
  ).toBe('Vui lòng chọn đầy đủ Tiểu khu, Khoảnh và Lô.');
  expect(
    validatePatrolInput({
      rangerName: 'Nguyễn Văn A',
      forestAreaId: 'TK12-K3-L7',
    }),
  ).toBeNull();
  expect(
    formatForestArea({
      id: 'TK12-K3-L7',
      subZone: '12',
      compartment: '3',
      plot: '7',
    }),
  ).toBe('Tiểu khu 12 · Khoảnh 3 · Lô 7');
});

test('ignores corrupt restored form state', () => {
  expect(parsePatrolFormDraft('{broken')).toBeUndefined();
  expect(parsePatrolFormDraft('{"rangerName":42}')).toBeUndefined();
  expect(parseCompletePatrolFormDraft('{"patrolId":"p1"}')).toBeUndefined();
  expect(
    parseCompletePatrolFormDraft(
      '{"patrolId":"p1","distance":"6,5","confirming":false}',
    ),
  ).toEqual({ patrolId: 'p1', distance: '6,5', confirming: false });
});

test('keeps no-violation events free of severity', () => {
  expect(validateEventInput({ photos: [] })).toBe(
    'Vui lòng chọn loại sự kiện.',
  );
  expect(validateEventInput({ type: 'illegal_logging', photos: [] })).toBe(
    'Vui lòng chọn mức độ.',
  );
  expect(
    validateEventInput({ type: 'no_violation', severity: 'high', photos: [] }),
  ).toBe('Không phát hiện vi phạm không áp dụng mức độ.');
  expect(validateEventInput({ type: 'no_violation', photos: [] })).toBeNull();
  expect(
    validateEventInput({
      type: 'illegal_logging',
      severity: 'high',
      note: 'x'.repeat(2001),
      photos: [],
    }),
  ).not.toBeNull();
});

test('formats timestamps as a Vietnamese field ledger value', () => {
  const localTime = new Date(2026, 7, 15, 8, 35).toISOString();
  expect(formatDateTime(localTime)).toBe('08:35 · 15/08/2026');
});

test('validates patrol completion distance', () => {
  expect(
    validateCompletePatrolInput({
      estimatedDistanceKm: Number.NaN,
      emergencyReportRequired: false,
    }),
  ).toBe('Vui lòng nhập tổng quãng đường.');
  expect(
    validateCompletePatrolInput({
      estimatedDistanceKm: -1,
      emergencyReportRequired: false,
    }),
  ).toBe('Tổng quãng đường không thể là số âm.');
  expect(
    validateCompletePatrolInput({
      estimatedDistanceKm: 0,
      emergencyReportRequired: false,
    }),
  ).toBeNull();
});

test('validates a quick weather observation and its rainfall interval', () => {
  const observedAt = new Date(2026, 7, 15, 9, 45).toISOString();
  const rainfallStartedAt = new Date(2026, 7, 15, 7).toISOString();
  const rainfallEndedAt = new Date(2026, 7, 15, 9).toISOString();
  expect(parseFieldDateTime('15/08/2026 09:45')).toBe(observedAt);
  expect(parseFieldDateTime('31/02/2026 09:45')).toBeUndefined();
  expect(
    validateObservationInput({
      source: 'measured',
      observedAt,
      relativeHumidityPct: 101,
      fireSign: 'none',
      deviceMethod: 'Kestrel 5500',
      photos: [],
    }),
  ).toBe('Độ ẩm phải nằm trong khoảng 0–100%.');
  expect(
    validateObservationInput({
      source: 'station_reading',
      observedAt,
      rainfallMm: 12.4,
      rainfallStartedAt,
      rainfallEndedAt,
      stationCode: 'TRAM-07',
      fireSign: 'none',
      photos: [],
    }),
  ).toBeNull();
});
