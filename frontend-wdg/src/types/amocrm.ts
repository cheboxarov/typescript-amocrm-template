// AmoCRM типы для интеграции виджета

/**
 * Тип элемента в amoCRM
 */
export enum EntityType {
  Contact = 1,
  Lead = 2,
}

/**
 * Атрибуты note в AmoCRM
 */
export interface AmoCRMNoteAttributes {
  id: string | number;
  element_id: string | number;
}

/**
 * Модель note в AmoCRM
 */
export interface AmoCRMNoteModel {
  attributes: AmoCRMNoteAttributes;
}

/**
 * Объект view внутри элемента notes.views
 */
export interface AmoCRMNoteViewItem {
  model: AmoCRMNoteModel;
}

/**
 * Представление note в AmoCRM
 */
export interface AmoCRMNoteView {
  view: AmoCRMNoteViewItem;
}

/**
 * Текущая карточка в amoCRM
 */
export interface AmoCRMCurrentCard {
  id: number;
  element_type: EntityType;
  notes?: {
    views: AmoCRMNoteView[];
  };
}

/**
 * Данные текущей сущности
 */
export type CurrentEntity = 'contacts' | 'leads' | 'companies' | 'customers';

/**
 * AmoCRM data object
 */
export interface AmoCRMData {
  current_entity: CurrentEntity;
  current_card: AmoCRMCurrentCard;
}

/**
 * Контакт в карточке сделки
 */
export interface DealContact {
  contactId: string;
  contactName: string;
  containerElement: Element;
}

/**
 * Глобальный объект AMOCRM
 */
export interface AMOCRM {
  data: AmoCRMData;
  constant: (key: string) => any;
  widgets: {
    system: {
      area: string;
      amouser: string;
      amohash: string;
      subdomain: string;
    };
  };
}

/**
 * Глобальный объект APP для виджетов amoCRM
 */
export interface APP {
  getWidgetsArea(): string;
  getBaseEntity(): string;
  get_current_card_contacts_data?(): any;
  constant: (key: string) => any;
}

/**
 * Расширение Window для AMOCRM и APP
 */
declare global {
  interface Window {
    AMOCRM: AMOCRM;
    APP: APP;
  }
}
