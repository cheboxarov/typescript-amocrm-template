import { Deal, Call, CallType } from '../types/models';
import { logger } from '@utils/logger';

/**
 * Сервис для парсинга DOM элементов amoCRM
 */
class DOMParserService {
  /**
   * Парсинг сделок из DOM карточки контакта
   */
  parseDealsFromDOM(): Deal[] {
    try {
      const dealElements = document.querySelectorAll<HTMLElement>(
        '.pipeline_leads__item.pipeline_leads__item-card'
      );

      return Array.from(dealElements).map(element => {
        const id = element.dataset.id || '';
        const titleElement = element.querySelector<HTMLAnchorElement>(
          '.pipeline_leads__lead-title-text'
        );
        const priceElement = element.querySelector<HTMLElement>('.pipeline_leads__price');
        const statusElement = element.querySelector<HTMLElement>('.note-lead__status');
        const statusTextElement = element.querySelector<HTMLElement>('.note-lead__status-text');
        const pipelineElement = element.querySelector<HTMLElement>('.node-lead__pipe-text');

        return {
          id,
          name: titleElement?.textContent?.trim() || '',
          price: priceElement?.dataset.price || '0',
          status: statusTextElement?.textContent?.trim(),
          statusColor: statusElement?.style.backgroundColor,
          pipeline: pipelineElement?.textContent?.trim(),
          url: titleElement?.href,
        };
      });
    } catch (error) {
      console.error('Error parsing deals from DOM:', error);
      return [];
    }
  }

  /**
   * Парсинг звонков из ленты активности
   */
  parseCallsFromDOM(): Call[] {
    try {
      logger.debug('Начинаем поиск карточек звонков в DOM', {
        component: 'DOMParserService',
        action: 'parse_calls_start'
      });

      const callElements = document.querySelectorAll<HTMLElement>(
        '.feed-note-wrapper-call_in_out'
      );

      logger.info('Найдены элементы звонков в DOM', {
        component: 'DOMParserService',
        action: 'dom_search_complete',
        elementsFound: callElements.length,
        selector: '.feed-note-wrapper-call_in_out'
      });

      const parsedCalls = Array.from(callElements).map((element, index) => {
        const callId = element.dataset.id || '';

        logger.debug('Парсинг карточки звонка', {
          component: 'DOMParserService',
          action: 'parse_call_card',
          callId,
          elementIndex: index,
          totalElements: callElements.length
        });

        const header = element.querySelector<HTMLElement>('.feed-note__header-inner-nowrap');
        const content = element.querySelector<HTMLElement>('.feed-note__call-content');
        const statusElement = element.querySelector<HTMLElement>('.feed-note__call-status');
        const userElement = element.querySelector<HTMLElement>('.feed-note__amojo-user');
        const playLink = element.querySelector<HTMLAnchorElement>('.feed-note__call-player');
        const downloadLink = element.querySelector<HTMLAnchorElement>(
          '.feed-note__blue-link[download]'
        );
        const dateElement = element.querySelector<HTMLElement>('.js-feed-note__date');
        const durationElement = element.querySelector<HTMLElement>('.feed-note__call-duration');
        
        // Поиск ссылки на запись звонка - берем из .feed-note__call-player
        // Это ссылка на запись звонка, которую нужно отправлять в API
        let noteLink: string | null = null;
        
        // Ссылка на запись звонка находится в элементе .feed-note__call-player
        if (playLink && playLink.href) {
          noteLink = playLink.href;
        }

        // Определение типа звонка
        const isOutgoing = element.querySelector('.feed-note__icon-direction_out') !== null;
        const type: CallType = isOutgoing ? 'outgoing' : 'incoming';

        // Извлечение номера телефона
        // Для входящих: "от: 79639588178 кому:"
        // Для исходящих: "кому: 9167102"
        let phone: string | null = null;
        if (header?.textContent) {
          const text = header.textContent;
          // Сначала пробуем найти "от:" (для входящих)
          const fromMatch = text.match(/от:\s*([+\d\s-]+)/i);
          if (fromMatch) {
            phone = fromMatch[1].trim();
          } else {
            // Если не нашли "от:", ищем "кому:" (для исходящих)
            const toMatch = text.match(/кому:\s*([+\d\s-]+)/i);
            if (toMatch) {
              phone = toMatch[1].trim();
            }
          }
        }

        const parsedCall = {
          id: callId,
          date: dateElement?.textContent?.trim() || '',
          type,
          duration: durationElement?.textContent?.trim() || '00:00:00',
          phone,
          userId: userElement?.dataset.id || '',
          userName: userElement?.textContent?.trim() || '',
          recordingUrl: playLink?.href || null,
          downloadUrl: downloadLink?.href || null,
          status: statusElement?.querySelector('b')?.textContent?.trim() || '',
          provider: playLink?.dataset.prepare || null,
          link: noteLink,
        };

        logger.debug('Карточка звонка успешно распарсена', {
          component: 'DOMParserService',
          action: 'parse_call_complete',
          callId,
          callType: type,
          hasRecording: !!parsedCall.recordingUrl,
          hasPhone: !!parsedCall.phone
        });

        return parsedCall;
      });

      logger.info('Парсинг всех карточек звонков завершен', {
        component: 'DOMParserService',
        action: 'parse_calls_complete',
        totalParsed: parsedCalls.length,
        validCalls: parsedCalls.filter(c => c.id).length
      });

      return parsedCalls;
    } catch (error) {
      logger.error('Ошибка при парсинге карточек звонков из DOM', {
        component: 'DOMParserService',
        action: 'parse_calls_error',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return [];
    }
  }

  /**
   * Поиск контейнера виджетов
   */
  findWidgetsContainer(): HTMLElement | null {
    return document.querySelector<HTMLElement>('#widgets_block .card-widgets__elements');
  }

  /**
   * Проверка наличия контейнера виджетов
   */
  hasWidgetsContainer(): boolean {
    return !!this.findWidgetsContainer();
  }

  /**
   * Создание наблюдателя за изменениями DOM
   */
  createDOMObserver(callback: MutationCallback): MutationObserver {
    const observer = new MutationObserver(callback);
    return observer;
  }

  /**
   * Наблюдение за изменениями в контейнере виджетов
   */
  observeWidgetsContainer(callback: MutationCallback): MutationObserver | null {
    const container = this.findWidgetsContainer();
    if (!container) return null;

    const observer = this.createDOMObserver(callback);
    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return observer;
  }

  /**
   * Наблюдение за изменениями в ленте активности
   */
  observeFeedNotes(callback: MutationCallback): MutationObserver | null {
    const feedContainer = document.querySelector<HTMLElement>('.feed__timeline');
    if (!feedContainer) return null;

    const observer = this.createDOMObserver(callback);
    observer.observe(feedContainer, {
      childList: true,
      subtree: true,
    });

    return observer;
  }
}

export const domParserService = new DOMParserService();
