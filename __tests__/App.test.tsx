/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {
  ActivePatrolScreen,
  BottomNavigation,
  HomeScreen,
  ReportsListScreen,
} from '../src/screens';
import { FieldPhotoSection } from '../src/screens/event/EventFormScreen';
import {
  createFieldMapPoints,
  createOfflineMapBounds,
  FieldMapScreen,
  mapBoundsContainPoint,
} from '../src/screens/map/FieldMapScreen';
import { formatDuration } from '../src/screens/utils';
import {
  countMapTiles,
  createPolygonBounds,
  downloadForestAreaMap,
  MAP_DOWNLOAD_MIN_ZOOM,
  MAP_PACK_TILE_BUDGET,
  selectOfflineMaxZoom,
} from '../src/device/offlineMap';

const mockGetAppState = jest.fn(async (key: string) =>
  key === 'walkthrough.complete.v1' ? 'true' : undefined,
);
const mockSetAppState = jest.fn(
  async (_key: string, _value: string) => undefined,
);
const mockRemoveAppState = jest.fn(async (_key: string) => undefined);

jest.mock('../src/data/appStateRepository', () => ({
  getAppState: (key: string) => mockGetAppState(key),
  removeAppState: (key: string) => mockRemoveAppState(key),
  setAppState: (key: string, value: string) => mockSetAppState(key, value),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (listener: (state: object) => void) => {
      listener({ isConnected: true, isInternetReachable: true });
      return jest.fn();
    },
  },
}));

beforeEach(() => {
  mockGetAppState.mockImplementation(async (key: string) =>
    key === 'walkthrough.complete.v1' ? 'true' : undefined,
  );
  mockSetAppState.mockClear();
  mockRemoveAppState.mockClear();
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View };
});

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactLibrary = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockMapComponent = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  }) => ReactLibrary.createElement(View, props, children);
  return {
    Camera: MockMapComponent,
    GeoJSONSource: MockMapComponent,
    Layer: MockMapComponent,
    Map: MockMapComponent,
    OfflineManager: {
      addListener: jest.fn(),
      createPack: jest.fn(),
      getPacks: jest.fn(async () => []),
      invalidatePack: jest.fn(),
      removeListener: jest.fn(),
      setTileCountLimit: jest.fn(),
    },
  };
});

