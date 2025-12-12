import { amocrmService } from '@services/amocrmService';
import { EntityType } from '../types/amocrm';
import { logger } from '@utils/logger';

type WidgetRenderCallback = (entityType: EntityType, entityId: number) => void;
type CleanupCallback = () => void;

/**
 * Менеджер жизненного цикла виджета
 */
class WidgetLifecycleManager {
  private lastElementType: EntityType | null = null;
  private lastEntityId: number | null = null;
  private checkInterval: number | null = null;
  private renderCallback: WidgetRenderCallback | null = null;
  private cleanupCallback: CleanupCallback | null = null;
  private pollCount = 0;
  private renderCount = 0;
  private lastCheckTime = 0;

  /**
   * Инициализация менеджера
   */
  init(renderCallback: WidgetRenderCallback, cleanupCallback?: CleanupCallback) {
    const initOp = logger.startOperation('Инициализация WidgetLifecycleManager', {
      component: 'WidgetLifecycleManager'
    });

    try {
      logger.info('Регистрация колбэков жизненного цикла', {
        component: 'WidgetLifecycleManager',
        hasRenderCallback: !!renderCallback,
        hasCleanupCallback: !!cleanupCallback
      });

    this.renderCallback = renderCallback;
    this.cleanupCallback = cleanupCallback || null;

    // Первичная отрисовка
      logger.debug('Запуск первичной проверки и отрисовки', { component: 'WidgetLifecycleManager' });
    this.checkAndRender();

    // Периодическая проверка изменений
    this.startPolling();

      logger.info('WidgetLifecycleManager успешно инициализирован', {
        component: 'WidgetLifecycleManager',
        pollInterval: 1000
      });

      initOp.end({
        renderCallback: !!renderCallback,
        cleanupCallback: !!cleanupCallback
      });

    } catch (error) {
      logger.error('Ошибка инициализации WidgetLifecycleManager', {
        component: 'WidgetLifecycleManager'
      }, error instanceof Error ? error : new Error(String(error)));

      initOp.end(undefined, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Проверка и отрисовка виджета
   */
  private checkAndRender() {
    const checkStart = Date.now();
    this.pollCount++;

    logger.debug('Начало проверки состояния виджета', {
      component: 'WidgetLifecycleManager',
      pollCount: this.pollCount,
      lastElementType: this.lastElementType,
      lastEntityId: this.lastEntityId,
      timeSinceLastCheck: checkStart - this.lastCheckTime
    });

    try {
      // Проверяем доступность AMOCRM
    if (!amocrmService.isAmoCRMAvailable()) {
        logger.warn('AMOCRM недоступен для проверки состояния', {
          component: 'WidgetLifecycleManager',
          windowDefined: typeof window !== 'undefined',
          hasAMOCRM: !!(window as any).AMOCRM
        });
      return;
    }

      logger.debug('AMOCRM доступен, получаем текущую карточку', {
        component: 'WidgetLifecycleManager'
      });

    const currentCard = amocrmService.getCurrentCard();
    if (!currentCard) {
        logger.debug('Текущая карточка недоступна', {
          component: 'WidgetLifecycleManager',
          currentCard: null
        });
      return;
    }

    const { element_type, id } = currentCard;

      logger.debug('Получена информация о текущей карточке', {
        component: 'WidgetLifecycleManager',
        elementType: element_type,
        entityId: id,
        hasElementType: !!element_type,
        hasId: !!id
      });

    // Проверяем, изменилась ли карточка
      const hasChanged = element_type !== this.lastElementType || id !== this.lastEntityId;

      if (hasChanged) {
        this.renderCount++;

        logger.info('Обнаружено изменение карточки, перерисовка виджета', {
          component: 'WidgetLifecycleManager',
          renderCount: this.renderCount,
          previous: {
            elementType: this.lastElementType,
            entityId: this.lastEntityId
          },
          current: {
            elementType: element_type,
            entityId: id
          }
        });

      // Очистка предыдущего виджета
      if (this.cleanupCallback) {
          logger.debug('Выполнение очистки предыдущего виджета', {
            component: 'WidgetLifecycleManager'
          });
          try {
        this.cleanupCallback();
            logger.debug('Очистка виджета выполнена успешно', {
              component: 'WidgetLifecycleManager'
            });
          } catch (cleanupError) {
            logger.error('Ошибка при очистке виджета', {
              component: 'WidgetLifecycleManager'
            }, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));
          }
      }

      // Отрисовка нового виджета
      if (this.renderCallback) {
          logger.debug('Запуск отрисовки нового виджета', {
            component: 'WidgetLifecycleManager',
            elementType: element_type,
            entityId: id
          });

          try {
        this.renderCallback(element_type, id);
            logger.debug('Отрисовка виджета выполнена успешно', {
              component: 'WidgetLifecycleManager',
              elementType: element_type,
              entityId: id
            });
          } catch (renderError) {
            logger.error('Ошибка при отрисовке виджета', {
              component: 'WidgetLifecycleManager',
              elementType: element_type,
              entityId: id
            }, renderError instanceof Error ? renderError : new Error(String(renderError)));
          }
      }

      // Сохраняем текущее состояние
      this.lastElementType = element_type;
      this.lastEntityId = id;

        logger.info('Состояние виджета обновлено', {
          component: 'WidgetLifecycleManager',
          newElementType: element_type,
          newEntityId: id
        });

      } else {
        logger.debug('Состояние карточки не изменилось, пропускаем перерисовку', {
          component: 'WidgetLifecycleManager',
          elementType: element_type,
          entityId: id
        });
      }

      this.lastCheckTime = Date.now();
      const checkDuration = this.lastCheckTime - checkStart;

      logger.debug('Проверка состояния завершена', {
        component: 'WidgetLifecycleManager',
        duration: checkDuration,
        hasChanged,
        pollCount: this.pollCount
      });

    } catch (error) {
      logger.error('Критическая ошибка при проверке состояния виджета', {
        component: 'WidgetLifecycleManager',
        pollCount: this.pollCount
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Запуск периодической проверки
   */
  private startPolling() {
    logger.info('Запуск периодической проверки состояния виджета', {
      component: 'WidgetLifecycleManager',
      interval: 1000
    });

    try {
    // Проверяем каждую секунду
    this.checkInterval = window.setInterval(() => {
        logger.debug('Триггер периодической проверки', {
          component: 'WidgetLifecycleManager',
          pollCount: this.pollCount + 1
        });
      this.checkAndRender();
    }, 1000);

      logger.info('Периодическая проверка запущена успешно', {
        component: 'WidgetLifecycleManager',
        intervalId: this.checkInterval
      });

    } catch (error) {
      logger.error('Ошибка запуска периодической проверки', {
        component: 'WidgetLifecycleManager'
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Остановка периодической проверки
   */
  private stopPolling() {
    logger.info('Остановка периодической проверки', {
      component: 'WidgetLifecycleManager',
      hasInterval: !!this.checkInterval,
      pollCount: this.pollCount,
      renderCount: this.renderCount
    });

    try {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
        logger.debug('Интервал проверки очищен', {
          component: 'WidgetLifecycleManager',
          intervalId: this.checkInterval
        });
      this.checkInterval = null;
      }

      logger.info('Периодическая проверка остановлена', {
        component: 'WidgetLifecycleManager'
      });

    } catch (error) {
      logger.error('Ошибка при остановке периодической проверки', {
        component: 'WidgetLifecycleManager'
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Уничтожение менеджера
   */
  destroy() {
    const destroyOp = logger.startOperation('Уничтожение WidgetLifecycleManager', {
      component: 'WidgetLifecycleManager'
    });

    try {
      logger.info('Начало уничтожения WidgetLifecycleManager', {
        component: 'WidgetLifecycleManager',
        pollCount: this.pollCount,
        renderCount: this.renderCount,
        hasInterval: !!this.checkInterval,
        hasRenderCallback: !!this.renderCallback,
        hasCleanupCallback: !!this.cleanupCallback
      });

      // Остановка периодической проверки
    this.stopPolling();

      // Финальная очистка
    if (this.cleanupCallback) {
        logger.debug('Выполнение финальной очистки', {
          component: 'WidgetLifecycleManager'
        });

        try {
      this.cleanupCallback();
          logger.debug('Финальная очистка выполнена успешно', {
            component: 'WidgetLifecycleManager'
          });
        } catch (cleanupError) {
          logger.error('Ошибка при финальной очистке', {
            component: 'WidgetLifecycleManager'
          }, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));
        }
    }

      // Очистка ссылок
    this.renderCallback = null;
    this.cleanupCallback = null;
    this.lastElementType = null;
    this.lastEntityId = null;

      // Сброс счетчиков
      this.pollCount = 0;
      this.renderCount = 0;
      this.lastCheckTime = 0;

      logger.info('WidgetLifecycleManager успешно уничтожен', {
        component: 'WidgetLifecycleManager'
      });

      destroyOp.end({
        pollCount: this.pollCount,
        renderCount: this.renderCount
      });

    } catch (error) {
      logger.error('Ошибка при уничтожении WidgetLifecycleManager', {
        component: 'WidgetLifecycleManager'
      }, error instanceof Error ? error : new Error(String(error)));

      destroyOp.end(undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const widgetLifecycleManager = new WidgetLifecycleManager();
