import { useCallback, useEffect, useRef } from 'react';
import { domParserService } from '@services/domParser';
import { callsAPI } from '@services/callsApi';
import { callVisibilityService } from '@services/callVisibilityService';
import { useCallsStore, initializeGlobalStore, getGlobalCallsStore } from '@stores/callsStore';
import { logger } from '@utils/logger';
import { sha256Hash } from '@utils/hash';

/**
 * Кэшированная запись принадлежности звонка
 */
interface AssignmentCacheEntry {
  assignment: any;
  timestamp: number;
  ttl: number; // Время жизни в миллисекундах (5 минут по умолчанию)
}

/**
 * Хук для фильтрации и скрытия звонков, которые не принадлежат текущей сделке
 */
export const useCallVisibilityFilter = (dealId: string | null) => {
  // Счетчик рендеров для диагностики
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Кэш результатов проверки принадлежности звонков
  const checkedAssignmentsRef = useRef<Record<string, AssignmentCacheEntry>>({});
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

  // Гарантируем инициализацию store
  useEffect(() => {
    initializeGlobalStore();
  }, []);

  // Попытка определить React root ID через DOM
  const containerId = typeof document !== 'undefined'
    ? (document.querySelector(`#deal-calls-manager-${dealId}`)?.id ||
       document.querySelector('[data-widget-version]')?.getAttribute('id') ||
       'unknown')
    : 'unknown';

  // Проверяем состояние store через getGlobalCallsStore (Вариант 4)
  let globalStore = getGlobalCallsStore();

  // Если store не инициализирован, пытаемся переинициализировать
  if (!globalStore) {
    logger.debug('getGlobalCallsStore() вернул null/undefined, пытаемся переинициализировать', {
      component: 'useCallVisibilityFilter',
      dealId: dealId || null,
      renderCount: renderCountRef.current,
      containerId,
      timestamp: Date.now(),
    });

    try {
      const reinitializedStore = initializeGlobalStore();
      
      if (reinitializedStore) {
        globalStore = getGlobalCallsStore();
        
        if (globalStore) {
          logger.debug('Store успешно переинициализирован в useCallVisibilityFilter', {
            component: 'useCallVisibilityFilter',
            dealId: dealId || null,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.error('Ошибка при переинициализации store в useCallVisibilityFilter', {
        component: 'useCallVisibilityFilter',
        error: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Используем React hook для реактивности
  // После проверки и переинициализации store должен быть доступен
  const store = useCallsStore();

  logger.debug('Store получен в useCallVisibilityFilter', {
    component: 'useCallVisibilityFilter',
    dealId: dealId || null,
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
      component: 'useCallVisibilityFilter',
      dealId: dealId || null,
      showHiddenCalls: store.showHiddenCalls || false,
    });
  }

  // Защита от undefined store (может происходить в amoCRM окружении)
  const safeStore = store || {
    showHiddenCalls: false,
    toggleShowHiddenCalls: () => {
      logger.error('Store не инициализирован - toggleShowHiddenCalls недоступен', {
        component: 'useCallVisibilityFilter',
        dealId
      });
    },
    setShowHiddenCalls: () => {
      logger.error('Store не инициализирован - setShowHiddenCalls недоступен', {
        component: 'useCallVisibilityFilter',
        dealId
      });
    },
  };

  const { showHiddenCalls } = safeStore;

  /**
   * Проверить и скрыть звонки, которые не принадлежат текущей сделке
   */
  const checkAndHideCalls = useCallback(async () => {
    if (!dealId) {
      logger.debug('Фильтрация отключена - нет dealId', {
        component: 'useCallVisibilityFilter',
        dealId
      });
      return;
    }

    logger.info('Начинаем проверку принадлежности звонков к сделке', {
      component: 'useCallVisibilityFilter',
      dealId
    });

    try {
      const domCalls = domParserService.parseCallsFromDOM();

      if (domCalls.length === 0) {
        logger.debug('Звонки в DOM не найдены', {
          component: 'useCallVisibilityFilter',
          dealId
        });
        return;
      }

      logger.info('Получены данные из DOM для анализа', {
        component: 'useCallVisibilityFilter',
        action: 'dom_data_received',
        dealId,
        domCallsCount: domCalls.length,
        uniqueCallIds: [...new Set(domCalls.map(c => c.id))].length
      });

      // Создаем маппинг между ID звонков и их ссылками
      const callIdToLinkMap = new Map<string, string>();
      const linkToCallIdMap = new Map<string, string>();
      const callsWithoutLinks = new Set<string>();
      const callsWithLinks = domCalls.filter(call => {
        if (!call.id) {
          logger.warn('Пропускаем звонок без id', {
            component: 'useCallVisibilityFilter',
            dealId,
            hasLink: !!call.link,
          });
          return false;
        }

        if (!call.link) {
          callsWithoutLinks.add(call.id);
          return false;
        }

        callIdToLinkMap.set(call.id, call.link);
        linkToCallIdMap.set(call.link, call.id);
        return true;
      });

      logger.info('Статистика ссылок звонков', {
          component: 'useCallVisibilityFilter',
          dealId,
          totalCalls: domCalls.length,
        callsWithLinks: callsWithLinks.length,
        callsWithoutLinks: callsWithoutLinks.size
        });

      // Разделяем звонки на кэшированные и требующие проверки (по ID)
      const cached: string[] = [];
      const pending: string[] = [];
      const now = Date.now();

      callsWithLinks.forEach(call => {
        const callId = call.id!;
        const cachedEntry = checkedAssignmentsRef.current[callId];
        if (cachedEntry && (now - cachedEntry.timestamp) < cachedEntry.ttl) {
          cached.push(callId);
        } else {
          pending.push(callId);
        }
      });

      logger.info('Анализ кэша результатов проверки принадлежности', {
        component: 'useCallVisibilityFilter',
        action: 'cache_analysis',
        dealId,
        totalCallsWithLinks: callsWithLinks.length,
        cachedCount: cached.length,
        pendingCount: pending.length,
        cachedCallIds: cached,
        pendingCallIds: pending
      });

      let assignments: Record<string, any> = {};

      // Используем кэшированные результаты
      cached.forEach(callId => {
        assignments[callId] = checkedAssignmentsRef.current[callId].assignment;
      });

      // Запрашиваем свежие данные только для pending звонков
      if (pending.length > 0) {
        // Получаем ссылки для pending звонков
        const pendingLinks = pending
          .map(callId => callIdToLinkMap.get(callId))
          .filter((link): link is string => !!link);

        if (pendingLinks.length === 0) {
          logger.warn('Не удалось получить ссылки для pending звонков, пропускаем API запрос', {
            component: 'useCallVisibilityFilter',
            action: 'no_links_available',
            dealId,
            pendingCount: pending.length
          });
        } else {
        // Вычисляем хеши ссылок
        const linkHashPromises = pendingLinks.map(async (link) => {
          const hash = await sha256Hash(link);
          return { link, hash };
        });
        
        const linkHashes = await Promise.all(linkHashPromises);
        
        // Создаем маппинг между хешем и ID звонка
        const hashToCallIdMap = new Map<string, string>();
        const callIdToHashMap = new Map<string, string>();
        
        for (const { link, hash } of linkHashes) {
          const callId = linkToCallIdMap.get(link);
          if (callId) {
            hashToCallIdMap.set(hash, callId);
            callIdToHashMap.set(callId, hash);
          }
        }
        
        const pendingHashes = linkHashes.map(({ hash }) => hash);

        logger.info('Отправка запроса на проверку принадлежности звонков', {
          component: 'useCallVisibilityFilter',
          action: 'api_request_start',
          dealId,
          pendingCount: pending.length,
          pendingHashesCount: pendingHashes.length,
          pendingHashes: pendingHashes.slice(0, 5)
        });

        const freshAssignmentsByHash = await callsAPI.getCallsDealAssignment(pendingHashes);
        
        // Преобразуем ответ обратно к ID звонков
        const freshAssignments: Record<string, any> = {};
        for (const [hash, assignment] of Object.entries(freshAssignmentsByHash)) {
          const callId = hashToCallIdMap.get(hash);
          if (callId) {
            freshAssignments[callId] = assignment;
          }
        }

        logger.info('Получен ответ от API о принадлежности звонков', {
          component: 'useCallVisibilityFilter',
          action: 'api_response_received',
          dealId,
          requestedHashes: pendingHashes.length,
          receivedByHash: Object.keys(freshAssignmentsByHash).length,
          receivedById: Object.keys(freshAssignments).length,
          assignments: Object.entries(freshAssignments).slice(0, 5).map(([callId, assignment]: [string, any]) => ({
            callId,
            hash: callIdToHashMap.get(callId),
            link: callIdToLinkMap.get(callId),
            dealId: assignment?.deal_id,
            contactId: assignment?.contact_id,
            hasAssignment: !!assignment
          }))
        });

        pending.forEach(callId => {
          const assignment = freshAssignments[callId];
          if (assignment !== undefined) {
            checkedAssignmentsRef.current[callId] = {
              assignment,
              timestamp: now,
              ttl: CACHE_TTL_MS
            };
          }
        });

        assignments = { ...assignments, ...freshAssignments };
        }

      } else {
        logger.info('Все звонки найдены в кэше, пропускаем API запрос', {
          component: 'useCallVisibilityFilter',
          action: 'cache_hit_all',
          dealId,
          cachedCount: cached.length
        });
      }

      const callsToHide = new Set<string>();
      const callsBelongingToDeal = new Set<string>();

      for (const call of domCalls) {
        if (!call.id) {
          continue;
        }

        if (!call.link) {
          callsToHide.add(call.id);
          logger.info('Звонок без ссылки - скрываем как чужую сделку', {
            component: 'useCallVisibilityFilter',
            callId: call.id,
            dealId,
            status: call.status || null
          });
          continue;
        }

        const assignment = assignments[call.id];

        logger.info('Проверка принадлежности звонка', {
          component: 'useCallVisibilityFilter',
          action: 'check_call_assignment',
          callId: call.id,
          dealId,
          assignmentExists: !!assignment,
          assignmentFull: assignment,
          assignmentDealId: assignment?.deal_id,
          assignmentDealIdType: typeof assignment?.deal_id,
          dealIdType: typeof dealId,
          assignmentKeys: assignment ? Object.keys(assignment) : []
        });

        // Проверяем принадлежность: assignment.deal_id должен совпадать с dealId
        // Если assignment undefined или deal_id null - звонок не принадлежит сделке
        const hasDealId = assignment?.deal_id !== undefined && assignment.deal_id !== null;
        const dealIdMatches = hasDealId && String(assignment.deal_id) === dealId;

        logger.info('Результат проверки принадлежности', {
          component: 'useCallVisibilityFilter',
          action: 'assignment_check_result',
          callId: call.id,
          dealId,
          hasDealId,
          dealIdMatches,
          assignmentDealId: assignment?.deal_id,
          assignmentDealIdString: hasDealId ? String(assignment.deal_id) : null,
          dealIdString: String(dealId),
          stringsEqual: hasDealId ? String(assignment.deal_id) === String(dealId) : false,
          willHide: !dealIdMatches,
          reason: !assignment ? 'assignment_undefined' : !hasDealId ? 'deal_id_null_or_undefined' : 'deal_id_mismatch'
        });

        if (dealIdMatches) {
          callsBelongingToDeal.add(call.id);
          logger.info('Звонок принадлежит сделке - будет показан', {
            component: 'useCallVisibilityFilter',
            callId: call.id,
            dealId
          });
        } else {
          callsToHide.add(call.id);
          logger.info('Звонок НЕ принадлежит сделке - будет скрыт', {
            component: 'useCallVisibilityFilter',
            callId: call.id,
            dealId,
            reason: !assignment ? 'assignment_undefined' : !hasDealId ? 'deal_id_null_or_undefined' : 'deal_id_mismatch',
            assignmentDealId: assignment?.deal_id,
            expectedDealId: dealId
          });
        }
      }

      logger.info('Подготовка к скрытию/показу звонков', {
        component: 'useCallVisibilityFilter',
        action: 'prepare_visibility_change',
        dealId,
        callsToHideCount: callsToHide.size,
        callsToHide: Array.from(callsToHide),
        callsBelongingToDealCount: callsBelongingToDeal.size,
        callsBelongingToDeal: Array.from(callsBelongingToDeal)
      });

      if (callsToHide.size > 0) {
        logger.info('Вызов hideCalls для скрытия звонков', {
          component: 'useCallVisibilityFilter',
          action: 'calling_hide_calls',
          dealId,
          callsToHideCount: callsToHide.size,
          callsToHide: Array.from(callsToHide)
        });
        callVisibilityService.hideCalls(callsToHide);
      }

      if (callsBelongingToDeal.size > 0) {
        logger.info('Вызов showCalls для показа звонков', {
          component: 'useCallVisibilityFilter',
          action: 'calling_show_calls',
          dealId,
          callsBelongingToDealCount: callsBelongingToDeal.size,
          callsBelongingToDeal: Array.from(callsBelongingToDeal)
        });
        callVisibilityService.showCalls(callsBelongingToDeal);
      }

      logger.info('Завершена фильтрация звонков', {
        component: 'useCallVisibilityFilter',
        action: 'filter_process_end',
        dealId,
        totalCalls: domCalls.length,
        hiddenCalls: callsToHide.size,
        shownCalls: callsBelongingToDeal.size
      });

    } catch (error) {
      logger.error('Ошибка при фильтрации звонков', {
        component: 'useCallVisibilityFilter',
        action: 'filter_error',
        dealId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [dealId]);

  /**
   * Очистить кэш результатов проверки принадлежности звонков
   */
  const clearAssignmentsCache = useCallback(() => {
    logger.debug('Очищаем кэш результатов проверки принадлежности звонков', {
      component: 'useCallVisibilityFilter',
      dealId,
      cachedEntriesCount: Object.keys(checkedAssignmentsRef.current).length
    });
    checkedAssignmentsRef.current = {};
  }, [dealId]);

  /**
   * Показать все скрытые звонки (при уходе со страницы сделки)
   */
  const showAllCalls = useCallback(() => {
    logger.debug('Показываем все скрытые звонки', {
      component: 'useCallVisibilityFilter',
      dealId
    });

    callVisibilityService.showAllCalls();
    clearAssignmentsCache(); // Очищаем кэш при показе всех звонков
  }, [dealId, clearAssignmentsCache]);

  // Эффект для очистки кэша при изменении dealId
  useEffect(() => {
    logger.debug('Смена dealId, очищаем кэш', {
      component: 'useCallVisibilityFilter',
      dealId,
      previousCachedCount: Object.keys(checkedAssignmentsRef.current).length
    });
    clearAssignmentsCache();
  }, [dealId, clearAssignmentsCache]);

  // Эффект для обработки изменений состояния showHiddenCalls
  useEffect(() => {
    logger.debug('Изменение состояния showHiddenCalls', {
      component: 'useCallVisibilityFilter',
      showHiddenCalls,
      dealId
    });

    callVisibilityService.toggleHiddenCallsVisibility(showHiddenCalls);
  }, [showHiddenCalls]);

  useEffect(() => {
    if (dealId) {
      logger.info('Первый запуск фильтрации после монтирования компонента', {
        component: 'useCallVisibilityFilter',
        dealId,
        action: 'initial_filter_start'
      });

      checkAndHideCalls();
    }
  }, []);

  return {
    checkAndHideCalls,
    showAllCalls
  };
};
