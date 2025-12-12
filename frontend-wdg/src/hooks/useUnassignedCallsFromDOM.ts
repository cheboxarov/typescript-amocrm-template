import { useCallback, useEffect, useRef, useState } from 'react';
import { domParserService } from '@services/domParser';
import { callsAPI } from '@services/callsApi';
import { logger } from '@utils/logger';
import { computeCallHashes, createCallAssignmentMap } from '@utils/callHashUtils';
import { Call } from '../types/models';

interface UnassignedCall extends Call {
  hash: string;
  assignment?: any;
}

export function useUnassignedCallsFromDOM(contactId: string | null) {
  const [calls, setCalls] = useState<UnassignedCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedRef = useRef<number>(0);

  const loadCalls = useCallback(async () => {
    if (!contactId) {
      logger.debug('ID контакта не определен, пропускаем загрузку звонков', {
        component: 'useUnassignedCallsFromDOM'
      });
      return;
    }

    const loadId = Date.now();
    lastLoadedRef.current = loadId;
    setLoading(true);
    setError(null);

    try {
      logger.info('Начало загрузки неразобранных звонков из DOM', {
        component: 'useUnassignedCallsFromDOM',
        contactId
      });

      const domCalls = domParserService.parseCallsFromDOM();

      logger.info('Получены звонки из DOM', {
        component: 'useUnassignedCallsFromDOM',
        contactId,
        totalCalls: domCalls.length,
        callsWithLinks: domCalls.filter(c => c.link).length
      });

      const callsWithLinks = domCalls.filter(call => call.id && call.link);

      if (callsWithLinks.length === 0) {
        logger.debug('Нет звонков со ссылками в DOM', {
          component: 'useUnassignedCallsFromDOM',
          contactId,
          totalCalls: domCalls.length
        });
        setCalls([]);
        return;
      }

      const callsWithHashes = await computeCallHashes(callsWithLinks);

      if (callsWithHashes.length === 0) {
        logger.debug('Не удалось вычислить хеши для звонков', {
          component: 'useUnassignedCallsFromDOM',
          contactId
        });
        setCalls([]);
        return;
      }

      const hashes = callsWithHashes.map(({ hash }) => hash);

      logger.info('Отправка batch-запроса для проверки принадлежности звонков', {
        component: 'useUnassignedCallsFromDOM',
        contactId,
        hashesCount: hashes.length
      });

      const assignmentsByHash = await callsAPI.getCallsDealAssignment(hashes);

      logger.info('Получен ответ о принадлежности звонков', {
        component: 'useUnassignedCallsFromDOM',
        contactId,
        requested: hashes.length,
        received: Object.keys(assignmentsByHash).length
      });

      const assignmentMap = createCallAssignmentMap(callsWithHashes, assignmentsByHash);

      const unassignedCalls: UnassignedCall[] = [];

      for (const { call, hash } of callsWithHashes) {
        const assignmentInfo = assignmentMap[call.id];
        
        if (!assignmentInfo || !assignmentInfo.assignment) {
          logger.debug('Звонок не найден в БД или не привязан к сделке', {
            component: 'useUnassignedCallsFromDOM',
            contactId,
            callId: call.id,
            hash
          });
          unassignedCalls.push({
            ...call,
            hash,
            contactId: contactId || undefined
          });
        } else {
          const assignment = assignmentInfo.assignment;
          if (!assignment.deal_id) {
            logger.debug('Звонок не привязан к сделке (deal_id null)', {
              component: 'useUnassignedCallsFromDOM',
              contactId,
              callId: call.id,
              hash,
              hasAssignment: !!assignment
            });
            unassignedCalls.push({
              ...call,
              hash,
              contactId: assignment.contact_id || contactId || undefined,
              dealId: null,
              assignment
            });
          }
        }
      }

      if (loadId !== lastLoadedRef.current) {
        logger.debug('Загрузка была отменена (новая началась)', {
          component: 'useUnassignedCallsFromDOM',
          contactId,
          loadId,
          currentLoadId: lastLoadedRef.current
        });
        return;
      }

      logger.info('Неразобранные звонки определены', {
        component: 'useUnassignedCallsFromDOM',
        contactId,
        unassignedCount: unassignedCalls.length,
        totalChecked: callsWithHashes.length
      });

      setCalls(unassignedCalls);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Ошибка при загрузке неразобранных звонков из DOM', {
        component: 'useUnassignedCallsFromDOM',
        contactId,
        error: errorMessage
      }, err instanceof Error ? err : new Error(String(err)));
      
      if (loadId === lastLoadedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (loadId === lastLoadedRef.current) {
        setLoading(false);
      }
    }
  }, [contactId]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const refresh = useCallback(() => {
    loadCalls();
  }, [loadCalls]);

  return {
    calls,
    loading,
    error,
    refresh
  };
}