jest.mock('react-native-file-access', () => ({
  Dirs: { DocumentDir: '/documents' },
  FileSystem: {
    cp: jest.fn(),
    exists: jest.fn(async () => false),
    ls: jest.fn(async () => []),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => ({
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
    transaction: jest.fn(
      async (callback: (transaction: unknown) => Promise<void>) =>
        callback({
          execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
        }),
    ),
  }),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});

test('shows the current online state on Home', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(renderer!.root.findByProps({ children: 'ONLINE' })).toBeTruthy();
});

test('shows the walkthrough once and persists completion', async () => {
  mockGetAppState.mockResolvedValue(undefined);
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const startButton = renderer!.root
    .findAllByProps({ accessibilityRole: 'button' })
    .find(
      button =>
        button.findAllByProps({ children: 'Bắt đầu sử dụng' }).length > 0,
    );
  expect(startButton).toBeDefined();

  await ReactTestRenderer.act(async () => startButton?.props.onPress());

  expect(mockSetAppState).toHaveBeenCalledWith(
    'walkthrough.complete.v1',
    'true',
  );
  expect(
    renderer!.root.findByProps({ children: 'Ghi nhận tuần tra rừng' }),
  ).toBeTruthy();
});

test('builds map points only from valid stored coordinates', () => {
  const points = createFieldMapPoints(
    [
      { id: 'event-1', latitude: 16.2, longitude: 108.2, gpsAccuracy: 8 },
      { id: 'event-invalid', latitude: 120, longitude: 108.2 },
    ],
    [{ id: 'observation-1', latitude: 16.21, longitude: 108.21 }],
    { latitude: 16.22, longitude: 108.22, accuracy: 5 },
  );

  expect(points.features.map(feature => feature.properties.kind)).toEqual([
    'event',
    'observation',
    'current',
  ]);
});

test('builds an offline map region around the selected GPS point', () => {
  const bounds = createOfflineMapBounds([108.2, 16.2]);

  expect(mapBoundsContainPoint(bounds, [108.2, 16.2])).toBe(true);
  expect(mapBoundsContainPoint(bounds, [108.5, 16.2])).toBe(false);
  expect(bounds[0]).toBeLessThan(108.2);
  expect(bounds[2]).toBeGreaterThan(108.2);
});

test('fits a polygon download to the OpenFreeMap zoom and tile budget', () => {
  const bounds = createPolygonBounds([
    { latitude: 16.2, longitude: 108.2 },
    { latitude: 16.24, longitude: 108.3 },
    { latitude: 16.18, longitude: 108.28 },
  ]);
  const maxZoom = selectOfflineMaxZoom(bounds);

  expect(bounds).toEqual([108.2, 16.18, 108.3, 16.24]);
  expect(maxZoom).toBe(14);
  expect(
    countMapTiles(bounds, MAP_DOWNLOAD_MIN_ZOOM, maxZoom),
  ).toBeLessThanOrEqual(MAP_PACK_TILE_BUDGET);
});

test('downloads the rectangle enclosing a saved forest area', async () => {
  const offlineManager = jest.requireMock(
    '@maplibre/maplibre-react-native',
  ).OfflineManager;
  const pack = {
    id: 'area-pack',
    bounds: [108.2, 16.18, 108.3, 16.24],
    metadata: { forestLogFieldMap: true, areaId: 'area-1' },
    status: jest.fn(async () => ({ percentage: 100, state: 'complete' })),
  };
  offlineManager.getPacks.mockResolvedValueOnce([]);
  offlineManager.createPack.mockImplementationOnce(
    async (
      _options: object,
      onProgress: (value: object, status: object) => void,
    ) => {
      onProgress(pack, { percentage: 100, state: 'complete' });
      return pack;
    },
  );

  await downloadForestAreaMap(
    {
      id: 'area-1',
      subZone: '12',
      compartment: '3',
      plot: '7',
      boundary: [
        { latitude: 16.2, longitude: 108.2 },
        { latitude: 16.24, longitude: 108.3 },
        { latitude: 16.18, longitude: 108.28 },
      ],
    },
    jest.fn(),
  );

  expect(offlineManager.createPack).toHaveBeenCalledWith(
    expect.objectContaining({
      bounds: [108.2, 16.18, 108.3, 16.24],
      maxZoom: 14,
      metadata: expect.objectContaining({ areaId: 'area-1' }),
    }),
    expect.any(Function),
    expect.any(Function),
  );
});

test('keeps the downloaded map action available for refreshing', async () => {
  const offlineManager = jest.requireMock(
    '@maplibre/maplibre-react-native',
  ).OfflineManager;
  const pack = {
    id: 'field-map-pack',
    bounds: [108, 16, 109, 17],
    metadata: { forestLogFieldMap: true },
    status: jest.fn(async () => ({ percentage: 100, state: 'complete' })),
  };
  offlineManager.getPacks.mockResolvedValueOnce([pack]);
  const onLocate = jest.fn(async () => ({
    latitude: 16.2,
    longitude: 108.2,
    accuracy: 5,
  }));
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <FieldMapScreen
        area={{ id: 'area-1', subZone: '12', compartment: '3', plot: '7' }}
        events={[]}
        observations={[]}
        onBack={jest.fn()}
        onLocate={onLocate}
      />,
    );
  });

  const refreshButton = renderer!.root.findByProps({
    accessibilityLabel: 'Cập nhật bản đồ offline',
  });
  expect(refreshButton.props.disabled).toBe(false);
  await ReactTestRenderer.act(async () => refreshButton.props.onPress());
  expect(offlineManager.invalidatePack).toHaveBeenCalledWith(pack.id);
});

test('formats long active patrol durations compactly', () => {
  expect(
    formatDuration(
      '2026-08-15T08:35:00.000Z',
      '2026-08-16T03:01:00.000Z',
      true,
    ),
  ).toBe('18g 26p');
});

test('formats multi-day patrol durations without an ever-growing hour value', () => {
  expect(
    formatDuration(
      '2026-08-01T00:00:00.000Z',
      '2026-09-15T00:00:00.000Z',
      true,
    ),
  ).toBe('45n 0g');
});

test('keeps long active patrol summary fields on intentional rows', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ActivePatrolScreen
        area={{
          id: 'area-1',
          subZone: '112 rất dài',
          compartment: 'Khoảnh thử nghiệm 3',
          plot: 'Lô 7',
        }}
        events={[]}
        observations={[]}
        patrol={{
          id: 'patrol-1',
          rangerName: 'Nguyễn Văn An Với Tên Hiển Thị Rất Dài',
          startedAt: '2026-08-01T00:00:00.000Z',
          forestAreaId: 'area-1',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        }}
        onComplete={jest.fn()}
        onHome={jest.fn()}
        onOpenEvent={jest.fn()}
        onOpenMap={jest.fn()}
        onOpenObservation={jest.fn()}
        onRecordEvent={jest.fn()}
        onRecordObservation={jest.fn()}
      />,
    );
  });

  const ranger = renderer!.root.findByProps({
    children: 'Nguyễn Văn An Với Tên Hiển Thị Rất Dài',
  });
  const start = renderer!.root
    .findAllByType(Text)
    .find(node => String(node.props.children).startsWith('Bắt đầu '));
  const weather = renderer!.root.findByProps({ children: 'Chưa ghi nhận' });

  expect(ranger.props.numberOfLines).toBe(1);
  expect(start?.props.numberOfLines).toBe(1);
  expect(weather.props.numberOfLines).toBe(1);
  expect(start?.parent).not.toBe(weather.parent);
});

