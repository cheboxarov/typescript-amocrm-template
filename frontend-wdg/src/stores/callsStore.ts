import { create } from 'zustand';
import { Call, AttachNextMode } from '../types/models';
import { createDebouncedStoreUpdater } from '@utils/debounce';
import { logger } from '@utils/logger';

// Выносим создание debounced функций за пределы create() для предотвращения утечек памяти
const debouncedSetUnassignedCalls = createDebouncedStoreUpdater(
  (calls: Call[]) => ({ unassignedCalls: calls }),
  50,
  'setUnassignedCalls'
);

const debouncedAppendUnassignedCalls = createDebouncedStoreUpdater(
  (calls: Call[]) => (state: CallsState) => ({
    unassignedCalls: [...state.unassignedCalls, ...calls],
  }),
  50,
  'appendUnassignedCalls'
);

const debouncedSetCallsLoading = createDebouncedStoreUpdater(
  (loading: boolean) => ({ callsLoading: loading }),
  50,
  'setCallsLoading'
);

const debouncedSetCallsError = createDebouncedStoreUpdater(
  (error: string | null) => ({ callsError: error }),
  50,
  'setCallsError'
);

const debouncedSetCurrentPage = createDebouncedStoreUpdater(
  (page: number) => ({ currentPage: page }),
  50,
  'setCurrentPage'
);

const debouncedSetTotalCalls = createDebouncedStoreUpdater(
  (total: number) => ({ totalCalls: total }),
  50,
  'setTotalCalls'
);

const debouncedSetHasMore = createDebouncedStoreUpdater(
  (hasMore: boolean) => ({ hasMore }),
  50,
  'setHasMore'
);

interface CallsState {
  // Состояние звонков
  unassignedCalls: Call[];
  callsLoading: boolean;
  callsError: string | null;
  currentPage: number;
  totalCalls: number;
  hasMore: boolean;

  // Состояние видимости скрытых звонков
  showHiddenCalls: boolean;

  // Состояние автопривязки
  attachNextMode: AttachNextMode;

  // Actions
  setUnassignedCalls: (calls: Call[]) => void;
  appendUnassignedCalls: (calls: Call[]) => void;
  setCallsLoading: (loading: boolean) => void;
  setCallsError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalCalls: (total: number) => void;
  setHasMore: (hasMore: boolean) => void;

  // Actions для звонков
  updateCall: (callId: string, updates: Partial<Call>) => void;
  removeCall: (callId: string) => void;

  // Actions для видимости скрытых звонков
  toggleShowHiddenCalls: () => void;
  setShowHiddenCalls: (show: boolean) => void;

  // Actions для автопривязки
  activateAttachNext: (dealId: string, contactId: string, expiresAt: number, ttlSeconds?: number) => void;
  deactivateAttachNext: () => void;
  updateAttachNextExpiry: (expiresAt: number) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  unassignedCalls: [],
  callsLoading: false,
  callsError: null,
  currentPage: 1,
  totalCalls: 0,
  hasMore: false,
  showHiddenCalls: false,
  attachNextMode: {
    active: false,
    dealId: null,
    expiresAt: null,
    contactId: null,
    ttlSeconds: null,
  },
};

// Создаем store с логированием
logger.debug('Создание Zustand store через create()', {
  component: 'callsStore',
  timestamp: Date.now(),
  initialState: {
    unassignedCallsCount: initialState.unassignedCalls.length,
    callsLoading: initialState.callsLoading,
    showHiddenCalls: initialState.showHiddenCalls,
    attachNextModeActive: initialState.attachNextMode.active,
  },
});

