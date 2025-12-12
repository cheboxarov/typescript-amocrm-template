import React from 'react';
import { render, act } from '@testing-library/react';
import { DealCallsManager } from '../DealCallsManager';
import { useCallVisibilityFilter } from '@hooks/useCallVisibilityFilter';
import { useCallsStore } from '@stores/callsStore';
import { amoMenuService } from '@services/amoMenuService';
import { logger } from '@utils/logger';

// Мокаем зависимости
jest.mock('@hooks/useCallVisibilityFilter');
jest.mock('@stores/callsStore');
jest.mock('@services/amoMenuService');
jest.mock('@utils/logger');
jest.mock('@utils/debounce', () => ({
  debounce: jest.fn((fn) => fn), // Возвращаем оригинальную функцию без debounce для тестов
  createDebouncedStoreUpdater: jest.fn((updater) => updater), // Возвращаем оригинальную функцию без debounce для тестов
}));

const mockUseCallVisibilityFilter = useCallVisibilityFilter as jest.MockedFunction<typeof useCallVisibilityFilter>;
const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockAmoMenuService = amoMenuService as jest.Mocked<typeof amoMenuService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('DealCallsManager', () => {
  let mockCheckAndHideCalls: jest.Mock;
  let mockShowAllCalls: jest.Mock;
  let mockObserver: {
    observe: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Мокаем MutationObserver
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };

    // @ts-ignore - игнорируем типы для мока
    global.MutationObserver = jest.fn(() => mockObserver);

    // Мокаем хук useCallVisibilityFilter
    mockCheckAndHideCalls = jest.fn();
    mockShowAllCalls = jest.fn();

    mockUseCallVisibilityFilter.mockReturnValue({
      checkAndHideCalls: mockCheckAndHideCalls,
      showAllCalls: mockShowAllCalls,
    });

    // Мокаем useCallsStore
    mockUseCallsStore.mockReturnValue({
      toggleShowHiddenCalls: jest.fn(),
      showHiddenCalls: false,
    });

    // Мокаем amoMenuService
    mockAmoMenuService.initialize = jest.fn();
    mockAmoMenuService.destroy = jest.fn();

    // Мокаем DOM
    document.body.innerHTML = `
      <div class="feed">
        <div class="feed-note-wrapper-call_in_out" data-id="call-1"></div>
        <div class="feed-note-wrapper-call_in_out" data-id="call-2"></div>
      </div>
    `;
  });

  afterEach(() => {
    jest.clearAllTimers();
    document.body.innerHTML = '';
  });


  it('Вызывает checkAndHideCalls() при монтировании', () => {
    render(<DealCallsManager dealId="123" />);

    expect(mockCheckAndHideCalls).toHaveBeenCalledTimes(1);
  });

  it('Создает MutationObserver для отслеживания DOM', () => {
    render(<DealCallsManager dealId="123" />);

    expect(global.MutationObserver).toHaveBeenCalledTimes(1);
    expect(mockObserver.observe).toHaveBeenCalledWith(
      expect.any(Element),
      {
        childList: true,
        subtree: true,
      }
    );
  });

  it('Вызывает checkAndHideCalls() при изменении DOM', () => {
    render(<DealCallsManager dealId="123" />);

    // Получаем callback из MutationObserver
    const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];

    // Симулируем добавление нового звонка
    const mockMutation = {
      addedNodes: [
        document.createElement('div')
      ],
      type: 'childList'
    };
    mockMutation.addedNodes[0].classList.add('feed-note-wrapper-call_in_out');

    act(() => {
      observerCallback([mockMutation]);
    });

    // Ждем debounce timeout
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCheckAndHideCalls).toHaveBeenCalledTimes(2); // 1 при монтировании + 1 при мутации
  });

  it('Не реагирует на мутации не связанные со звонками', () => {
    render(<DealCallsManager dealId="123" />);

    const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];

    // Симулируем добавление обычного элемента
    const mockMutation = {
      addedNodes: [
        document.createElement('div')
      ],
      type: 'childList'
    };

    act(() => {
      observerCallback([mockMutation]);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCheckAndHideCalls).toHaveBeenCalledTimes(1); // Только при монтировании
  });

  it('Вызывает showAllCalls() при размонтировании', () => {
    const { unmount } = render(<DealCallsManager dealId="123" />);

    unmount();

    expect(mockShowAllCalls).toHaveBeenCalledTimes(1);
  });

  it('Отключает MutationObserver при размонтировании', () => {
    const { unmount } = render(<DealCallsManager dealId="123" />);

    unmount();

    expect(mockObserver.disconnect).toHaveBeenCalledTimes(1);
  });

  it('Логирует создание MutationObserver', () => {
    render(<DealCallsManager dealId="123" />);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Создание MutationObserver для отслеживания звонков',
      {
        component: 'DealCallsManager',
        dealId: '123'
      }
    );
  });

  it('Логирует запуск начальной проверки', () => {
    render(<DealCallsManager dealId="123" />);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Запуск начальной проверки звонков при монтировании',
      {
        component: 'DealCallsManager',
        dealId: '123'
      }
    );
  });

  it('Логирует обнаружение мутаций', () => {
    render(<DealCallsManager dealId="123" />);

    const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];

    const mockMutation = {
      addedNodes: [document.createElement('div')],
      type: 'childList'
    };

    act(() => {
      observerCallback([mockMutation]);
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Обнаружены мутации в DOM',
      {
        component: 'DealCallsManager',
        mutationsCount: 1,
        dealId: '123'
      }
    );
  });


  it('Предупреждает если контейнер ленты не найден', () => {
    // Удаляем контейнер ленты
    document.body.innerHTML = '';

    render(<DealCallsManager dealId="123" />);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Контейнер ленты активности не найден',
      {
        component: 'DealCallsManager',
        dealId: '123'
      }
    );
  });

  it('Логирует очистку при размонтировании', () => {
    const { unmount } = render(<DealCallsManager dealId="123" />);

    unmount();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Очистка фильтров при размонтировании',
      {
        component: 'DealCallsManager',
        dealId: '123'
      }
    );
  });
});
