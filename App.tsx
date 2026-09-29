import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, LogBox, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type {
  CreateForestAreaInput,
  CreatePatrolInput,
  CompletePatrolInput,
  CompletePatrolFormDraft,
  EventDraft,
  ForestArea,
  ObservationDraft,
  ObservationWithPhotos,
  Patrol,
  PatrolEventWithPhotos,
  PatrolFormDraft,
  PatrolSummary,
  SaveEventInput,
  SaveObservationInput,
} from './src/domain';
import {
  formatFieldDateTime,
  parseCompletePatrolFormDraft,
  parsePatrolFormDraft,
} from './src/domain';
import {
  completePatrol,
  createForestArea,
  createPatrol,
  getActivePatrol,
  getCompletedPatrols,
  getForestAreas,
} from './src/data/patrolRepository';
import {
  getAppState,
  removeAppState,
  setAppState,
} from './src/data/appStateRepository';
import {
  deletePatrolEvent,
  getEventDraft,
  getPatrolPhotoUris,
  getPatrolEvents,
  saveEventDraft,
  savePatrolEvent,
} from './src/data/eventRepository';
import {
  deletePatrolObservation,
  getObservationDraft,
  getPatrolObservations,
  saveObservationDraft,
  savePatrolObservation,
} from './src/data/observationRepository';
import { captureCurrentLocation } from './src/device/location';
import {
  choosePhotos,
  cleanupPatrolMedia,
  takePhoto,
} from './src/device/media';
import {
  generateReport,
  type GeneratedReport,
  ReportGenerationError,
  shareReport,
} from './src/device/report';
import {
  ActivePatrolScreen,
  BottomNavigation,
  CompletePatrolScreen,
  CreateForestAreaScreen,
  CreatePatrolScreen,
  EventDetailScreen,
  EventFormScreen,
  FieldMapScreen,
  HistoryScreen,
  HomeScreen,
  ObservationDetailScreen,
  ObservationFormScreen,
  PatrolDetailScreen,
  PrimaryButton,
  ReportScreen,
  ReportsListScreen,
  SettingsScreen,
  WalkthroughScreen,
  type BottomTab,
  styles,
  useTabletLayout,
} from './src/screens';

type Screen =
  | 'home'
  | 'history'
  | 'create'
  | 'createArea'
  | 'active'
  | 'fieldMap'
  | 'complete'
  | 'eventForm'
  | 'eventDetail'
  | 'observationForm'
  | 'observationDetail'
  | 'patrolDetail'
  | 'report'
  | 'reports'
  | 'settings';

const SCREEN_STATE_KEY = 'navigation.screen';
const PATROL_DRAFT_KEY = 'patrol.createDraft';
const SELECTED_PATROL_KEY = 'navigation.selectedPatrolId';
const COMPLETE_PATROL_DRAFT_KEY = 'patrol.completeDraft';
const WALKTHROUGH_COMPLETE_KEY = 'walkthrough.complete.v1';
const TABLET_CONTENT_MAX_WIDTH = 900;
const tabletContentStyle = { maxWidth: TABLET_CONTENT_MAX_WIDTH } as const;

if (__DEV__) LogBox.ignoreLogs(['Invalid geometry in line layer']);

function persistAppState(key: string, value: string): void {
  setAppState(key, value).catch(persistenceError => {
    if (__DEV__) {
      console.error('ForestLog state persistence failed', persistenceError);
    }
  });
}

function removePersistedAppState(key: string): void {
  removeAppState(key).catch(persistenceError => {
    if (__DEV__) {
      console.error('ForestLog state cleanup failed', persistenceError);
    }
  });
}