export const useCallsStore = create<CallsState>((set) => {
  logger.debug('Zustand create() callback вызван - создание store instance', {
    component: 'callsStore',
    timestamp: Date.now(),
  });

  const store = {
  ...initialState,

  setUnassignedCalls: (calls) => debouncedSetUnassignedCalls(set, calls),
  appendUnassignedCalls: (calls) => debouncedAppendUnassignedCalls(set, calls),
  setCallsLoading: (loading) => debouncedSetCallsLoading(set, loading),
  setCallsError: (error) => debouncedSetCallsError(set, error),
  setCurrentPage: (page) => debouncedSetCurrentPage(set, page),
  setTotalCalls: (total) => debouncedSetTotalCalls(set, total),
  setHasMore: (hasMore) => debouncedSetHasMore(set, hasMore),

  updateCall: (callId, updates) =>
    set((state) => ({
      unassignedCalls: state.unassignedCalls.map((call) =>
        call.id === callId ? { ...call, ...updates } : call
      ),
    })),

  removeCall: (callId) =>
    set((state) => ({
      unassignedCalls: state.unassignedCalls.filter((call) => call.id !== callId),
    })),

  toggleShowHiddenCalls: () =>
    set((state) => ({
      showHiddenCalls: !state.showHiddenCalls,
    })),

  setShowHiddenCalls: (show) =>
    set({
      showHiddenCalls: show,
    }),

  activateAttachNext: (dealId, contactId, expiresAt, ttlSeconds = null) =>
    set({
      attachNextMode: {
        active: true,
        dealId,
        contactId,
        expiresAt,
        ttlSeconds,
      },
    }),

  deactivateAttachNext: () =>
    set({
      attachNextMode: {
        active: false,
        dealId: null,
        contactId: null,
        expiresAt: null,
        ttlSeconds: null,
      },
    }),

  updateAttachNextExpiry: (expiresAt) =>
    set((state) => ({
      attachNextMode: {
        ...state.attachNextMode,
        expiresAt,
      },
    })),

  reset: () => set(initialState),
  };

  logger.info('Zustand store instance создан успешно', {
    component: 'callsStore',
    timestamp: Date.now(),
    storeKeys: Object.keys(store),
    hasAllRequiredMethods: {
      setUnassignedCalls: typeof store.setUnassignedCalls === 'function',
      appendUnassignedCalls: typeof store.appendUnassignedCalls === 'function',
      toggleShowHiddenCalls: typeof store.toggleShowHiddenCalls === 'function',
      activateAttachNext: typeof store.activateAttachNext === 'function',
    },
  });

  return store;
});

// Форсируем инициализацию Zustand store сразу после создания
// Zustand инициализирует внутренний state лениво, нужно вызвать getState() чтобы это произошло
logger.debug('Форсируем инициализацию Zustand store на уровне модуля', {
  component: 'callsStore',
  timestamp: Date.now(),
});

try {
  const forcedInitState = useCallsStore.getState();

  if (forcedInitState) {
    logger.info('Zustand store успешно инициализирован на уровне модуля', {
      component: 'callsStore',
      timestamp: Date.now(),
      stateKeys: Object.keys(forcedInitState).length,
      hasUnassignedCalls: !!forcedInitState.unassignedCalls,
      hasAttachNextMode: !!forcedInitState.attachNextMode,
    });
  } else {
    logger.error('Ошибка инициализации Zustand store - getState() вернул undefined', {
      component: 'callsStore',
      timestamp: Date.now(),
    }, new Error('getState() вернул undefined после создания store'));
  }
} catch (error) {
  logger.error('Ошибка при форсированной инициализации store', {
    component: 'callsStore',
    error: error instanceof Error ? error.message : String(error),
  }, error instanceof Error ? error : new Error(String(error)));
}

// Инициализируем store сразу при импорте модуля
// Это гарантирует что store доступен даже при отдельном рендеринге компонентов
const store = useCallsStore;
let isStoreInitialized = false;

// Глобальный экземпляр store для доступа вне React контекста
let globalStoreInstance: ReturnType<typeof useCallsStore> | null = null;

// Функция отписки для глобального store
let globalUnsubscribe: (() => void) | null = null;

