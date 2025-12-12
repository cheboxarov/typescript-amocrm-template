import React, { useEffect, useRef } from 'react';
import { useCallVisibilityFilter } from '@hooks/useCallVisibilityFilter';
import { useCallsStore, initializeGlobalStore } from '@stores/callsStore';
import { amoMenuService } from '@services/amoMenuService';
import { debounce } from '@utils/debounce';
import { logger } from '@utils/logger';

interface DealCallsManagerProps {
  dealId: string;
}

/**
 * Компонент для управления видимостью звонков в сделках
 *
 * Этот компонент не рендерит видимый UI, а управляет логикой фильтрации звонков
 * через DOM API и MutationObserver.
 */
export const DealCallsManager: React.FC<DealCallsManagerProps> = ({ dealId }) => {
  // Счетчик рендеров для диагностики
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Гарантируем инициализацию store
  useEffect(() => {
    initializeGlobalStore();
  }, []);

  const { checkAndHideCalls, showAllCalls } = useCallVisibilityFilter(dealId);
  
  // Логирование при вызове useCallsStore()
  const store = useCallsStore();
  
  // Попытка определить React root ID через DOM
  const containerId = typeof document !== 'undefined' 
    ? (document.querySelector(`#deal-calls-manager-${dealId}`)?.id || 'unknown')
    : 'unknown';

  logger.debug('useCallsStore() вызван в DealCallsManager', {
    component: 'DealCallsManager',
    dealId: dealId || null,
    renderCount: renderCountRef.current,
    containerId,
    timestamp: Date.now(),
    storeResult: store ? 'defined' : 'undefined',
    storeType: typeof store,
    storeIsNull: store === null,
    storeIsUndefined: store === undefined,
    hasStoreKeys: store ? Object.keys(store).length : 0,
    storeKeys: store ? Object.keys(store).slice(0, 10) : [],
  });

  if (!store) {
    logger.error('useCallsStore() вернул undefined/null в DealCallsManager', {
      component: 'DealCallsManager',
      dealId: dealId || null,
      renderCount: renderCountRef.current,
      containerId,
      timestamp: Date.now(),
      storeResult: store === null ? 'null' : 'undefined',
      stackTrace: new Error().stack,
      windowLocation: typeof window !== 'undefined' ? window.location?.href : 'unknown',
    }, new Error(`useCallsStore() вернул ${store === null ? 'null' : 'undefined'} в DealCallsManager на рендере ${renderCountRef.current}`));
  }

  // Защита от undefined store (может происходить в amoCRM окружении)
  const safeStore = store || {
    showHiddenCalls: false,
    toggleShowHiddenCalls: () => {
      logger.error('Store не инициализирован - toggleShowHiddenCalls недоступен', {
        component: 'DealCallsManager',
        dealId
      });
    },
    setShowHiddenCalls: () => {
      logger.error('Store не инициализирован - setShowHiddenCalls недоступен', {
        component: 'DealCallsManager',
        dealId
      });
    },
  };

  const { toggleShowHiddenCalls, showHiddenCalls } = safeStore;

  // Debounced версия checkAndHideCalls для обработки мутаций DOM
  const debouncedCheckCalls = React.useMemo(
    () => debounce(checkAndHideCalls, 300),
    [checkAndHideCalls]
  );

  // Создание MutationObserver для отслеживания изменений в DOM
  useEffect(() => {
    logger.debug('Создание MutationObserver для отслеживания звонков', {
      component: 'DealCallsManager',
      dealId
    });

    const observer = new MutationObserver((mutations) => {
      logger.debug('Обнаружены мутации в DOM', {
        component: 'DealCallsManager',
        mutationsCount: mutations.length,
        dealId
      });

      // Проверяем, есть ли мутации связанные со звонками
      const hasCallMutations = mutations.some(mutation =>
        Array.from(mutation.addedNodes).some(node =>
          node instanceof Element &&
          node.classList?.contains('feed-note-wrapper-call_in_out')
        )
      );

      if (hasCallMutations) {
        logger.debug('Найдены мутации связанные со звонками, запускаем проверку', {
          component: 'DealCallsManager',
          dealId
        });
        debouncedCheckCalls();
      }
    });

    // Начинаем наблюдение за изменениями в ленте активности
    const feedContainer = document.querySelector('.feed');
    if (feedContainer) {
      observer.observe(feedContainer, {
        childList: true,
        subtree: true
      });

      logger.debug('MutationObserver запущен', {
        component: 'DealCallsManager',
        dealId
      });
    } else {
      logger.warn('Контейнер ленты активности не найден', {
        component: 'DealCallsManager',
        dealId
      });
    }

    // Очистка при размонтировании
    return () => {
      logger.debug('Отключение MutationObserver', {
        component: 'DealCallsManager',
        dealId
      });
      observer.disconnect();
    };
  }, [dealId, debouncedCheckCalls]);

  // Запуск начальной проверки при монтировании
  useEffect(() => {
    logger.debug('Запуск начальной проверки звонков при монтировании', {
      component: 'DealCallsManager',
      dealId
    });
    checkAndHideCalls();
  }, [dealId, checkAndHideCalls]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      logger.debug('Очистка фильтров при размонтировании', {
        component: 'DealCallsManager',
        dealId
      });
      showAllCalls();
    };
  }, [dealId, showAllCalls]);

  // Инициализация кнопки в меню AmoCRM
  useEffect(() => {
    logger.debug('Инициализация кнопки в меню AmoCRM', {
      component: 'DealCallsManager',
      dealId
    });

    const getCurrentShowState = () => showHiddenCalls;

    amoMenuService.initialize(toggleShowHiddenCalls, getCurrentShowState);

    // Очистка при размонтировании
    return () => {
      logger.debug('Уничтожение кнопки в меню AmoCRM', {
        component: 'DealCallsManager',
        dealId
      });
      amoMenuService.destroy();
    };
  }, [dealId, toggleShowHiddenCalls, showHiddenCalls]);

  // Компонент не рендерит видимый UI
  return null;
};
