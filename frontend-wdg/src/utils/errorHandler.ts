/**
 * Утилита для обработки ошибок
 */

import { logger } from '@utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

/**
 * Преобразование ошибки в понятное сообщение
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'Неизвестная ошибка';
  }

  if (error instanceof Error) {
    const errorWithStatus = error as ErrorWithStatus;

    // HTTP ошибки
    if (errorWithStatus.status) {
      switch (errorWithStatus.status) {
        case 400:
          return 'Некорректные данные запроса';
        case 401:
          return 'Требуется авторизация';
        case 403:
          return 'Доступ запрещен';
        case 404:
          return 'Ресурс не найден';
        case 409:
          return 'Конфликт данных';
        case 422:
          return 'Ошибка валидации данных';
        case 429:
          return 'Слишком много запросов. Попробуйте позже';
        case 500:
          return 'Ошибка сервера';
        case 502:
        case 503:
          return 'Сервис временно недоступен';
        case 504:
          return 'Превышено время ожидания ответа';
        default:
          return errorWithStatus.message || 'Ошибка запроса';
      }
    }

    // Таймауты
    if (error.message === 'Request timeout') {
      return 'Превышено время ожидания ответа';
    }

    // Сетевые ошибки
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Ошибка сети. Проверьте подключение к интернету';
    }

    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Произошла непредвиденная ошибка';
}

/**
 * Логирование ошибки (устаревший метод, используйте logger.error)
 * @deprecated Используйте logger.error из @utils/logger
 */
export function logError(error: unknown, context?: string): void {
  logger.error(getErrorMessage(error), {
    component: context || 'errorHandler',
    legacyMethod: true
  }, error instanceof Error ? error : new Error(String(error)));
}

/**
 * Проверка, является ли ошибка сетевой
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'TypeError' ||
      error.message === 'Request timeout' ||
      error.message.includes('fetch') ||
      error.message.includes('network')
    );
  }
  return false;
}

/**
 * Проверка, является ли ошибка серверной (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorWithStatus = error as ErrorWithStatus;
    return (errorWithStatus.status || 0) >= 500;
  }
  return false;
}

/**
 * Проверка, является ли ошибка авторизации
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorWithStatus = error as ErrorWithStatus;
    return errorWithStatus.status === 401 || errorWithStatus.status === 403;
  }
  return false;
}
