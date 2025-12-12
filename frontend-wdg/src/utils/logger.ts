/**
 * Расширенная система логгирования для виджета
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface LogContext {
  component?: string;
  action?: string;
  entityType?: string;
  entityId?: number | string;
  contactId?: string;
  widgetArea?: string;
  timestamp?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

/**
 * Класс логгера с подробным контекстом
 */
class WidgetLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private allowedComponents: Set<string> | null = null; // null = все компоненты разрешены

  /**
   * Включить фильтр только для компонентов процесса поиска звонков
   */
  enableCallSearchFilter(): void {
    this.allowedComponents = new Set([
      'DOMParserService',
      'CallsAPI',
      'useCallVisibilityFilter'
    ]);
    this.info('Включен фильтр логов только для процесса поиска звонков', {
      component: 'WidgetLogger',
      action: 'filter_enabled',
      allowedComponents: Array.from(this.allowedComponents)
    });
  }

  /**
   * Отключить фильтр (показывать все логи)
   */
  disableCallSearchFilter(): void {
    this.allowedComponents = null;
    this.info('Отключен фильтр логов, показываются все компоненты', {
      component: 'WidgetLogger',
      action: 'filter_disabled'
    });
  }

  /**
   * Безопасная сериализация объектов (избегает циклических ссылок)
   */
  private safeStringify(obj: any): string {
    const seen = new WeakSet();

    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    });
  }

  /**
   * Создание контекста логирования
   */
  private createContext(additionalContext?: LogContext): LogContext {
    return {
      timestamp: new Date().toISOString(),
      ...additionalContext
    };
  }

  /**
   * Форматирование сообщения лога
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toLocaleTimeString();
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `(${context.action})` : '';

    return `${timestamp} ${level} ${component}${action}: ${message}`;
  }

  /**
   * Сохранение лога в памяти (для отладки)
   */
  private saveLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Удаляем старые логи
    }
  }

  /**
   * Базовый метод логирования
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    // Фильтр по компонентам
    if (this.allowedComponents !== null && context?.component) {
      if (!this.allowedComponents.has(context.component)) {
        return; // Пропускаем логи от других компонентов
      }
    }

    const fullContext = this.createContext(context);
    const formattedMessage = this.formatMessage(level, message, fullContext);

    const logEntry: LogEntry = {
      level,
      message,
      context: fullContext,
      error,
      stack: error?.stack
    };

    this.saveLog(logEntry);

    // В продакшене логируем только WARN и выше
    if (!this.isDevelopment && level === LogLevel.DEBUG) {
      return;
    }

    // Вывод в консоль с соответствующим уровнем
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, fullContext);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, fullContext);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, fullContext, error);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage, fullContext, error);
        break;
    }
  }

  /**
   * Логирование отладочной информации
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Логирование информационных сообщений
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Логирование предупреждений
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Логирование ошибок
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Логирование критических ошибок
   */
  critical(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  /**
   * Логирование начала операции
   */
  startOperation(operation: string, context?: LogContext): { end: (result?: any, error?: Error) => void } {
    const startTime = Date.now();
    this.info(`Начало операции: ${operation}`, {
      ...context,
      action: 'start',
      operation
    });

    return {
      end: (result?: any, error?: Error) => {
        const duration = Date.now() - startTime;
        const durationContext = {
          ...context,
          action: error ? 'error' : 'end',
          operation,
          duration
        };

        if (error) {
          this.error(`Операция завершена с ошибкой: ${operation}`, durationContext, error);
        } else {
          this.info(`Операция завершена успешно: ${operation}`, {
            ...durationContext,
            resultType: typeof result,
            hasResult: result !== undefined && result !== null,
            resultKeys: typeof result === 'object' && result !== null ? Object.keys(result) : undefined
          });
        }
      }
    };
  }

  /**
   * Логирование изменения состояния
   */
  stateChange(component: string, prevState: any, newState: any, context?: LogContext): void {
    this.debug(`Изменение состояния в ${component}`, {
      ...context,
      component,
      action: 'state_change',
      prevState: typeof prevState === 'object' ? JSON.stringify(prevState) : prevState,
      newState: typeof newState === 'object' ? JSON.stringify(newState) : newState
    });
  }

  /**
   * Логирование API запросов
   */
  apiRequest(method: string, url: string, params?: any, context?: LogContext): { response: (data?: any, error?: Error) => void } {
    this.info(`API запрос: ${method} ${url}`, {
      ...context,
      action: 'api_request',
      method,
      url,
      params: params ? JSON.stringify(params) : undefined
    });

    const startTime = Date.now();

    return {
      response: (data?: any, error?: Error) => {
        const duration = Date.now() - startTime;
        const responseContext = {
          ...context,
          action: 'api_response',
          method,
          url,
          duration
        };

        if (error) {
          this.error(`API ошибка: ${method} ${url}`, responseContext, error);
        } else {
          this.info(`API успех: ${method} ${url}`, {
            ...responseContext,
            dataSize: data ? JSON.stringify(data).length : 0
          });
        }
      }
    };
  }

  /**
   * Получение всех логов (для отладки)
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Очистка логов
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Экспорт логов в JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Создание единственного экземпляра логгера
export const logger = new WidgetLogger();

// Вспомогательные функции для быстрого логирования
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext, error?: Error) => logger.warn(message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  critical: (message: string, context?: LogContext, error?: Error) => logger.critical(message, context, error),

  // Управление фильтром
  enableCallSearchFilter: () => logger.enableCallSearchFilter(),
  disableCallSearchFilter: () => logger.disableCallSearchFilter(),

  // Специализированные методы
  startOp: (operation: string, context?: LogContext) => logger.startOperation(operation, context),
  stateChange: (component: string, prevState: any, newState: any, context?: LogContext) =>
    logger.stateChange(component, prevState, newState, context),
  apiRequest: (method: string, url: string, params?: any, context?: LogContext) =>
    logger.apiRequest(method, url, params, context)
};