async function cleanupMediaForPatrol(patrolId: string): Promise<void> {
  try {
    await cleanupPatrolMedia(patrolId, await getPatrolPhotoUris(patrolId));
  } catch (cleanupError) {
    if (__DEV__) {
      console.error('ForestLog media cleanup failed', cleanupError);
    }
  }
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const tablet = useTabletLayout();
  const [screen, setScreen] = useState<Screen>('home');
  const [areas, setAreas] = useState<ForestArea[]>([]);
  const [activePatrol, setActivePatrol] = useState<Patrol>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [walkthroughComplete, setWalkthroughComplete] = useState(false);
  const [walkthroughSaveError, setWalkthroughSaveError] = useState(false);
  const [patrolDraft, setPatrolDraft] = useState<PatrolFormDraft>();
  const [completedPatrols, setCompletedPatrols] = useState<PatrolSummary[]>([]);
  const [selectedPatrol, setSelectedPatrol] = useState<PatrolSummary>();
  const [events, setEvents] = useState<PatrolEventWithPhotos[]>([]);
  const [observations, setObservations] = useState<ObservationWithPhotos[]>([]);
  const [eventDraft, setEventDraft] = useState<EventDraft>();
  const eventDraftRef = useRef<EventDraft | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<PatrolEventWithPhotos>();
  const [draftSaveError, setDraftSaveError] = useState(false);
  const [observationDraft, setObservationDraft] = useState<ObservationDraft>();
  const observationDraftRef = useRef<ObservationDraft | undefined>(undefined);
  const [selectedObservation, setSelectedObservation] =
    useState<ObservationWithPhotos>();
  const [observationDraftSaveError, setObservationDraftSaveError] =
    useState(false);
  const [completeDraft, setCompleteDraft] = useState<CompletePatrolFormDraft>();
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoadError, setEventsLoadError] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'generating' | 'ready' | 'storageError' | 'error'
  >('idle');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport>();
  const [reportError, setReportError] = useState<string>();
  const [reportPatrolId, setReportPatrolId] = useState<string>();
  const [reportBackScreen, setReportBackScreen] = useState<
    'patrolDetail' | 'reports'
  >('patrolDetail');

  const navigate = useCallback((nextScreen: Screen) => {
    setScreen(nextScreen);
    persistAppState(SCREEN_STATE_KEY, nextScreen);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [
        storedAreas,
        storedPatrol,
        storedCompletedPatrols,
        storedScreen,
        storedDraft,
        storedSelectedPatrolId,
        storedCompleteDraft,
        storedWalkthroughComplete,
      ] = await Promise.all([
        getForestAreas(),
        getActivePatrol(),
        getCompletedPatrols(),
        getAppState(SCREEN_STATE_KEY),
        getAppState(PATROL_DRAFT_KEY),
        getAppState(SELECTED_PATROL_KEY),
        getAppState(COMPLETE_PATROL_DRAFT_KEY),
        getAppState(WALKTHROUGH_COMPLETE_KEY),
      ]);
      setWalkthroughComplete(storedWalkthroughComplete === 'true');
      setAreas(storedAreas);
      setActivePatrol(storedPatrol);
      setCompletedPatrols(storedCompletedPatrols);
      setPatrolDraft(parsePatrolFormDraft(storedDraft));
      const parsedCompleteDraft =
        parseCompletePatrolFormDraft(storedCompleteDraft);
      if (parsedCompleteDraft?.patrolId === storedPatrol?.id) {
        setCompleteDraft(parsedCompleteDraft);
      }
      const storedSelectedPatrol = storedCompletedPatrols.find(
        patrol => patrol.id === storedSelectedPatrolId,
      );
      const restoredPatrol = storedPatrol ?? storedSelectedPatrol;
      if (restoredPatrol) {
        const [storedEvents, storedObservations] = await Promise.all([
          getPatrolEvents(restoredPatrol.id),
          getPatrolObservations(restoredPatrol.id),
        ]);
        setEvents(storedEvents);
        setObservations(storedObservations);
        cleanupMediaForPatrol(restoredPatrol.id);
      }
      const [storedEventDraft, storedObservationDraft] = storedPatrol
        ? await Promise.all([
            getEventDraft(storedPatrol.id),
            getObservationDraft(storedPatrol.id),
          ])
        : [undefined, undefined];
      setEventDraft(storedEventDraft);
      eventDraftRef.current = storedEventDraft;
      setObservationDraft(storedObservationDraft);
      observationDraftRef.current = storedObservationDraft;
      if (storedSelectedPatrol) {
        setSelectedPatrol(storedSelectedPatrol);
      }
      if (
        storedScreen === 'create' ||
        storedScreen === 'createArea' ||
        storedScreen === 'history' ||
        storedScreen === 'reports' ||
        storedScreen === 'settings' ||
        ((storedScreen === 'active' ||
          storedScreen === 'fieldMap' ||
          storedScreen === 'complete') &&
          storedPatrol) ||
        (storedScreen === 'eventForm' && storedPatrol && storedEventDraft) ||
        (storedScreen === 'observationForm' &&
          storedPatrol &&
          storedObservationDraft) ||
        (storedScreen === 'patrolDetail' && storedSelectedPatrol)
      ) {
        setScreen(storedScreen);
      }
    } catch (loadError) {
      if (__DEV__) {
        console.error('ForestLog database initialization failed', loadError);
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (screen === 'home') {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (
          screen === 'complete' ||
          screen === 'fieldMap' ||
          screen === 'eventForm' ||
          screen === 'observationForm'
        ) {
          navigate('active');
        } else if (screen === 'createArea') {
          navigate('create');
        } else if (screen === 'eventDetail' || screen === 'observationDetail') {
          navigate(activePatrol ? 'active' : 'patrolDetail');
        } else if (screen === 'report') {
          navigate(reportBackScreen);
        } else if (screen === 'patrolDetail') {
          navigate('history');
        } else {
          navigate('home');
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [activePatrol, navigate, reportBackScreen, screen]);

  const startPatrol = async (input: CreatePatrolInput) => {
    const patrol = await createPatrol(input);
    removePersistedAppState(PATROL_DRAFT_KEY);
    setPatrolDraft(undefined);
    setActivePatrol(patrol);
    setEvents([]);
    setObservations([]);
    setEventDraft(undefined);
    eventDraftRef.current = undefined;
    setObservationDraft(undefined);
    observationDraftRef.current = undefined;
    navigate('active');
  };

  const saveForestArea = async (
    input: CreateForestAreaInput,
  ): Promise<ForestArea> => {
    const area = await createForestArea(input);
    setAreas(current => [...current, area]);
    return area;
  };

  const finishWalkthrough = async () => {
    setWalkthroughSaveError(false);
    try {
      await setAppState(WALKTHROUGH_COMPLETE_KEY, 'true');
      setWalkthroughComplete(true);
    } catch (saveError) {
      if (__DEV__) {
        console.error('ForestLog walkthrough persistence failed', saveError);
      }
      setWalkthroughSaveError(true);
    }
  };

  const savePatrolDraft = (draft: PatrolFormDraft) => {
    setPatrolDraft(draft);
    persistAppState(PATROL_DRAFT_KEY, JSON.stringify(draft));
  };

  const finishPatrol = async (input: CompletePatrolInput) => {
    if (!activePatrol) {
      return;
    }
    const completed = await completePatrol(activePatrol.id, input);
    const summary = {
      ...completed,
      eventCount: events.length,
      observationCount: observations.length,
    };
    setActivePatrol(undefined);
    setCompletedPatrols(current => [summary, ...current]);
    setSelectedPatrol(summary);
    setCompleteDraft(undefined);
    removePersistedAppState(COMPLETE_PATROL_DRAFT_KEY);
    persistAppState(SELECTED_PATROL_KEY, summary.id);
    navigate('patrolDetail');
  };

  const openPatrol = (patrol: PatrolSummary) => {
    setSelectedPatrol(patrol);
    persistAppState(SELECTED_PATROL_KEY, patrol.id);
    setEvents([]);
    setObservations([]);
    setEventsLoading(true);
    setEventsLoadError(false);
    navigate('patrolDetail');
    Promise.all([getPatrolEvents(patrol.id), getPatrolObservations(patrol.id)])
      .then(([storedEvents, storedObservations]) => {
        setEvents(storedEvents);
        setObservations(storedObservations);
      })
      .catch(loadError => {
        setEventsLoadError(true);
        if (__DEV__) {
          console.error('ForestLog event loading failed', loadError);
        }
      })
      .finally(() => {
        setEventsLoading(false);
      });
  };

  const runReportGeneration = async (
    patrol: PatrolSummary,
    area: ForestArea,
    reportEvents: PatrolEventWithPhotos[],
    reportObservations: ObservationWithPhotos[],
  ) => {
    setReportPatrolId(patrol.id);
    setReportStatus('generating');
    setReportError(undefined);
    setGeneratedReport(undefined);
    try {
      const report = await generateReport(
        patrol,
        area,
        reportEvents,
        reportObservations,
      );
      setGeneratedReport(report);
      setReportStatus('ready');
    } catch (generationError) {
      setGeneratedReport(undefined);
      setReportError(
        generationError instanceof Error
          ? generationError.message
          : 'Không thể tạo báo cáo PDF.',
      );
      setReportStatus(
        generationError instanceof ReportGenerationError &&
          generationError.code === 'INSUFFICIENT_STORAGE'
          ? 'storageError'
          : 'error',
      );
    }
  };

  const generateSelectedReport = async () => {
    if (!selectedPatrol) return;
    const area = areas.find(item => item.id === selectedPatrol.forestAreaId);
    if (!area) return;
    await runReportGeneration(selectedPatrol, area, events, observations);
  };

  const openReportScreen = () => {
    setReportBackScreen('patrolDetail');
    navigate('report');
    if (
      (reportStatus !== 'generating' && reportStatus !== 'ready') ||
      reportPatrolId !== selectedPatrol?.id
    ) {
      generateSelectedReport();
    }
  };

  const openReportFromList = async (patrol: PatrolSummary) => {
    const area = areas.find(item => item.id === patrol.forestAreaId);
    if (!area) return;
    const alreadyReady =
      reportPatrolId === patrol.id &&
      reportStatus === 'ready' &&
      Boolean(generatedReport);
    setSelectedPatrol(patrol);
    persistAppState(SELECTED_PATROL_KEY, patrol.id);
    setEvents([]);
    setObservations([]);
    setReportError(undefined);
    setReportPatrolId(patrol.id);
    setReportStatus(alreadyReady ? 'ready' : 'generating');
    setReportBackScreen('reports');
    navigate('report');
    try {
      const [storedEvents, storedObservations] = await Promise.all([
        getPatrolEvents(patrol.id),
        getPatrolObservations(patrol.id),
      ]);
      setEvents(storedEvents);
      setObservations(storedObservations);
      if (!alreadyReady) {
        await runReportGeneration(
          patrol,
          area,
          storedEvents,
          storedObservations,
        );
      }
    } catch (loadError) {
      setReportError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể mở dữ liệu để tạo báo cáo.',
      );
      setReportStatus('error');
    }
  };

  const openCompletePatrol = () => {
    if (!activePatrol || eventDraft || observationDraft) {
      return;
    }
    const draft =
      completeDraft?.patrolId === activePatrol.id
        ? completeDraft
        : {
            patrolId: activePatrol.id,
            distance: '',
            confirming: false,
          };
    setCompleteDraft(draft);
    persistAppState(COMPLETE_PATROL_DRAFT_KEY, JSON.stringify(draft));
    navigate('complete');
  };

  const saveCompleteDraft = (draft: CompletePatrolFormDraft) => {
    setCompleteDraft(draft);
    persistAppState(COMPLETE_PATROL_DRAFT_KEY, JSON.stringify(draft));
  };

  const persistEventDraft = (draft: EventDraft) => {
    setEventDraft(draft);
    eventDraftRef.current = draft;
    setDraftSaveError(false);
    saveEventDraft(draft).catch(saveError => {
      if (__DEV__) {
        console.error('ForestLog event draft save failed', saveError);
      }
      setDraftSaveError(true);
    });
  };

  const persistEventDraftNow = async (draft: EventDraft) => {
    setEventDraft(draft);
    eventDraftRef.current = draft;
    setDraftSaveError(false);
    try {
      await saveEventDraft(draft);
    } catch (saveError) {
      setDraftSaveError(true);
      throw saveError;
    }
  };

  const openEventForm = () => {
    const draft: EventDraft = eventDraft ?? {
      patrolId: activePatrol?.id ?? '',
      note: '',
      gpsStatus: 'idle',
      photos: [],
      updatedAt: new Date().toISOString(),
    };
    persistEventDraft(draft);
    navigate('eventForm');
  };

  const editEvent = (event: PatrolEventWithPhotos) => {
    if (eventDraft?.editingEventId === event.id) {
      navigate('eventForm');
      return;
    }
    if (eventDraft) {
      return;
    }
    const draft: EventDraft = {
      patrolId: event.patrolId,
      editingEventId: event.id,
      type: event.type,
      severity: event.severity,
      note: event.note ?? '',
      latitude: event.latitude,
      longitude: event.longitude,
      gpsAccuracy: event.gpsAccuracy,
      gpsStatus:
        event.latitude === undefined || event.longitude === undefined
          ? 'unavailable'
          : 'acquired',
      photos: event.photos,
      updatedAt: new Date().toISOString(),
    };
    persistEventDraft(draft);
    navigate('eventForm');
  };

  const saveEvent = async (input: SaveEventInput) => {
    if (!activePatrol) {
      return;
    }
    await savePatrolEvent(activePatrol.id, input, eventDraft?.editingEventId);
    setEventDraft(undefined);
    eventDraftRef.current = undefined;
    setDraftSaveError(false);
    try {
      setEvents(await getPatrolEvents(activePatrol.id));
    } catch (loadError) {
      if (__DEV__) {
        console.error('ForestLog event reload failed', loadError);
      }
      setError(true);
    }
    await cleanupMediaForPatrol(activePatrol.id);
    navigate('active');
  };

  const addEventPhotos = async (source: 'camera' | 'library') => {
    if (!activePatrol || !eventDraft) {
      return;
    }
    const added = await (source === 'camera'
      ? takePhoto(activePatrol.id)
      : choosePhotos(activePatrol.id));
    if (added.length === 0) {
      return;
    }
    await persistEventDraftNow({
      ...eventDraft,
      photos: [...eventDraft.photos, ...added].map((photo, position) => ({
        ...photo,
        position,
      })),
      updatedAt: new Date().toISOString(),
    });
  };

  const removeEventPhoto = async (photoId: string) => {
    if (!activePatrol || !eventDraft) {
      return;
    }
    await persistEventDraftNow({
      ...eventDraft,
      photos: eventDraft.photos
        .filter(photo => photo.id !== photoId)
        .map((photo, position) => ({ ...photo, position })),
      updatedAt: new Date().toISOString(),
    });
    await cleanupMediaForPatrol(activePatrol.id);
  };

  const acquireEventLocation = async () => {
    if (!eventDraft) {
      return;
    }
    const acquiring = {
      ...eventDraft,
      gpsStatus: 'acquiring' as const,
      updatedAt: new Date().toISOString(),
    };
    await persistEventDraftNow(acquiring);
    try {
      const location = await captureCurrentLocation();
      const current = eventDraftRef.current ?? acquiring;
      await persistEventDraftNow({
        ...current,
        latitude: location.latitude,
        longitude: location.longitude,
        gpsAccuracy: location.accuracy,
        gpsStatus: 'acquired',
        updatedAt: new Date().toISOString(),
      });
    } catch (locationError) {
      const current = eventDraftRef.current ?? acquiring;
      await persistEventDraftNow({
        ...current,
        latitude: undefined,
        longitude: undefined,
        gpsAccuracy: undefined,
        gpsStatus: 'unavailable',
        updatedAt: new Date().toISOString(),
      });
      throw locationError;
    }
  };

  const openEvent = (event: PatrolEventWithPhotos) => {
    setSelectedEvent(event);
    navigate('eventDetail');
  };

  const deleteEvent = async (event: PatrolEventWithPhotos) => {
    await deletePatrolEvent(event.patrolId, event.id);
    setEvents(current => current.filter(item => item.id !== event.id));
    setSelectedEvent(undefined);
    await cleanupMediaForPatrol(event.patrolId);
    navigate('active');
  };

  const persistObservationDraft = (draft: ObservationDraft) => {
    setObservationDraft(draft);
    observationDraftRef.current = draft;
    setObservationDraftSaveError(false);
    saveObservationDraft(draft).catch(saveError => {
      if (__DEV__)
        console.error('ForestLog observation draft save failed', saveError);
      setObservationDraftSaveError(true);
    });
  };

  const persistObservationDraftNow = async (draft: ObservationDraft) => {
    setObservationDraft(draft);
    observationDraftRef.current = draft;
    setObservationDraftSaveError(false);
    try {
      await saveObservationDraft(draft);
    } catch (saveError) {
      setObservationDraftSaveError(true);
      throw saveError;
    }
  };

  const openObservationForm = () => {
    const now = new Date().toISOString();
    const draft: ObservationDraft = observationDraft ?? {
      patrolId: activePatrol?.id ?? '',
      observedAt: formatFieldDateTime(now),
      airTemperature: '',
      relativeHumidity: '',
      rainfall: '',
      rainfallStartedAt: '',
      rainfallEndedAt: '',
      stationCode: '',
      fireSign: 'none',
      deviceMethod: '',
      calibrationCheckedAt: '',
      note: '',
      gpsStatus: 'idle',
      photos: [],
      updatedAt: now,
    };
    persistObservationDraft(draft);
    navigate('observationForm');
  };

  const editObservation = (observation: ObservationWithPhotos) => {
    if (observationDraft?.editingObservationId === observation.id) {
      navigate('observationForm');
      return;
    }
    if (observationDraft) return;
    const draft: ObservationDraft = {
      patrolId: observation.patrolId,
      editingObservationId: observation.id,
      source: observation.source,
      observedAt: formatFieldDateTime(observation.observedAt),
      airTemperature: observation.airTemperatureC?.toString() ?? '',
      relativeHumidity: observation.relativeHumidityPct?.toString() ?? '',
      weather: observation.weather,
      rainfall: observation.rainfallMm?.toString() ?? '',
      rainfallStartedAt: observation.rainfallStartedAt
        ? formatFieldDateTime(observation.rainfallStartedAt)
        : '',
      rainfallEndedAt: observation.rainfallEndedAt
        ? formatFieldDateTime(observation.rainfallEndedAt)
        : '',
      stationCode: observation.stationCode ?? '',
      fireSign: observation.fireSign,
      deviceMethod: observation.deviceMethod ?? '',
      calibrationCheckedAt: observation.calibrationCheckedAt ?? '',
      note: observation.note ?? '',
      latitude: observation.latitude,
      longitude: observation.longitude,
      gpsAccuracy: observation.gpsAccuracy,
      gpsStatus:
        observation.latitude === undefined ||
        observation.longitude === undefined
          ? 'unavailable'
          : 'acquired',
      photos: observation.photos,
      updatedAt: new Date().toISOString(),
    };
    persistObservationDraft(draft);
    navigate('observationForm');
  };

  const saveObservation = async (input: SaveObservationInput) => {
    if (!activePatrol) return;
    await savePatrolObservation(
      activePatrol.id,
      input,
      observationDraft?.editingObservationId,
    );
    setObservationDraft(undefined);
    observationDraftRef.current = undefined;
    setObservationDraftSaveError(false);
    try {
      setObservations(await getPatrolObservations(activePatrol.id));
    } catch (loadError) {
      if (__DEV__)
        console.error('ForestLog observation reload failed', loadError);
      setError(true);
    }
    await cleanupMediaForPatrol(activePatrol.id);
    navigate('active');
  };

  const addObservationPhotos = async (source: 'camera' | 'library') => {
    if (!activePatrol || !observationDraft) return;
    const added = await (source === 'camera'
      ? takePhoto(activePatrol.id)
      : choosePhotos(activePatrol.id));
    if (added.length === 0) return;
    await persistObservationDraftNow({
      ...observationDraft,
      photos: [...observationDraft.photos, ...added].map((photo, position) => ({
        ...photo,
        position,
      })),
      updatedAt: new Date().toISOString(),
    });
  };

  const removeObservationPhoto = async (photoId: string) => {
    if (!activePatrol || !observationDraft) return;
    await persistObservationDraftNow({
      ...observationDraft,
      photos: observationDraft.photos
        .filter(photo => photo.id !== photoId)
        .map((photo, position) => ({ ...photo, position })),
      updatedAt: new Date().toISOString(),
    });
    await cleanupMediaForPatrol(activePatrol.id);
  };

  const acquireObservationLocation = async () => {
    if (!observationDraft) return;
    const acquiring = {
      ...observationDraft,
      gpsStatus: 'acquiring' as const,
      updatedAt: new Date().toISOString(),
    };
    await persistObservationDraftNow(acquiring);
    try {
      const location = await captureCurrentLocation();
      const current = observationDraftRef.current ?? acquiring;
      await persistObservationDraftNow({
        ...current,
        latitude: location.latitude,
        longitude: location.longitude,
        gpsAccuracy: location.accuracy,
        gpsStatus: 'acquired',
        updatedAt: new Date().toISOString(),
      });
    } catch (locationError) {
      const current = observationDraftRef.current ?? acquiring;
      await persistObservationDraftNow({
        ...current,
        latitude: undefined,
        longitude: undefined,
        gpsAccuracy: undefined,
        gpsStatus: 'unavailable',
        updatedAt: new Date().toISOString(),
      });
      throw locationError;
    }
  };

  const openObservation = (observation: ObservationWithPhotos) => {
    setSelectedObservation(observation);
    navigate('observationDetail');
  };

  const deleteObservation = async (observation: ObservationWithPhotos) => {
    await deletePatrolObservation(observation.patrolId, observation.id);
    setObservations(current =>
      current.filter(item => item.id !== observation.id),
    );
    setSelectedObservation(undefined);
    await cleanupMediaForPatrol(observation.patrolId);
    navigate('active');
  };

  const activeArea = areas.find(area => area.id === activePatrol?.forestAreaId);
  const selectBottomTab = (tab: BottomTab) => navigate(tab);

  let content;
  let tabletTab: BottomTab | undefined;
  if (loading) {
    content = (
      <View accessibilityLiveRegion="polite" style={styles.centered}>
        <Text style={styles.title}>Đang mở ForestLog…</Text>
        <Text style={styles.body}>
          Đang kiểm tra dữ liệu cục bộ trên thiết bị.
        </Text>
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.centered}>
        <Text style={styles.title}>Chưa thể mở dữ liệu</Text>
        <Text style={styles.body}>
          Dữ liệu trên thiết bị chưa bị thay đổi. Vui lòng thử lại.
        </Text>
        <PrimaryButton icon="refresh" label="Thử lại" onPress={load} />
      </View>
    );
  } else if (!walkthroughComplete) {
    content = (
      <WalkthroughScreen
        error={walkthroughSaveError}
        onComplete={finishWalkthrough}
      />
    );
  } else if (screen === 'create') {
    content = (
      <CreatePatrolScreen
        areas={areas}
        initialDraft={patrolDraft}
        onAddArea={() => navigate('createArea')}
        onBack={() => navigate('home')}
        onDraftChange={savePatrolDraft}
        onSubmit={startPatrol}
      />
    );
  } else if (screen === 'createArea') {
    content = (
      <CreateForestAreaScreen
        onBack={() => navigate('create')}
        onComplete={() => navigate('create')}
        onSave={saveForestArea}
      />
    );
  } else if (screen === 'complete' && activePatrol && activeArea) {
    content = (
      <CompletePatrolScreen
        area={activeArea}
        eventCount={events.length}
        observationCount={observations.length}
        initialDraft={completeDraft}
        onBack={() => navigate('active')}
        onDraftChange={saveCompleteDraft}
        onSubmit={finishPatrol}
        patrol={activePatrol}
      />
    );
  } else if (screen === 'active' && activePatrol && activeArea) {
    content = (
      <ActivePatrolScreen
        area={activeArea}
        draft={eventDraft}
        events={events}
        observationDraft={observationDraft}
        observations={observations}
        patrol={activePatrol}
        onComplete={openCompletePatrol}
        onHome={() => navigate('home')}
        onOpenMap={() => navigate('fieldMap')}
        onOpenEvent={openEvent}
        onOpenObservation={openObservation}
        onRecordEvent={openEventForm}
        onRecordObservation={openObservationForm}
      />
    );
  } else if (screen === 'fieldMap' && activePatrol && activeArea) {
    content = (
      <FieldMapScreen
        area={activeArea}
        events={events}
        observations={observations}
        onBack={() => navigate('active')}
        onLocate={captureCurrentLocation}
      />
    );
  } else if (screen === 'eventForm' && activePatrol && eventDraft) {
    content = (
      <EventFormScreen
        draft={eventDraft}
        draftSaveError={draftSaveError}
        onAcquireGps={acquireEventLocation}
        onAddPhotos={addEventPhotos}
        onBack={() => navigate('active')}
        onChange={persistEventDraft}
        onRemovePhoto={removeEventPhoto}
        onSubmit={saveEvent}
      />
    );
  } else if (screen === 'eventDetail' && selectedEvent) {
    content = (
      <EventDetailScreen
        area={areas.find(
          area =>
            area.id ===
            (activePatrol?.id === selectedEvent.patrolId
              ? activePatrol.forestAreaId
              : selectedPatrol?.forestAreaId),
        )}
        draftActive={
          Boolean(eventDraft) && activePatrol?.id === selectedEvent.patrolId
        }
        editable={activePatrol?.id === selectedEvent.patrolId && !eventDraft}
        event={selectedEvent}
        onBack={() => navigate(activePatrol ? 'active' : 'patrolDetail')}
        onDelete={deleteEvent}
        onEdit={() => editEvent(selectedEvent)}
      />
    );
  } else if (screen === 'observationForm' && activePatrol && observationDraft) {
    content = (
      <ObservationFormScreen
        draft={observationDraft}
        draftSaveError={observationDraftSaveError}
        onAcquireGps={acquireObservationLocation}
        onAddPhotos={addObservationPhotos}
        onBack={() => navigate('active')}
        onChange={persistObservationDraft}
        onRemovePhoto={removeObservationPhoto}
        onSubmit={saveObservation}
      />
    );
  } else if (screen === 'observationDetail' && selectedObservation) {
    content = (
      <ObservationDetailScreen
        area={areas.find(
          area =>
            area.id ===
            (activePatrol?.id === selectedObservation.patrolId
              ? activePatrol.forestAreaId
              : selectedPatrol?.forestAreaId),
        )}
        draftActive={
          Boolean(observationDraft) &&
          activePatrol?.id === selectedObservation.patrolId
        }
        editable={
          activePatrol?.id === selectedObservation.patrolId && !observationDraft
        }
        observation={selectedObservation}
        onBack={() => navigate(activePatrol ? 'active' : 'patrolDetail')}
        onDelete={deleteObservation}
        onEdit={() => editObservation(selectedObservation)}
      />
    );
  } else if (screen === 'reports') {
    tabletTab = 'reports';
    content = (
      <ReportsListScreen
        areas={areas}
        generatedPatrolId={
          reportStatus === 'ready' ? reportPatrolId : undefined
        }
        onBack={() => navigate('home')}
        onOpenReport={openReportFromList}
        onTabSelect={selectBottomTab}
        patrols={completedPatrols}
      />
    );
  } else if (screen === 'settings') {
    tabletTab = 'settings';
    content = (
      <SettingsScreen
        generatedReportCount={generatedReport ? 1 : 0}
        onBack={() => navigate('home')}
        onTabSelect={selectBottomTab}
      />
    );
  } else if (screen === 'report' && selectedPatrol) {
    const selectedArea = areas.find(
      area => area.id === selectedPatrol.forestAreaId,
    );
    content = selectedArea ? (
      <ReportScreen
        area={selectedArea}
        error={reportError}
        events={events}
        observations={observations}
        generatedReport={generatedReport}
        onBack={() => navigate(reportBackScreen)}
        onRetry={generateSelectedReport}
        onShare={() =>
          generatedReport
            ? shareReport(generatedReport.filePath)
            : Promise.resolve()
        }
        patrol={selectedPatrol}
        status={reportStatus}
      />
    ) : null;
  } else if (screen === 'patrolDetail' && selectedPatrol) {
    const selectedArea = areas.find(
      area => area.id === selectedPatrol.forestAreaId,
    );
    content = selectedArea ? (
      <PatrolDetailScreen
        area={selectedArea}
        events={events}
        observations={observations}
        eventsLoadError={eventsLoadError}
        eventsLoading={eventsLoading}
        onBack={() => navigate('history')}
        onExportReport={openReportScreen}
        onOpenEvent={openEvent}
        onOpenObservation={openObservation}
        patrol={selectedPatrol}
      />
    ) : null;
  } else if (screen === 'history') {
    tabletTab = 'history';
    content = (
      <HistoryScreen
        areas={areas}
        onBack={() => navigate('home')}
        onOpenPatrol={openPatrol}
        onTabSelect={selectBottomTab}
        patrols={completedPatrols}
      />
    );
  } else {
    tabletTab = 'home';
    content = (
      <HomeScreen
        activeArea={activeArea}
        activePatrol={activePatrol}
        completedPatrols={completedPatrols}
        onContinue={() => navigate('active')}
        onHistory={() => navigate('history')}
        onStart={() => navigate('create')}
        onTabSelect={selectBottomTab}
      />
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.root}
    >
      <View style={[styles.shell, tablet && styles.tabletShell]}>
        {tablet && tabletTab ? (
          <BottomNavigation
            active={tabletTab}
            onSelect={selectBottomTab}
            variant="rail"
          />
        ) : null}
        <View style={[styles.contentHost, tablet && styles.tabletContentHost]}>
          <View
            style={[
              styles.content,
              tablet && styles.tabletContent,
              tablet && tabletContentStyle,
            ]}
          >
            {content}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default App;
