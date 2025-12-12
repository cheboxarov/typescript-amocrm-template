import { renderHook, act } from '@testing-library/react';
import { useCallVisibilityFilter } from '../useCallVisibilityFilter';
import { domParserService } from '@services/domParser';
import { callsAPI } from '@services/callsApi';
import { callVisibilityService } from '@services/callVisibilityService';
import { logger } from '@utils/logger';
import { sha256Hash } from '@utils/hash';

// Мокаем все зависимости
jest.mock('@services/domParser');
jest.mock('@services/callsApi');
jest.mock('@services/callVisibilityService');
jest.mock('@utils/logger');
jest.mock('@utils/hash');

const mockDomParser = domParserService as jest.MockedObject<typeof domParserService>;
const mockCallsApi = callsAPI as jest.MockedObject<typeof callsAPI>;
const mockCallVisibilityService = callVisibilityService as jest.MockedObject<typeof callVisibilityService>;
const mockLogger = logger as jest.MockedObject<typeof logger>;
const mockHash = sha256Hash as jest.MockedFunction<typeof sha256Hash>;

describe('useCallVisibilityFilter', () => {
  const mockCalls = [
    { id: 'call-1', date: '2023-01-01', type: 'incoming' as const, duration: '00:01:00', phone: '+1234567890', userId: 'user-1', userName: 'User 1', recordingUrl: null, downloadUrl: null, status: 'completed', provider: 'provider1', link: 'https://example.com/call-1' },
    { id: 'call-2', date: '2023-01-02', type: 'outgoing' as const, duration: '00:02:00', phone: '+0987654321', userId: 'user-2', userName: 'User 2', recordingUrl: null, downloadUrl: null, status: 'completed', provider: 'provider1', link: 'https://example.com/call-2' },
  ];

  const mockAssignments = {
    'hash-https://example.com/call-1': { deal_id: 'deal-123', contact_id: 'contact-1' },
    'hash-https://example.com/call-2': { deal_id: 'deal-456', contact_id: 'contact-2' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHash.mockImplementation(async (value: string) => `hash-${value}`);
    // Настраиваем моки по умолчанию
    mockDomParser.parseCallsFromDOM.mockReturnValue(mockCalls);
    mockCallsApi.getCallsDealAssignment.mockResolvedValue(mockAssignments);
    mockCallVisibilityService.hideCalls = jest.fn();
    mockCallVisibilityService.showCalls = jest.fn();
    mockCallVisibilityService.showAllCalls = jest.fn();
  });

  describe('checkAndHideCalls', () => {
    it('Парсит звонки из DOM', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // parseCallsFromDOM вызывается 2 раза: при монтировании + в тесте
      expect(mockDomParser.parseCallsFromDOM).toHaveBeenCalledTimes(2);
    });

    it('Отправляет batch API запрос с корректными call IDs', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      expect(mockCallsApi.getCallsDealAssignment).toHaveBeenCalledWith([
        'hash-https://example.com/call-1',
        'hash-https://example.com/call-2',
      ]);
    });

    it('Скрывает звонки, не принадлежащие сделке', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // call-2 принадлежит deal-456, поэтому должен быть скрыт
      expect(mockCallVisibilityService.hideCalls).toHaveBeenCalledWith(new Set(['call-2']));
      // call-1 принадлежит deal-123, поэтому должен быть показан
      expect(mockCallVisibilityService.showCalls).toHaveBeenCalledWith(new Set(['call-1']));
    });

    it('Скрывает звонки без ссылки и не делает API запрос', async () => {
      mockDomParser.parseCallsFromDOM.mockReturnValue([
        { id: 'call-no-link', date: '2023-01-03', type: 'incoming' as const, duration: '00:00:00', phone: '+111', userId: 'user-3', userName: 'User 3', recordingUrl: null, downloadUrl: null, status: 'Не дозвонился', provider: 'provider1', link: null },
      ]);

      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      expect(mockCallsApi.getCallsDealAssignment).not.toHaveBeenCalled();
      expect(mockCallVisibilityService.hideCalls).toHaveBeenCalledWith(new Set(['call-no-link']));
      expect(mockCallVisibilityService.showCalls).not.toHaveBeenCalled();
    });

    it('Показывает звонки, принадлежащие сделке', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // call-1 принадлежит deal-123, поэтому должен быть показан
      expect(mockCallVisibilityService.showCalls).toHaveBeenCalledWith(new Set(['call-1']));
    });


    it('Обрабатывает ошибки API корректно', async () => {
      mockCallsApi.getCallsDealAssignment.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Ошибка при фильтрации звонков',
        {
          action: 'filter_error',
          component: 'useCallVisibilityFilter',
          dealId: 'deal-123',
          error: 'API Error'
        }
      );
    });

    it('Не отправляет запрос если dealId === null', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter(null));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      expect(mockCallsApi.getCallsDealAssignment).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Фильтрация отключена - нет dealId',
        {
          component: 'useCallVisibilityFilter',
          dealId: null
        }
      );
    });

  });

  describe('showAllCalls', () => {
    it('Показывает все скрытые звонки', () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      act(() => {
        result.current.showAllCalls();
      });

      expect(mockCallVisibilityService.showAllCalls).toHaveBeenCalledTimes(1);
    });
  });


  describe('Логирование', () => {
    it('Логирует начало проверки принадлежности', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Начинаем проверку принадлежности звонков к сделке',
        expect.objectContaining({
          component: 'useCallVisibilityFilter',
          dealId: 'deal-123'
        })
      );
    });

    it('Логирует получение данных из DOM', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получены данные из DOM для анализа',
        expect.objectContaining({
          component: 'useCallVisibilityFilter',
          action: 'dom_data_received',
          dealId: 'deal-123',
          domCallsCount: 2
        })
      );
    });

    it('Логирует отправку batch запроса при первом запуске', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // При первом запуске кэш пуст, поэтому отправляется API запрос
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Отправка запроса на проверку принадлежности звонков',
        expect.objectContaining({
          component: 'useCallVisibilityFilter',
          action: 'api_request_start',
          dealId: 'deal-123',
          pendingCount: 2
        })
      );
    });

    it('Использует кэш при повторном вызове', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      // Первый вызов - кэш пуст
      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // Сбрасываем счетчики вызовов
      mockLogger.info.mockClear();
      mockCallsApi.getCallsDealAssignment.mockClear();

      // Второй вызов - данные должны быть в кэше
      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // Должен логироваться cache_hit_all, а не api_request_start
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Все звонки найдены в кэше, пропускаем API запрос',
        expect.objectContaining({
          component: 'useCallVisibilityFilter',
          action: 'cache_hit_all',
          dealId: 'deal-123',
          cachedCount: 2
        })
      );

      // API не должен вызываться повторно
      expect(mockCallsApi.getCallsDealAssignment).not.toHaveBeenCalled();
    });

    it('Логирует результаты фильтрации', async () => {
      const { result } = renderHook(() => useCallVisibilityFilter('deal-123'));

      await act(async () => {
        await result.current.checkAndHideCalls();
      });

      // Результаты фильтрации логируются
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Завершена фильтрация звонков',
        expect.objectContaining({
          component: 'useCallVisibilityFilter',
          action: 'filter_process_end',
          dealId: 'deal-123',
          totalCalls: 2,
          hiddenCalls: 1,
          shownCalls: 1
        })
      );
    });
  });

  describe('Автоматический запуск', () => {
    it('Запускает фильтрацию при первом монтировании', () => {
      renderHook(() => useCallVisibilityFilter('deal-123'));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Первый запуск фильтрации после монтирования компонента',
        expect.objectContaining({
          component: 'useCallVisibilityFilter',
          dealId: 'deal-123',
          action: 'initial_filter_start'
        })
      );
    });

    it('Не запускает фильтрацию если dealId не задан', () => {
      renderHook(() => useCallVisibilityFilter(null));

      // Не должно быть вызова checkAndHideCalls при монтировании
      expect(mockDomParser.parseCallsFromDOM).not.toHaveBeenCalled();
    });
  });

});
