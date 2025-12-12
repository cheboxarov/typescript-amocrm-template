import { useEffect, useCallback, useRef } from 'react';
import { useCallsStore, initializeGlobalStore, getGlobalCallsStore } from '@stores/callsStore';
import { callsAPI } from '@services/callsApi';
import { getErrorMessage } from '@utils/errorHandler';
import { useInterval } from './useInterval';
import { logger } from '@utils/logger';

/**
 * Хук для работы со статусом автопривязки
 */
export function useAttachNextStatus(contactId: string | null) {
  // Счетчик рендеров для диагностики
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Гарантируем инициализацию store
  useEffect(() => {
    logger.debug('Инициализация store в useAttachNextStatus', {
      component: 'useAttachNextStatus',
      contactId: contactId || null,
    });
    
    const storeInstance = initializeGlobalStore();
    
    if (!storeInstance) {
      logger.error('Ошибка инициализации store в useAttachNextStatus - storeInstance null', {
        component: 'useAttachNextStatus',
        contactId: contactId || null,
      }, new Error('Store instance null после инициализации'));
    } else {
      logger.debug('Store успешно инициализирован в useAttachNextStatus', {
        component: 'useAttachNextStatus',
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
      component: 'useAttachNextStatus',
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
          logger.debug('Store успешно переинициализирован в useAttachNextStatus', {
            component: 'useAttachNextStatus',
            contactId: contactId || null,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.error('Ошибка при переинициализации store в useAttachNextStatus', {
        component: 'useAttachNextStatus',
        error: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Используем React hook для реактивности
  // После проверки и переинициализации store должен быть доступен
  const store = useCallsStore();

  logger.debug('Store получен в useAttachNextStatus', {
    component: 'useAttachNextStatus',
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
      component: 'useAttachNextStatus',
      contactId: contactId || null,
      attachNextActive: store.attachNextMode?.active || false,
      hasDealId: !!store.attachNextMode?.dealId,
      hasExpiry: !!store.attachNextMode?.expiresAt,
    });
  }

  // Защита от undefined store (может происходить в amoCRM окружении)
  const safeStore = store || {
    attachNextMode: {
      active: false,
      dealId: null,
      contactId: null,
      expiresAt: null,
      ttlSeconds: null,
    },
    activateAttachNext: () => {
      logger.error('Store не инициализирован - activateAttachNext недоступен', {
        component: 'useAttachNextStatus',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    deactivateAttachNext: () => {
      logger.error('Store не инициализирован - deactivateAttachNext недоступен', {
        component: 'useAttachNextStatus',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
    updateAttachNextExpiry: () => {
      logger.error('Store не инициализирован - updateAttachNextExpiry недоступен', {
        component: 'useAttachNextStatus',
        contactId
      });
      throw new Error('Store не инициализирован');
    },
  };

  const {
    attachNextMode,
    activateAttachNext: setAttachNext,
    deactivateAttachNext,
    updateAttachNextExpiry,
  } = safeStore;

  // Проверка статуса автопривязки
  const checkStatus = useCallback(async () => {
    if (!contactId) return;

    logger.debug('Проверка статуса автопривязки для контакта', {
      component: 'useAttachNextStatus',
      contactId
    });

    try {
      const response = await callsAPI.getAttachNextStatus(contactId);

      if (response.isActive && response.dealId && response.expiresAt) {
        logger.info('Автопривязка активна', {
          component: 'useAttachNextStatus',
          dealId: response.dealId,
          contactId,
          expiresAt: response.expiresAt
        });
        setAttachNext(response.dealId, contactId, response.expiresAt, response.ttlSeconds);
      } else {
        logger.debug('Автопривязка неактивна', {
          component: 'useAttachNextStatus'
        });
        deactivateAttachNext();
      }
    } catch (error) {
      // Тихая ошибка - не показываем пользователю
      logger.error('Ошибка проверки статуса автопривязки', {
        component: 'useAttachNextStatus',
        contactId,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }, [contactId, setAttachNext, deactivateAttachNext]);

  // Активация режима автопривязки
  const activate = useCallback(
    async (dealId: string, ttlSeconds: number = 600) => {
      if (!contactId) {
        return;
      }

      try {
        const response = await callsAPI.activateAttachNext(contactId, dealId, ttlSeconds);

        setAttachNext(dealId, contactId, response.expiresAt, response.ttlSeconds);
      } catch (error) {
        const message = getErrorMessage(error);
        throw error;
      }
    },
    [contactId, setAttachNext]
  );

  // Отмена режима автопривязки
  const cancel = useCallback(async () => {
    if (!contactId) return;

    try {
      await callsAPI.cancelAttachNext(contactId);

      deactivateAttachNext();
    } catch (error) {
      const message = getErrorMessage(error);
      throw error;
    }
  }, [contactId, deactivateAttachNext]);

  // Получение оставшегося времени в секундах
  const getRemainingTime = useCallback(() => {
    if (!attachNextMode.expiresAt) return 0;

    const remaining = Math.max(0, attachNextMode.expiresAt - Date.now());
    return Math.floor(remaining / 1000);
  }, [attachNextMode.expiresAt]);

  // Проверка истечения времени
  useEffect(() => {
    if (attachNextMode.active && attachNextMode.expiresAt) {
      const remaining = attachNextMode.expiresAt - Date.now();

      if (remaining <= 0) {
        deactivateAttachNext();
      }
    }
  }, [attachNextMode.active, attachNextMode.expiresAt, deactivateAttachNext]);

  // Периодическая проверка статуса (каждые 30 секунд)
  useInterval(
    () => {
      if (contactId && attachNextMode.active) {
        checkStatus();
      }
    },
    attachNextMode.active ? 30000 : null
  );

  // Первичная проверка при монтировании
  useEffect(() => {
    if (contactId) {
      logger.debug('Первичная проверка статуса для контакта', {
        component: 'useAttachNextStatus',
        contactId
      });
      checkStatus();
    }
  }, [contactId]); // Убрали checkStatus из зависимостей, чтобы избежать бесконечного цикла

  return {
    isActive: attachNextMode.active,
    dealId: attachNextMode.dealId,
    expiresAt: attachNextMode.expiresAt,
    ttlSeconds: attachNextMode.ttlSeconds,
    activate,
    cancel,
    refresh: checkStatus,
    getRemainingTime,
  };
}
