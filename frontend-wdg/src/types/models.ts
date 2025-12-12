// Модели данных для виджета

/**
 * Тип звонка
 */
export type CallType = 'incoming' | 'outgoing';

/**
 * Объект Call (звонок)
 */
export interface Call {
  id: string; // ID звонка в amoCRM (amo_id)
  date: string; // Дата и время звонка
  type: CallType; // Тип звонка
  duration: string; // Длительность в формате "00:01:19"
  phone: string | null; // Номер телефона
  userId: string; // ID пользователя, совершившего звонок
  userName: string; // Имя пользователя
  recordingUrl: string | null; // URL записи звонка
  downloadUrl: string | null; // URL для скачивания записи
  status: string; // Статус звонка
  provider: string | null; // Провайдер телефонии
  contactId?: string; // ID контакта (опционально)
  dealId?: string | null; // ID привязанной сделки (опционально)
  link?: string | null; // Ссылка на note звонка в AmoCRM
}

/**
 * Объект Deal (сделка)
 */
export interface Deal {
  id: string; // ID сделки в amoCRM
  name: string; // Название сделки
  price?: string; // Цена (опционально)
  status?: string; // Статус сделки
  statusColor?: string; // Цвет статуса (hex)
  pipeline?: string; // Название воронки
  url?: string; // URL сделки в amoCRM
}

/**
 * Ответ API для неразобранных звонков
 */
export interface UnassignedCallsResponse {
  items: Call[]; // Массив звонков
  page: number; // Текущая страница
  total: number; // Общее количество звонков
  hasMore?: boolean; // Есть ли еще страницы
}

/**
 * Состояние режима автопривязки
 */
export interface AttachNextMode {
  active: boolean;
  dealId: string | null;
  expiresAt: number | null;
  contactId: string | null;
  ttlSeconds: number | null; // Общее время активации в секундах
}

/**
 * Ответ API для статуса attach-next
 */
export interface AttachNextStatusResponse {
  isActive?: boolean; // Статус активности режима
  dealId: string | null; // ID сделки для автопривязки (null если не активен)
  expiresAt: number | null; // Unix timestamp в миллисекундах (null если не активен)
  ttlSeconds?: number; // Общее время активации в секундах
}

/**
 * Ответ API для активации attach-next
 */
export interface AttachNextResponse {
  status: 'ok'; // Всегда "ok" при успехе
  expiresAt: number; // Unix timestamp в секундах
  ttlSeconds: number; // Общее время активации в секундах
}

/**
 * Ответ API для отмены attach-next
 */
export interface CancelAttachNextResponse {
  status: 'cancelled'; // Всегда "cancelled" при успехе
}

/**
 * Тело запроса для привязки звонка
 */
export interface AssignCallRequest {
  deal_id: string | null;
}

/**
 * Тело запроса для активации attach-next
 */
export interface AttachNextRequest {
  contact_id: string;
  deal_id: string;
  ttl_seconds: number;
}

/**
 * Тело запроса для отмены attach-next
 */
export interface CancelAttachNextRequest {
  contact_id: string;
}

/**
 * Информация о принадлежности звонка к сделке
 */
export interface CallAssignment {
  deal_id: string | null; // ID сделки или null если не привязан
  contact_id: string; // ID контакта
  created_at: number; // Время создания звонка (timestamp)
  duration: number; // Длительность звонка в секундах
}
