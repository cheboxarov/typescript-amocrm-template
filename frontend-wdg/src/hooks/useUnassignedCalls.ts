import { useEffect, useCallback, useRef } from 'react';
import { useCallsStore, initializeGlobalStore, getGlobalCallsStore } from '@stores/callsStore';
import { callsAPI } from '@services/callsApi';
import { getErrorMessage } from '@utils/errorHandler';
import { logger } from '@utils/logger';

/**
 * Хук для работы с неразобранными звонками
 */
export function useUnassignedCalls(contactId: string | null) {
  // Счетчик рендеров для диагностики
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Гарантируем инициализацию store
  useEffect(() => {
    logger.debug('Инициализация store в useUnassignedCalls', {
      component: 'useUnassignedCalls',
      contactId: contactId || null,
    });
    
    const storeInstance = initializeGlobalStore();
    
    if (!storeInstance) {
      logger.error('Ошибка инициализации store в useUnassignedCalls - storeInstance null', {
        component: 'useUnassignedCalls',
        contactId: contactId || null,
      }, new Error('Store instance null после инициализации'));
    } else {
      logger.debug('Store успешно инициализирован в useUnassignedCalls', {
        component: 'useUnassignedCalls',
        contactId: contactId || null,
        hasStore: !!storeInstance,
      });
    }
  }, [contactId]);

  // Попытка определить React root ID через DOM
  const containerId = typeof document !== 'undefined'
    ? (document.querySelector('[data-widget-version]')?.getAttribute('id') ||
       document.querySelector('#calls-manager-widget-root')?.id ||
       'unknown')
    : 'unknown';

  // Проверяем состояние store через getGlobalCallsStore (Вариант 4)
  let globalStore = getGlobalCallsStore();

  // Если store не инициализирован, пытаемся переинициализировать
  if (!globalStore) {
    logger.debug('getGlobalCallsStore() вернул null/undefined, пытаемся переинициализировать', {
      component: 'useUnassignedCalls',
      contactId: contactId || null,
      renderCount: renderCountRef.current,
      containerId,
      timestamp: Date.now(),
    });

    try {
      const reinitializedStore = initializeGlobalStore();
      
      if (reinitializedStore) {
        globalStore = getGlobalCallsStore();
        
        if (globalStore) {
          logger.debug('Store успешно переинициализирован в useUnassignedCalls', {
            component: 'useUnassignedCalls',
            contactId: contactId || null,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.error('Ошибка при переинициализации store в useUnassignedCalls', {
        component: 'useUnassignedCalls',
        error: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Используем React hook для реактивности
  // После проверки и переинициализации store должен быть доступен
  const store = useCallsStore();

  logger.debug('Store получен в useUnassignedCalls', {
    component: 'useUnassignedCalls',
    contactId: contactId || null,
    renderCount: renderCountRef.current,
    containerId,
    timestamp: Date.now(),
    globalStoreResult: globalStore ? 'defined' : 'undefined',
    storeResult: store ? 'defined' : 'undefined',
    storeType: typeof store,
    storeIsNull: store === null,
    storeIsUndefined: store === undefined,
    hasStoreKeys: store ? Object.keys(store).length : 0,
    storeKeys: store ? Object.keys(store).slice(0, 10) : [],
  });

  // После фикса debounced апдейтеров store должен быть стабилен
  if (store) {
    logger.debug('Store успешно инициализирован и доступен', {
      component: 'useUnassignedCalls',
      contactId: contactId || null,
      hasUnassignedCalls: !!store.unassignedCalls,
      callsCount: store.unassignedCalls?.length || 0,
      isLoading: store.callsLoading,
      hasError: !!store.callsError,
    });
  }

  // Защита от undefined store (может происходить в amoCRM окружении)
  const safeStore = store || {
    unassignedCalls: [],
    callsLoading: false,
    callsError: null,
    currentPage: 1,
    hasMore: false,
    totalCalls: 0,
    setUnassignedCalls: () => {
      logger.error('Store не инициализирован - setUnassignedCalls недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    appendUnassignedCalls: () => {
      logger.error('Store не инициализирован - appendUnassignedCalls недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    setCallsLoading: () => {
      logger.error('Store не инициализирован - setCallsLoading недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    setCallsError: () => {
      logger.error('Store не инициализирован - setCallsError недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    setCurrentPage: () => {
      logger.error('Store не инициализирован - setCurrentPage недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    setHasMore: () => {
      logger.error('Store не инициализирован - setHasMore недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    setTotalCalls: () => {
      logger.error('Store не инициализирован - setTotalCalls недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    updateCall: () => {
      logger.error('Store не инициализирован - updateCall недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    removeCall: () => {
      logger.error('Store не инициализирован - removeCall недоступен', {
        component: 'useUnassignedCalls',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
  };

  const {
    unassignedCalls,
    callsLoading,
    callsError,
    currentPage,
    hasMore,
    setUnassignedCalls,
    appendUnassignedCalls,
    setCallsLoading,
    setCallsError,
    setCurrentPage,
    setHasMore,
    setTotalCalls,
    updateCall,
    removeCall,
  } = safeStore;

  // Загрузка звонков
  const fetchCalls = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!contactId) {
        logger.warn('ID контакта не определен', {
          component: 'useUnassignedCalls'
        });
        setCallsError('ID контакта не определен');
        return;
      }

      logger.debug('Загрузка звонков', {
        component: 'useUnassignedCalls',
        contactId,
        page,
        append
      });
      setCallsLoading(true);
      setCallsError(null);

      try {
        const response = await callsAPI.getUnassignedCalls(contactId, page, 20);

        if (append) {
          logger.debug('Добавление звонков к существующему списку', {
            component: 'useUnassignedCalls',
            newItemsCount: response.items.length,
            total: response.total
          });
          appendUnassignedCalls(response.items);
        } else {
          logger.debug('Установка нового списка звонков', {
            component: 'useUnassignedCalls',
            itemsCount: response.items.length,
            total: response.total
          });
          setUnassignedCalls(response.items);
        }

        setCurrentPage(page);
        setTotalCalls(response.total);
        setHasMore(response.hasMore || false);

        logger.debug('Звонки успешно загружены', {
          component: 'useUnassignedCalls',
          page,
          itemsCount: response.items.length,
          total: response.total,
          hasMore: response.hasMore
        });
      } catch (error) {
        const message = getErrorMessage(error);
        logger.error('Ошибка загрузки звонков', {
          component: 'useUnassignedCalls',
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : new Error(String(error)));
        setCallsError(message);
      } finally {
        setCallsLoading(false);
      }
    },
    [
      contactId,
      setUnassignedCalls,
      appendUnassignedCalls,
      setCallsLoading,
      setCallsError,
      setCurrentPage,
      setTotalCalls,
      setHasMore,
    ]
  );

  // useRef для стабильной ссылки на fetchCalls (предотвращает бесконечные циклы)
  const fetchCallsRef = useRef(fetchCalls);
  fetchCallsRef.current = fetchCalls;

  // Отслеживание готовности store и последнего загруженного контакта
  const storeReady = Boolean(store && store.setUnassignedCalls);
  const lastFetchedContactRef = useRef<string | null>(null);

  // Загрузка следующей страницы
  const loadMore = useCallback(() => {
    if (!callsLoading && hasMore) {
      fetchCalls(currentPage + 1, true);
    }
  }, [callsLoading, hasMore, currentPage, fetchCalls]);

  // Обновление списка
  const refresh = useCallback(() => {
    fetchCalls(1, false);
  }, [fetchCalls]);

  // Привязка звонка к сделке
  const assignCall = useCallback(
    async (callId: string, dealId: string) => {
      try {
        const updatedCall = await callsAPI.assignCallToDeal(callId, dealId);

        // Удаляем звонок из списка неразобранных
        removeCall(callId);

        return updatedCall;
      } catch (error) {
        const message = getErrorMessage(error);
        throw error;
      }
    },
    [removeCall]
  );

  // Отвязка звонка от сделки
  const unassignCall = useCallback(
    async (callId: string) => {
      try {
        const updatedCall = await callsAPI.unassignCall(callId);

        updateCall(callId, { dealId: null });

        return updatedCall;
      } catch (error) {
        const message = getErrorMessage(error);
        throw error;
      }
    },
    [updateCall]
  );

  // Автоматическая загрузка при изменении contactId
  useEffect(() => {
    if (!contactId || !storeReady) {
      return;
    }

    // Проверяем, был ли уже загружен данный контакт
    if (lastFetchedContactRef.current === contactId) {
      logger.debug('Звонки для контакта уже загружены, пропускаем', {
        component: 'useUnassignedCalls',
        contactId,
        lastFetchedContact: lastFetchedContactRef.current
      });
      return;
    }

    logger.debug('Загрузка звонков для контакта', {
      component: 'useUnassignedCalls',
      contactId,
      storeReady
    });

    fetchCallsRef.current(1, false);
    lastFetchedContactRef.current = contactId;
  }, [contactId, storeReady]); // Зависим от storeReady вместо store

  return {
    calls: unassignedCalls,
    loading: callsLoading,
    error: callsError,
    hasMore,
    loadMore,
    refresh,
    assignCall,
    unassignCall,
  };
}
