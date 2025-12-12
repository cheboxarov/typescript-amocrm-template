import { useState, useEffect, useRef } from 'react';
import { amocrmService } from '@services/amocrmService';
import { EntityType, APP } from '../types/amocrm';
import { logger } from '@utils/logger';

// Конфигурация polling
const POLLING_CONFIG = {
  INTERVAL: 3000, // ms - интервал проверки изменений
  MAX_UPDATE_COUNT: 100, // Максимальное количество обновлений для предотвращения бесконечных циклов
} as const;

interface AmoCRMContextData {
  entityType: EntityType | null;
  entityId: number | null;
  contactId: string | null;
  isContact: boolean;
  isLead: boolean;
  isLoading: boolean;
}

/**
 * Хук для работы с контекстом amoCRM
 */
export function useAmoCRMContext(): AmoCRMContextData {
  const [context, setContext] = useState<AmoCRMContextData>({
    entityType: null,
    entityId: null,
    contactId: null,
    isContact: false,
    isLead: false,
    isLoading: true,
  });

  // useRef для отслеживания изменений контекста без триггера эффекта
  const previousContextRef = useRef<AmoCRMContextData | null>(null);

  useEffect(() => {
    logger.info('Инициализация хука useAmoCRMContext', {
      component: 'useAmoCRMContext',
      initialState: context
    });

    let updateCount = 0;

    const updateContext = () => {
      // Защита от бесконечных обновлений
      if (updateCount >= POLLING_CONFIG.MAX_UPDATE_COUNT) {
        logger.warn('Достигнут лимит обновлений контекста', {
          component: 'useAmoCRMContext',
          updateCount,
          maxUpdates: POLLING_CONFIG.MAX_UPDATE_COUNT
        });
        return;
      }

      updateCount++;
      const updateOp = logger.startOperation(`Обновление контекста amoCRM #${updateCount}`, {
        component: 'useAmoCRMContext',
        updateCount
      });

      logger.debug('Начинаем обновление контекста', {
        component: 'useAmoCRMContext',
        updateCount
      });

      try {
        logger.debug('Начало обновления контекста amoCRM', {
          component: 'useAmoCRMContext',
          updateCount,
          currentContext: context,
          previousContext: previousContextRef.current
        });

        // Проверяем доступность AMOCRM
        const isAmoCRMAvailable = amocrmService.isAmoCRMAvailable();

        if (!isAmoCRMAvailable) {
          logger.warn('AMOCRM недоступен, установка пустого контекста', {
            component: 'useAmoCRMContext',
            updateCount,
            isAmoCRMAvailable
          });

          const emptyContext = {
          entityType: null,
          entityId: null,
          contactId: null,
          isContact: false,
          isLead: false,
          isLoading: false,
          };

          logger.stateChange('useAmoCRMContext', previousContextRef.current || context, emptyContext, {
            component: 'useAmoCRMContext',
            reason: 'AMOCRM недоступен'
          });

          setContext(emptyContext);
          updateOp.end(emptyContext);
          return;
        }

        logger.debug('AMOCRM доступен, проверка области виджета', {
          component: 'useAmoCRMContext',
          updateCount
        });

        // Проверяем область виджета
        let widgetArea: string | undefined;
        try {
          widgetArea = window.APP?.getWidgetsArea();
          logger.debug('Область виджета получена', {
            component: 'useAmoCRMContext',
            widgetArea,
            hasAPP: !!window.APP
          });
        } catch (error) {
          logger.warn('Не удалось получить область виджета', {
            component: 'useAmoCRMContext',
            error: error instanceof Error ? error.message : String(error)
          }, error instanceof Error ? error : new Error(String(error)));
        }

        // Виджет работает только в карточках контактов и сделок
        const allowedAreas = ['contacts_card', 'leads_card'];
        const isAreaAllowed = !widgetArea || allowedAreas.includes(widgetArea);

        if (!isAreaAllowed) {
          logger.info('Виджет неактивен в текущей области', {
            component: 'useAmoCRMContext',
            widgetArea,
            allowedAreas,
            isAreaAllowed,
            reason: 'Недопустимая область'
          });

          const inactiveContext = {
            entityType: null,
            entityId: null,
            contactId: null,
            isContact: false,
            isLead: false,
            isLoading: false,
          };

          logger.stateChange('useAmoCRMContext', previousContextRef.current || context, inactiveContext, {
            component: 'useAmoCRMContext',
            reason: 'Недопустимая область виджета',
            widgetArea
          });

          setContext(inactiveContext);
          updateOp.end(inactiveContext);
        return;
      }

        logger.debug('Получение данных карточки из amoCRM', {
          component: 'useAmoCRMContext',
          updateCount
        });

      const entityType = amocrmService.getCurrentCardType();
      const entityId = amocrmService.getCurrentCardId();
      const contactId = amocrmService.getContactId();
        const isContact = amocrmService.isCurrentCardContact();
        const isLead = amocrmService.isCurrentCardLead();

        const newContext = {
        entityType,
        entityId,
        contactId,
          isContact,
          isLead,
        isLoading: false,
        };

        logger.debug('Контекст amoCRM обновлен', {
          component: 'useAmoCRMContext',
          updateCount,
          newContext: {
            ...newContext,
            contactId: newContext.contactId ? 'получен' : null
          }
        });

        logger.stateChange('useAmoCRMContext', previousContextRef.current || context, newContext, {
          component: 'useAmoCRMContext',
          reason: 'Обновление контекста amoCRM',
          updateCount
        });

        setContext(newContext);

        // Установить начальное значение для useRef, если это первое обновление
        if (!previousContextRef.current) {
          previousContextRef.current = newContext;
        }

        logger.info('Контекст успешно обновлен', {
          component: 'useAmoCRMContext',
          updateCount,
          entityType: newContext.entityType,
          entityId: newContext.entityId,
          hasContactId: !!newContext.contactId
        });

        updateOp.end(newContext);

      } catch (error) {
        logger.error('Критическая ошибка при обновлении контекста amoCRM', {
          component: 'useAmoCRMContext',
          updateCount,
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : new Error(String(error)));

        // В случае ошибки устанавливаем безопасное состояние
        const safeErrorContext: AmoCRMContextData = {
          entityType: null,
          entityId: null,
          contactId: null,
          isContact: false,
          isLead: false,
          isLoading: false,
        };

        setContext(safeErrorContext);
        // Очищаем useRef для предотвращения неконсистентного состояния
        previousContextRef.current = safeErrorContext;

        logger.warn('Установлено безопасное состояние после ошибки', {
          component: 'useAmoCRMContext',
          safeErrorContext
        });

        updateOp.end(safeErrorContext, error instanceof Error ? error : new Error(String(error)));
      }
    };

    logger.debug('Запуск первичного обновления контекста', {
      component: 'useAmoCRMContext'
    });

    // Первичная загрузка
    updateContext();

    // Умный polling каждые 3 секунды
    const interval = setInterval(() => {
      try {
        logger.debug('Проверка изменений контекста', {
          component: 'useAmoCRMContext'
        });

        // Быстрая проверка через useRef - реальные ли изменения?
        const currentCard = amocrmService.getCurrentCard();
        const hasRealChange =
          currentCard?.id !== previousContextRef.current?.entityId ||
          currentCard?.element_type !== previousContextRef.current?.entityType ||
          !amocrmService.isAmoCRMAvailable();

        if (!hasRealChange) {
          logger.debug('Изменений нет, пропускаем обновление', {
            component: 'useAmoCRMContext'
          });
          return;
        }

        logger.info('Обнаружены изменения, обновляем контекст', {
          component: 'useAmoCRMContext'
      });
      updateContext();
      } catch (error) {
        logger.error('Ошибка в polling колбэке', {
          component: 'useAmoCRMContext',
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : new Error(String(error)));
        // Продолжаем polling несмотря на ошибку
      }
    }, POLLING_CONFIG.INTERVAL);

    logger.info('Хук инициализирован с умным polling', {
      component: 'useAmoCRMContext',
      pollInterval: POLLING_CONFIG.INTERVAL
    });

    return () => {
      logger.debug('Очистка polling интервала', {
        component: 'useAmoCRMContext'
      });
      clearInterval(interval);
    };
  }, []); // Пустой массив - polling работает постоянно, но умно проверяет изменения

  return context;
}