// Обертка для логирования вызовов getState()
const getStateWithLogging = (caller: string, context?: Record<string, any>) => {
  try {
    const state = useCallsStore.getState();
    
    logger.debug('getState() вызван', {
      component: 'callsStore',
      caller,
      context,
      timestamp: Date.now(),
      stateResult: state ? 'defined' : 'undefined',
      stateType: typeof state,
      stateIsNull: state === null,
      hasStateKeys: state ? Object.keys(state).length : 0,
      stateKeys: state ? Object.keys(state).slice(0, 10) : [],
    });

    if (!state) {
      logger.error('getState() вернул undefined/null', {
        component: 'callsStore',
        caller,
        context,
        timestamp: Date.now(),
        stackTrace: new Error().stack,
      }, new Error(`getState() вернул ${state === null ? 'null' : 'undefined'} для ${caller}`));
    }

    return state;
  } catch (error) {
    logger.error('Ошибка при вызове getState()', {
      component: 'callsStore',
      caller,
      context,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

// Функция для получения store состояния
export const getCallsStoreState = () => {
  if (!isStoreInitialized) {
    logger.debug('Первая инициализация через getCallsStoreState()', {
      component: 'callsStore',
      timestamp: Date.now(),
    });
    isStoreInitialized = true;
  }
  return getStateWithLogging('getCallsStoreState', { isStoreInitialized });
};

// Функция для инициализации глобального store
export const initializeGlobalStore = () => {
  const initTimestamp = Date.now();
  
  logger.debug('Начало инициализации глобального store', {
    component: 'callsStore',
    hasExistingInstance: !!globalStoreInstance,
    globalStoreInstanceType: typeof globalStoreInstance,
    globalStoreInstanceIsNull: globalStoreInstance === null,
    hasUnsubscribe: !!globalUnsubscribe,
    timestamp: initTimestamp,
  });

  // Если подписка была отключена, но store существует - переинициализируем подписку
  if (globalStoreInstance && !globalUnsubscribe) {
    logger.debug('Store существует, но подписка отключена - переинициализируем подписку', {
      component: 'callsStore',
      hasStoreInstance: !!globalStoreInstance,
      timestamp: Date.now(),
    });

    try {
      const unsubscribe = useCallsStore.subscribe((state) => {
        logger.debug('Store подписка (переинициализированная): обновление globalStoreInstance', {
          component: 'callsStore',
          stateType: typeof state,
          stateIsNull: state === null,
          stateIsUndefined: state === undefined,
          hasStateKeys: state ? Object.keys(state).length : 0,
          timestamp: Date.now(),
        });

        globalStoreInstance = state;
      });

      globalUnsubscribe = unsubscribe;
      
      logger.info('Подписка на store переинициализирована', {
        component: 'callsStore',
        timestamp: Date.now(),
        hasStoreInstance: !!globalStoreInstance,
      });

      return globalStoreInstance;
    } catch (error) {
      logger.error('Ошибка при переинициализации подписки', {
        component: 'callsStore',
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (!globalStoreInstance) {
    try {
      // Проверяем доступность useCallsStore
      logger.debug('Проверка доступности useCallsStore перед инициализацией', {
        component: 'callsStore',
        useCallsStoreType: typeof useCallsStore,
        useCallsStoreDefined: useCallsStore !== undefined,
        useCallsStoreNull: useCallsStore === null,
        hasGetState: typeof useCallsStore.getState === 'function',
        hasSubscribe: typeof useCallsStore.subscribe === 'function',
        timestamp: Date.now(),
      });

      // Создаем подписку чтобы поддерживать экземпляр в актуальном состоянии
      logger.debug('Создание подписки на изменения store', {
        component: 'callsStore',
        timestamp: Date.now(),
      });

      const unsubscribe = useCallsStore.subscribe((state) => {
        logger.debug('Store подписка: обновление globalStoreInstance', {
          component: 'callsStore',
          stateType: typeof state,
          stateIsNull: state === null,
          stateIsUndefined: state === undefined,
          hasStateKeys: state ? Object.keys(state).length : 0,
          timestamp: Date.now(),
        });

        const previousInstance = globalStoreInstance;
        globalStoreInstance = state;

        if (!state) {
          logger.debug('Store подписка: получен undefined/null state (это нормально при сбросе состояния)', {
            component: 'callsStore',
            previousInstanceWasNull: previousInstance === null,
            previousInstanceWasUndefined: previousInstance === undefined,
            timestamp: Date.now(),
          });
        }
      });

      logger.debug('Подписка на store создана успешно', {
        component: 'callsStore',
        unsubscribeType: typeof unsubscribe,
        timestamp: Date.now(),
      });

      // Сохраняем unsubscribe функцию для возможности очистки
      globalUnsubscribe = unsubscribe;

      // Получаем начальное состояние с логированием
      logger.debug('Получение начального состояния через getState()', {
        component: 'callsStore',
        timestamp: Date.now(),
      });

      const initialState = getStateWithLogging('initializeGlobalStore', {
        initTimestamp,
        step: 'initial_getState',
      });

      globalStoreInstance = initialState;

      // Проверяем, что store инициализирован
      if (!globalStoreInstance) {
        logger.error('Ошибка инициализации store - getState() вернул undefined/null', {
          component: 'callsStore',
          storeState: globalStoreInstance === null ? 'null' : 'undefined',
          initialStateResult: initialState === null ? 'null' : initialState === undefined ? 'undefined' : 'defined',
          timestamp: Date.now(),
          initDuration: Date.now() - initTimestamp,
        }, new Error('Store getState() вернул undefined/null при инициализации'));
        
        globalStoreInstance = null;
        globalUnsubscribe = null;
      } else {
        // Сохраняем unsubscribe функцию в экземпляре только если он не undefined
        (globalStoreInstance as any).__unsubscribe = unsubscribe;
        
        logger.info('Глобальный store успешно инициализирован', {
          component: 'callsStore',
          hasUnassignedCalls: !!(globalStoreInstance as any)?.unassignedCalls,
          unassignedCallsCount: (globalStoreInstance as any)?.unassignedCalls?.length || 0,
          hasAttachNextMode: !!(globalStoreInstance as any)?.attachNextMode,
          attachNextModeActive: (globalStoreInstance as any)?.attachNextMode?.active || false,
          timestamp: Date.now(),
          initDuration: Date.now() - initTimestamp,
          globalStoreInstanceKeys: Object.keys(globalStoreInstance).slice(0, 15),
        });
      }
    } catch (error) {
      logger.error('Ошибка при инициализации глобального store', {
        component: 'callsStore',
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        initDuration: Date.now() - initTimestamp,
      }, error instanceof Error ? error : new Error(String(error)));
      
      // Сбрасываем состояние при ошибке
      globalStoreInstance = null;
      globalUnsubscribe = null;
    }
  } else {
    // Store существует и подписка активна - всё готово
    logger.debug('Глобальный store уже инициализирован (с активной подпиской)', {
      component: 'callsStore',
      hasUnassignedCalls: !!(globalStoreInstance as any)?.unassignedCalls,
      globalStoreInstanceType: typeof globalStoreInstance,
      globalStoreInstanceKeys: globalStoreInstance ? Object.keys(globalStoreInstance).slice(0, 10) : [],
      hasUnsubscribe: !!globalUnsubscribe,
      timestamp: Date.now(),
    });
  }
  
  return globalStoreInstance;
};

// Функция для очистки глобального store
export const cleanupGlobalStore = () => {
  logger.debug('Очистка подписки глобального store', {
    component: 'callsStore',
    hasGlobalUnsubscribe: !!globalUnsubscribe,
    hasGlobalStoreInstance: !!globalStoreInstance,
    timestamp: Date.now(),
  });

  // Отписываемся от изменений, но НЕ сбрасываем само состояние
  // Это позволяет сохранить state между переходами между страницами (Вариант 1)
  if (globalUnsubscribe) {
    try {
      globalUnsubscribe();
      logger.debug('Отписка от store выполнена', {
        component: 'callsStore',
        timestamp: Date.now(),
      });
      globalUnsubscribe = null;
    } catch (error) {
      logger.error('Ошибка при отписке от store', {
        component: 'callsStore',
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : new Error(String(error)));
    }
  } else {
    logger.debug('Подписка уже была отключена, пропускаем отписку', {
      component: 'callsStore',
      timestamp: Date.now(),
    });
  }

  // НЕ сбрасываем globalStoreInstance - он остается доступным для следующего использования
  // Это предотвращает потерю состояния при переходе между страницами
  // Подписка будет переинициализирована при следующем вызове initializeGlobalStore()
  logger.info('Подписка глобального store очищена (состояние сохранено)', {
    component: 'callsStore',
    timestamp: Date.now(),
    hasPreservedState: !!globalStoreInstance,
    hasPreservedStoreKeys: globalStoreInstance ? Object.keys(globalStoreInstance).length : 0,
  });
};

// Экспортируем функцию для получения глобального store состояния
export const getGlobalCallsStore = () => {
  if (!globalStoreInstance) {
    logger.debug('getGlobalCallsStore: globalStoreInstance null, получение через getState()', {
      component: 'callsStore',
      timestamp: Date.now(),
    });
    
    globalStoreInstance = getStateWithLogging('getGlobalCallsStore', {
      globalStoreInstanceWasNull: true,
    });
    
    if (!globalStoreInstance) {
      logger.error('getGlobalCallsStore: getState() вернул undefined/null', {
        component: 'callsStore',
        timestamp: Date.now(),
      }, new Error('getGlobalCallsStore: getState() вернул undefined/null'));
    }
  } else {
    logger.debug('getGlobalCallsStore: возврат существующего globalStoreInstance', {
      component: 'callsStore',
      globalStoreInstanceType: typeof globalStoreInstance,
      hasKeys: globalStoreInstance ? Object.keys(globalStoreInstance).length : 0,
      timestamp: Date.now(),
    });
  }
  
  return globalStoreInstance;
};
