import { EntityType, AmoCRMCurrentCard, CurrentEntity, DealContact } from '../types/amocrm';
import { logger } from '@utils/logger';

/**
 * Сервис для работы с amoCRM API
 */
class AmoCRMService {
  /**
   * Получить текущую карточку
   */
  getCurrentCard(): AmoCRMCurrentCard | null {
    try {
      logger.debug('Проверка доступности AMOCRM.data.current_card', {
        component: 'AmoCRMService',
        hasWindow: typeof window !== 'undefined',
        hasAMOCRM: !!(window as any).AMOCRM,
        hasData: !!(window as any).AMOCRM?.data,
        hasCurrentCard: !!(window as any).AMOCRM?.data?.current_card
      });

      const currentCard = window.AMOCRM?.data?.current_card || null;

      if (currentCard) {
        logger.debug('Текущая карточка получена успешно', {
          component: 'AmoCRMService',
          elementType: currentCard.element_type,
          id: currentCard.id,
          hasElementType: !!currentCard.element_type,
          hasId: !!currentCard.id
        });
      } else {
        logger.debug('Текущая карточка недоступна', {
          component: 'AmoCRMService',
          currentCard: null
        });
      }

      return currentCard;

    } catch (error) {
      logger.error('Ошибка получения текущей карточки', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }

  /**
   * Получить текущую сущность
   */
  getCurrentEntity(): CurrentEntity | null {
    try {
      logger.debug('Проверка доступности AMOCRM.data.current_entity', {
        component: 'AmoCRMService',
        hasWindow: typeof window !== 'undefined',
        hasAMOCRM: !!(window as any).AMOCRM,
        hasData: !!(window as any).AMOCRM?.data,
        hasCurrentEntity: !!(window as any).AMOCRM?.data?.current_entity
      });

      const currentEntity = window.AMOCRM?.data?.current_entity || null;
      const currentCard = window.AMOCRM?.data?.current_card || null;

      if (currentEntity) {
        logger.debug('Текущая сущность получена успешно', {
          component: 'AmoCRMService',
          currentEntity,
          currentCard: currentCard ? { id: currentCard.id, element_type: currentCard.element_type } : null
        });
      } else {
        logger.debug('Текущая сущность недоступна', {
          component: 'AmoCRMService',
          currentEntity: null
        });
      }

      return currentEntity;

    } catch (error) {
      logger.error('Ошибка получения текущей сущности', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }

  /**
   * Получить ID текущей карточки
   */
  getCurrentCardId(): number | null {
    logger.debug('Получение ID текущей карточки', {
      component: 'AmoCRMService',
      method: 'getCurrentCardId'
    });

    const card = this.getCurrentCard();
    const cardId = card?.id || null;

    logger.debug('ID текущей карточки получен', {
      component: 'AmoCRMService',
      cardId,
      hasCard: !!card
    });

    return cardId;
  }

  /**
   * Получить тип текущей карточки
   */
  getCurrentCardType(): EntityType | null {
    logger.debug('Получение типа текущей карточки', {
      component: 'AmoCRMService',
      method: 'getCurrentCardType'
    });

    const card = this.getCurrentCard();
    const cardType = card?.element_type || null;

    logger.debug('Тип текущей карточки получен', {
      component: 'AmoCRMService',
      cardType,
      hasCard: !!card,
      elementType: card?.element_type
    });

    return cardType;
  }

  /**
   * Проверить, является ли текущая карточка контактом
   */
  isCurrentCardContact(): boolean {
    const cardType = this.getCurrentCardType();
    const isContact = cardType === EntityType.Contact;

    logger.debug('Проверка, является ли карточка контактом', {
      component: 'AmoCRMService',
      method: 'isCurrentCardContact',
      cardType,
      isContact,
      expectedType: EntityType.Contact
    });

    return isContact;
  }

  /**
   * Проверить, является ли текущая карточка сделкой
   */
  isCurrentCardLead(): boolean {
    const cardType = this.getCurrentCardType();
    const isLead = cardType === EntityType.Lead;

    logger.debug('Проверка, является ли карточка сделкой', {
      component: 'AmoCRMService',
      method: 'isCurrentCardLead',
      cardType,
      isLead,
      expectedType: EntityType.Lead
    });

    return isLead;
  }

  /**
   * Получить ID контакта из текущей карточки
   * Если это контакт - возвращает его ID
   * Если это сделка - нужно получить ID контакта из DOM или API
   */
  getContactId(): string | null {
    try {
      const cardType = this.getCurrentCardType();
      const cardId = this.getCurrentCardId();

      logger.debug('Анализ типа карточки для получения ID контакта', {
        component: 'AmoCRMService',
        cardType,
        cardId,
        hasCardId: !!cardId
      });

      if (!cardId) {
        logger.debug('ID карточки недоступен, возвращаем null', {
          component: 'AmoCRMService'
        });
        return null;
      }

      if (cardType === EntityType.Contact) {
        const contactId = String(cardId);
        logger.debug('Карточка является контактом, возвращаем её ID', {
          component: 'AmoCRMService',
          contactId,
          cardType
        });
        return contactId;
      }

      // Для сделки нужно получить ID контакта из DOM
      logger.debug('Карточка является сделкой, получаем ID контакта из DOM', {
        component: 'AmoCRMService',
        cardType
      });

      const contactId = this.getContactIdFromDeal();

      logger.debug('ID контакта получен из сделки', {
        component: 'AmoCRMService',
        contactId: contactId || undefined,
        foundInDOM: !!contactId
      });

      return contactId;

    } catch (error) {
      logger.error('Ошибка получения ID контакта', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }

  /**
   * Получить ID контакта из сделки через парсинг DOM
   */
  private getContactIdFromDeal(): string | null {
    try {
      logger.debug('Поиск ссылки на контакт в DOM', {
        component: 'AmoCRMService',
        selectors: '.card-header__person-link, .linked-form__link[href*="/contacts/detail/"], .linked-form__field__link[data-href*="/contacts/detail/"], .js-linked-name-control[data-href*="/contacts/detail/"]'
      });

      // Ищем ссылку на контакт в карточке сделки
      const contactLink = document.querySelector<HTMLAnchorElement>(
        '.card-header__person-link, .linked-form__link[href*="/contacts/detail/"], .linked-form__field__link[data-href*="/contacts/detail/"], .js-linked-name-control[data-href*="/contacts/detail/"]'
      );

      if (contactLink) {
        logger.debug('Ссылка на контакт найдена', {
          component: 'AmoCRMService',
          href: contactLink.href,
          dataHref: contactLink.getAttribute('data-href'),
          tagName: contactLink.tagName,
          className: contactLink.className
        });

        // Проверяем href или data-href атрибут
        const contactUrl = contactLink.href || contactLink.getAttribute('data-href');
        const match = contactUrl?.match(/\/contacts\/detail\/(\d+)/);

        if (match) {
          const contactId = match[1];
          logger.debug('ID контакта успешно извлечен из URL', {
            component: 'AmoCRMService',
            contactId,
            url: contactUrl
          });
          return contactId;
        } else {
          logger.warn('Не удалось извлечь ID контакта из URL', {
            component: 'AmoCRMService',
            url: contactLink.href,
            regex: '/contacts/detail/(\\d+)'
          });
        }
      } else {
        logger.warn('Ссылка на контакт не найдена в DOM', {
          component: 'AmoCRMService',
          selectors: '.card-header__person-link, .linked-form__link[href*="/contacts/detail/"]'
        });
      }

      return null;

    } catch (error) {
      logger.error('Ошибка парсинга ID контакта из DOM', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }

  /**
   * Получить все контакты из карточки сделки
   */
  getAllContactsFromDeal(): DealContact[] {
    try {
      logger.debug('Начинаем поиск всех контактов в карточке сделки', {
        component: 'AmoCRMService'
      });

      // Ищем все элементы контактов в карточке сделки
      // Каждый контакт находится в .linked-forms__item с data-main-item="true"
      const contactElements = document.querySelectorAll('.linked-forms__item[data-main-item="true"]');

      logger.debug('Найдены элементы контактов', {
        component: 'AmoCRMService',
        count: contactElements.length,
        selectors: '.linked-forms__item[data-main-item="true"]'
      });

      const contacts: DealContact[] = [];

      contactElements.forEach((element, index) => {
        try {
          // Ищем ссылку на контакт в текущем элементе
          const contactLink = element.querySelector<HTMLAnchorElement>(
            '.linked-form__field__link[data-href*="/contacts/detail/"], .js-linked-name-control[data-href*="/contacts/detail/"]'
          );

          if (contactLink) {
            // Извлекаем URL контакта
            const contactUrl = contactLink.href || contactLink.getAttribute('data-href');
            const match = contactUrl?.match(/\/contacts\/detail\/(\d+)/);

            if (match) {
              const contactId = match[1];

              // Извлекаем имя контакта из текста ссылки
              const contactName = contactLink.textContent?.trim() || `Контакт ${contactId}`;

              contacts.push({
                contactId,
                contactName,
                containerElement: element
              });

              logger.debug('Контакт успешно обработан', {
                component: 'AmoCRMService',
                contactId,
                contactName,
                elementIndex: index
              });
            } else {
              logger.warn('Не удалось извлечь ID контакта из элемента', {
                component: 'AmoCRMService',
                elementIndex: index,
                contactUrl
              });
            }
          } else {
            logger.debug('Элемент не содержит ссылки на контакт', {
              component: 'AmoCRMService',
              elementIndex: index,
              elementClass: element.className
            });
          }
        } catch (error) {
          logger.error('Ошибка обработки элемента контакта', {
            component: 'AmoCRMService',
            elementIndex: index,
            error: error instanceof Error ? error.message : String(error)
          }, error instanceof Error ? error : new Error(String(error)));
        }
      });

      logger.info('Поиск контактов завершен', {
        component: 'AmoCRMService',
        totalContacts: contacts.length,
        foundContacts: contacts.map(c => ({ id: c.contactId, name: c.contactName }))
      });

      return contacts;

    } catch (error) {
      logger.error('Ошибка поиска контактов в карточке сделки', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return [];
    }
  }

  /**
   * Получить subdomain аккаунта
   */
  getSubdomain(): string {
    logger.debug('Получение subdomain аккаунта', {
      component: 'AmoCRMService',
      method: 'getSubdomain'
    });

    try {
      const subdomain = window.AMOCRM?.widgets?.system?.subdomain || '';

      logger.debug('Subdomain аккаунта получен', {
        component: 'AmoCRMService',
        subdomain: subdomain || 'не найден',
        hasWidgets: !!(window as any).AMOCRM?.widgets,
        hasSystem: !!(window as any).AMOCRM?.widgets?.system
      });

      return subdomain;

    } catch (error) {
      logger.error('Ошибка получения subdomain аккаунта', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return '';
    }
  }

  /**
   * Получить hash пользователя
   */
  getUserHash(): string {
    logger.debug('Получение hash пользователя', {
      component: 'AmoCRMService',
      method: 'getUserHash'
    });

    try {
      const userHash = window.AMOCRM?.widgets?.system?.amohash || '';

      logger.debug('Hash пользователя получен', {
        component: 'AmoCRMService',
        userHash: userHash ? 'получен' : 'не найден',
        hasWidgets: !!(window as any).AMOCRM?.widgets,
        hasSystem: !!(window as any).AMOCRM?.widgets?.system
      });

      return userHash;

    } catch (error) {
      logger.error('Ошибка получения hash пользователя', {
        component: 'AmoCRMService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return '';
    }
  }

  /**
   * Проверить, доступен ли AMOCRM объект
   */
  isAmoCRMAvailable(): boolean {
    const hasWindow = typeof window !== 'undefined';
    const hasAMOCRM = hasWindow && !!(window as any).AMOCRM;
    const hasData = hasAMOCRM && !!(window as any).AMOCRM.data;
    const hasWidgets = hasAMOCRM && !!(window as any).AMOCRM.widgets;

    logger.debug('Проверка доступности AMOCRM объекта', {
      component: 'AmoCRMService',
      method: 'isAmoCRMAvailable',
      hasWindow,
      hasAMOCRM,
      hasData,
      hasWidgets,
      amocrmVersion: hasAMOCRM ? (window as any).AMOCRM.version || 'unknown' : 'n/a'
    });

    return hasAMOCRM;
  }

  /**
   * Получить element_id по внутреннему ID из notes.views
   * @param internalId - внутренний ID (data-id из DOM)
   * @returns element_id или null если не найдено
   */
  getElementIdByInternalId(internalId: string | number): string | null {
    try {
      logger.debug('Получение element_id по внутреннему ID', {
        component: 'AmoCRMService',
        method: 'getElementIdByInternalId',
        internalId,
        internalIdType: typeof internalId
      });

      const currentCard = window.AMOCRM?.data?.current_card;
      
      let notesViews = currentCard?.notes?.views;

      if (!notesViews || !Array.isArray(notesViews)) {
        const amocrmData = (window as any).AMOCRM?.data;
        
        logger.warn('notes.views недоступен или не является массивом, проверяем альтернативные пути', {
          component: 'AmoCRMService',
          hasCurrentCard: !!currentCard,
          hasNotes: !!currentCard?.notes,
          hasViews: !!notesViews,
          viewsType: notesViews ? typeof notesViews : 'undefined',
          currentCardKeys: currentCard ? Object.keys(currentCard).slice(0, 10) : [],
          notesKeys: currentCard?.notes ? Object.keys(currentCard.notes).slice(0, 10) : [],
          amocrmDataKeys: amocrmData ? Object.keys(amocrmData).slice(0, 10) : []
        });

        if (amocrmData && typeof amocrmData === 'object') {
          if (amocrmData.notes?.views && Array.isArray(amocrmData.notes.views)) {
            logger.debug('Найден альтернативный путь: AMOCRM.data.notes.views', {
              component: 'AmoCRMService',
              notesCount: amocrmData.notes.views.length
            });
            notesViews = amocrmData.notes.views;
          }
        }

        if (!notesViews || !Array.isArray(notesViews)) {
          if (currentCard && typeof currentCard === 'object') {
            logger.debug('Структура current_card для диагностики', {
              component: 'AmoCRMService',
              currentCardStructure: JSON.stringify({
                id: currentCard.id,
                element_type: currentCard.element_type,
                hasNotes: !!currentCard.notes,
                notesType: currentCard.notes ? typeof currentCard.notes : 'undefined'
              })
            });
          }

          return null;
        }
      }

      const internalIdStr = String(internalId);
      logger.debug('Начинаем поиск в notes.views', {
        component: 'AmoCRMService',
        internalId: internalIdStr,
        notesCount: notesViews.length
      });

      if (notesViews.length > 0) {
        const firstNote = notesViews[0];
        logger.debug('Структура первого элемента notes.views для диагностики', {
          component: 'AmoCRMService',
          firstNoteKeys: firstNote ? Object.keys(firstNote).slice(0, 20) : [],
          hasView: !!firstNote?.view,
          hasModel: !!firstNote?.view?.model,
          modelKeys: firstNote?.view?.model ? Object.keys(firstNote.view.model).slice(0, 20) : [],
          hasAttributes: !!firstNote?.view?.model?.attributes,
          attributesKeys: firstNote?.view?.model?.attributes ? Object.keys(firstNote.view.model.attributes).slice(0, 20) : [],
          firstNoteSample: firstNote ? {
            hasView: !!firstNote.view,
            hasModel: !!firstNote.view?.model,
            modelType: typeof firstNote.view?.model,
            hasAttributes: !!firstNote?.view?.model?.attributes,
            attributesType: typeof firstNote?.view?.model?.attributes,
            attributesId: firstNote?.view?.model?.attributes?.id,
            attributesElementId: firstNote?.view?.model?.attributes?.element_id
          } : null
        });
      }

      const foundIds: Array<{ noteId: any; elementId: any; noteIdType: string; fullPath: string }> = [];

      for (let i = 0; i < Math.min(notesViews.length, 10); i++) {
        const noteView = notesViews[i];
        const noteId = noteView?.view?.model?.attributes?.id;
        const elementId = noteView?.view?.model?.attributes?.element_id;

        if (noteId) {
          foundIds.push({
            noteId,
            elementId: elementId || null,
            noteIdType: typeof noteId,
            fullPath: `notesViews[${i}].view.model.attributes`
          });
        }
      }

      if (foundIds.length > 0) {
        logger.debug('Примеры ID из notes.views (первые 10)', {
          component: 'AmoCRMService',
          sampleIds: foundIds,
          searchingFor: internalIdStr
        });
      }

      for (const noteView of notesViews) {
        const noteId = noteView?.view?.model?.attributes?.id;
        const elementId = noteView?.view?.model?.attributes?.element_id;

        if (!noteId) {
          continue;
        }

        const noteIdStr = String(noteId);

        if (noteIdStr === internalIdStr) {
          if (elementId) {
            const elementIdStr = String(elementId);
            logger.debug('Найден element_id для внутреннего ID', {
              component: 'AmoCRMService',
              internalId: internalIdStr,
              elementId: elementIdStr,
              noteIdPath: 'view.model.attributes.id'
            });
            return elementIdStr;
          } else {
            logger.warn('Найден внутренний ID, но element_id отсутствует', {
              component: 'AmoCRMService',
              internalId: internalIdStr,
              noteViewStructure: {
                hasView: !!noteView?.view,
                hasModel: !!noteView?.view?.model,
                hasAttributes: !!noteView?.view?.model?.attributes,
                availableKeys: noteView ? Object.keys(noteView).slice(0, 10) : []
              }
            });
          }
        }
      }

      logger.warn('Не найден element_id для внутреннего ID', {
        component: 'AmoCRMService',
        internalId: internalIdStr,
        notesCount: notesViews.length,
        sampleIdsFromNotes: foundIds.slice(0, 5),
        allAvailableIds: foundIds.map(f => String(f.noteId))
      });

      return null;
    } catch (error) {
      logger.error('Ошибка получения element_id по внутреннему ID', {
        component: 'AmoCRMService',
        internalId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      }, error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }

  /**
   * Получить маппинг внутренних ID в element_id для массива ID
   * @param internalIds - массив внутренних ID (data-id из DOM)
   * @returns объект с маппингом { internalId: elementId } и массив настоящих ID для отправки в API
   */
  mapInternalIdsToElementIds(internalIds: string[]): {
    mapping: Record<string, string>;
    elementIds: string[];
    failedIds: string[];
  } {
    try {
      logger.debug('Маппинг внутренних ID в element_id', {
        component: 'AmoCRMService',
        method: 'mapInternalIdsToElementIds',
        internalIdsCount: internalIds.length,
        internalIds: internalIds.slice(0, 10)
      });

      const mapping: Record<string, string> = {};
      const elementIds: string[] = [];
      const failedIds: string[] = [];

      for (const internalId of internalIds) {
        const elementId = this.getElementIdByInternalId(internalId);

        if (elementId) {
          mapping[internalId] = elementId;
          elementIds.push(elementId);
        } else {
          failedIds.push(internalId);
        }
      }

      logger.info('Маппинг внутренних ID завершен', {
        component: 'AmoCRMService',
        total: internalIds.length,
        mapped: elementIds.length,
        failed: failedIds.length,
        failedIds: failedIds.slice(0, 5)
      });

      return { mapping, elementIds, failedIds };
    } catch (error) {
      logger.error('Ошибка маппинга внутренних ID в element_id', {
        component: 'AmoCRMService',
        internalIdsCount: internalIds.length,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      return {
        mapping: {},
        elementIds: [],
        failedIds: internalIds
      };
    }
  }
}

export const amocrmService = new AmoCRMService();