test('opens patrol history from Home', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const historyButton = renderer!.root
    .findAllByProps({ accessibilityRole: 'button' })
    .find(
      button =>
        button.findAllByProps({ children: 'Xem lịch sử tuần tra' }).length > 0,
    );
  await ReactTestRenderer.act(async () => {
    historyButton?.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ children: 'Lịch sử tuần tra' }),
  ).toBeTruthy();
});

test('opens report management from the bottom navigation', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const reportsTab = renderer!.root.findByProps({
    accessibilityLabel: 'Báo cáo',
    accessibilityRole: 'tab',
  });
  await ReactTestRenderer.act(async () => {
    reportsTab.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ children: 'Chưa có báo cáo' }),
  ).toBeTruthy();
});

test('opens the active patrol from Home recovery', async () => {
  const onContinue = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <HomeScreen
        activeArea={{
          id: 'area-1',
          subZone: '112',
          compartment: '3',
          plot: '7',
        }}
        activePatrol={{
          id: 'patrol-1',
          rangerName: 'Nguyễn Văn A',
          startedAt: '2026-08-22T08:35:00.000Z',
          forestAreaId: 'area-1',
          status: 'active',
          createdAt: '2026-08-22T08:35:00.000Z',
          updatedAt: '2026-08-22T08:35:00.000Z',
        }}
        completedPatrols={[]}
        onContinue={onContinue}
        onHistory={jest.fn()}
        onStart={jest.fn()}
        onTabSelect={jest.fn()}
      />,
    );
  });

  const continueButton = renderer!.root
    .findAllByProps({ accessibilityRole: 'button' })
    .find(
      button =>
        button.findAllByProps({ children: 'Tiếp tục tuần tra' }).length > 0,
    );

  expect(continueButton).toBeDefined();
  ReactTestRenderer.act(() => continueButton?.props.onPress());
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test('shows controls for every photo in a draft', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <FieldPhotoSection
        disabled={false}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        onView={jest.fn()}
        photos={[
          {
            id: 'photo-1',
            localUri: 'file:///photo-1.jpg',
            position: 0,
            createdAt: '2026-08-22T08:35:00.000Z',
          },
          {
            id: 'photo-2',
            localUri: 'file:///photo-2.jpg',
            position: 1,
            createdAt: '2026-08-22T08:36:00.000Z',
          },
        ]}
      />,
    );
  });

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Xóa ảnh 2' }).props
      .hitSlop,
  ).toBe(8);
});

test('marks the active bottom destination with the design accent', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <BottomNavigation active="reports" onSelect={jest.fn()} />,
    );
  });

  const activeTab = renderer!.root.findByProps({
    accessibilityLabel: 'Báo cáo',
  });
  expect(activeTab.props.accessibilityState).toEqual({ selected: true });
  expect(activeTab.props.style({ pressed: false })).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ borderTopColor: '#185C3A' }),
    ]),
  );
});

test('marks the active tablet destination on the navigation rail', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <BottomNavigation active="history" onSelect={jest.fn()} variant="rail" />,
    );
  });

  const activeTab = renderer!.root.findByProps({
    accessibilityLabel: 'Lịch sử',
  });
  expect(activeTab.props.style({ pressed: false })).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ borderLeftColor: '#185C3A' }),
      expect.objectContaining({ backgroundColor: '#E7EEE8' }),
    ]),
  );
});

test('separates pending and generated reports', async () => {
  const patrol = {
    rangerName: 'Nguyễn Văn A',
    startedAt: '2026-08-22T08:35:00.000Z',
    completedAt: '2026-08-22T10:35:00.000Z',
    forestAreaId: 'area-1',
    status: 'completed' as const,
    createdAt: '2026-08-22T08:35:00.000Z',
    updatedAt: '2026-08-22T10:35:00.000Z',
    eventCount: 1,
    observationCount: 1,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ReportsListScreen
        areas={[{ id: 'area-1', subZone: '112', compartment: '3', plot: '7' }]}
        generatedPatrolId="patrol-ready"
        onBack={jest.fn()}
        onOpenReport={jest.fn()}
        onTabSelect={jest.fn()}
        patrols={[
          { ...patrol, id: 'patrol-pending' },
          { ...patrol, id: 'patrol-ready' },
        ]}
      />,
    );
  });

  expect(
    renderer!.root.findByProps({ children: 'Cần tạo báo cáo' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ children: 'Đã tạo trên thiết bị' }),
  ).toBeTruthy();
});
