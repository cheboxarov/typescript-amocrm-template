/**
 * HTTP клиент для работы с API
 */

const BASE_URL = process.env.BASE_URL || 'https://amo-calls.stream-press.ru';
const DEFAULT_TIMEOUT = 10000; // 10 секунд
const MAX_RETRIES = 3;

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

interface ErrorResponse {
  message: string;
  code?: string;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Выполнение HTTP запроса
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = DEFAULT_TIMEOUT,
      retries = 0,
    } = config;

    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry logic
      if (retries < MAX_RETRIES && this.shouldRetry(error)) {
        await this.delay(Math.pow(2, retries) * 1000); // Экспоненциальная задержка
        return this.request<T>(endpoint, { ...config, retries: retries + 1 });
      }

      throw this.normalizeError(error);
    }
  }

  /**
   * Обработка ошибки ответа
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    let errorData: ErrorResponse;

    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: `HTTP Error ${response.status}: ${response.statusText}`,
      };
    }

    const error = new Error(errorData.message || 'Unknown error');
    (error as any).status = response.status;
    (error as any).code = errorData.code;

    return error;
  }

  /**
   * Нормализация ошибки
   */
  private normalizeError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (error?.name === 'AbortError') {
      return new Error('Request timeout');
    }

    return new Error('Unknown error occurred');
  }

  /**
   * Проверка, нужно ли повторить запрос
   */
  private shouldRetry(error: any): boolean {
    // Retry для сетевых ошибок и таймаутов
    if (error?.name === 'AbortError' || error?.name === 'TypeError') {
      return true;
    }

    // Retry для серверных ошибок (500+)
    if (error?.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET запрос
   */
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST запрос
   */
  async post<T>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT запрос
   */
  async put<T>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE запрос
   */
  async delete<T>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE', body });
  }
}

export const apiClient = new APIClient();
