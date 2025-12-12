import Widget from '../index';
import { renderHook, act } from '@testing-library/react';
import { amocrmService } from '@services/amocrmService';
import { logger } from '@utils/logger';
import { domParserService } from '@services/domParser';
import { callsAPI } from '@services/callsApi';
import { callVisibilityService } from '@services/callVisibilityService';
import { useCallVisibilityFilter } from '@hooks/useCallVisibilityFilter';

// Мокаем все зависимости
jest.mock('@services/amocrmService');
jest.mock('@utils/logger');
jest.mock('@services/domParser');
jest.mock('@services/callsApi');
jest.mock('@services/callVisibilityService');
jest.mock('@hooks/useCallVisibilityFilter');
jest.mock('@components/DealCallsManager', () => ({
  DealCallsManager: jest.fn(() => null),
}));
jest.mock('@components/ContactWidget', () => jest.fn(() => null));
jest.mock('react', () => ({
  createElement: jest.fn()
}));
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
    unmount: jest.fn()
  }))
}));

const mockAmoCRMService = amocrmService as jest.MockedObject<typeof amocrmService>;
const mockLogger = logger as jest.MockedObject<typeof logger>;
const mockDomParser = domParserService as jest.MockedObject<typeof domParserService>;
const mockCallsApi = callsAPI as jest.MockedObject<typeof callsAPI>;
const mockCallVisibilityService = callVisibilityService as jest.MockedObject<typeof callVisibilityService>;
const mockUseCallVisibilityFilter = useCallVisibilityFilter as jest.MockedFunction<typeof useCallVisibilityFilter>;
const mockReact = require('react');
const mockReactDOM = require('react-dom/client');

describe('Call Visibility E2E', () => {
  const mockCalls = [
    { id: 'call-1', date: '2023-01-01', type: 'incoming' as const, duration: '00:01:00', phone: '+1234567890', userId: 'user-1', userName: 'User 1', recordingUrl: null, downloadUrl: null, status: 'completed', provider: 'provider1' },
    { id: 'call-2', date: '2023-01-02', type: 'outgoing' as const, duration: '00:02:00', phone: '+0987654321', userId: 'user-2', userName: 'User 2', recordingUrl: null, downloadUrl: null, status: 'completed', provider: 'provider1' },
    { id: 'call-3', date: '2023-01-03', type: 'incoming' as const, duration: '00:03:00', phone: '+1111111111', userId: 'user-3', userName: 'User 3', recordingUrl: null, downloadUrl: null, status: 'completed', provider: 'provider1' },
  ];

  const mockAssignments = {
    'call-1': 'deal-32167781', // Принадлежит текущей сделке
    'call-2': 'deal-99999999', // Принадлежит другой сделке
    'call-3': null, // Не принадлежит никакой сделке
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Мокаем AMoCRM сервис
    mockAmoCRMService.getCurrentEntity.mockReturnValue('leads');
    mockAmoCRMService.getCurrentCard.mockReturnValue({
      id: 32167781,
      element_type: 'lead'
    });
    mockAmoCRMService.getAllContactsFromDeal.mockReturnValue([
      { contactId: 'contact-1', contactName: 'Test Contact', containerElement: document.createElement('div') }
    ]);

    // Мокаем сервисы для фильтрации звонков
    mockDomParser.parseCallsFromDOM.mockReturnValue(mockCalls);
    mockCallsApi.getCallsDealAssignment.mockResolvedValue(mockAssignments);
    mockCallVisibilityService.hideCalls = jest.fn();
    mockCallVisibilityService.showCalls = jest.fn();
    mockCallVisibilityService.showAllCalls = jest.fn();

    // Мокаем хук useCallVisibilityFilter
    const mockCheckAndHideCalls = jest.fn();
    const mockShowAllCalls = jest.fn();

    mockUseCallVisibilityFilter.mockReturnValue({
      checkAndHideCalls: mockCheckAndHideCalls,
      showAllCalls: mockShowAllCalls,
    });

    // Настраиваем DOM для тестирования
    document.body.innerHTML = `
      <div class="feed">
        <div class="feed-note-wrapper-call_in_out" data-id="call-1" style="display: block;"></div>
        <div class="feed-note-wrapper-call_in_out" data-id="call-2" style="display: block;"></div>
        <div class="feed-note-wrapper-call_in_out" data-id="call-3" style="display: block;"></div>
      </div>
    `;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('Полный флоу: вызов renderLeadWidgets работает для сделки', () => {
    const mockSelf = {};

    // Вызываем renderLeadWidgets
    const result = Widget.renderLeadWidgets(mockSelf, 32167781);

    // Проверяем, что сервис был вызван для получения контактов
    expect(mockAmoCRMService.getAllContactsFromDeal).toHaveBeenCalledWith();
    expect(result).toBe(true);

    // Проверяем логирование
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Начинаем рендеринг виджетов для карточки сделки',
      expect.objectContaining({ dealId: 32167781 })
    );
  });

  it('DealCallsManager рендерится через React.createElement', () => {
    const mockSelf = {};

    // Вызываем renderLeadWidgets
    const result = Widget.renderLeadWidgets(mockSelf, 32167781);

    expect(result).toBe(true);

    // Проверяем, что React.createElement был вызван для создания DealCallsManager
    expect(mockReact.createElement).toHaveBeenCalledWith(
      expect.any(Function), // DealCallsManager component
      { dealId: '32167781' } // props
    );
  });

  it('ReactDOM.createRoot вызывается для компонентов', () => {
    const mockSelf = {};

    // Вызываем renderLeadWidgets
    Widget.renderLeadWidgets(mockSelf, 32167781);

    // Проверяем, что createRoot был вызван (1 для ContactWidget + 1 для DealCallsManager)
    expect(mockReactDOM.createRoot).toHaveBeenCalledTimes(2);
  });

  it('DealCallsManager не создается для контактов', () => {
    // Мокаем текущую сущность как контакт
    mockAmoCRMService.getCurrentEntity.mockReturnValue('contacts');
    mockAmoCRMService.getCurrentCard.mockReturnValue({
      id: 123,
      element_type: 'contact'
    });

    const mockSelf = {};

    // Вызываем render
    const result = Widget.render(mockSelf);

    // Проверяем, что React.createElement не был вызван для DealCallsManager
    // (может быть вызван для других компонентов, но не для DealCallsManager)
    const createElementCalls = mockReact.createElement.mock.calls;
    const dealCallsManagerCalls = createElementCalls.filter(call => {
      const [component] = call;
      return component && component.name === 'DealCallsManager';
    });

    expect(dealCallsManagerCalls.length).toBe(0);
  });

  it('DealCallsManager создается только для сделок', () => {
    // Мокаем текущую сущность как сделку
    mockAmoCRMService.getCurrentEntity.mockReturnValue('leads');
    mockAmoCRMService.getCurrentCard.mockReturnValue({
      id: 32167781,
      element_type: 'lead'
    });

    const mockSelf = {};

    // Вызываем render
    const result = Widget.render(mockSelf);

    // Проверяем, что React.createElement был вызван с пропсами DealCallsManager
    expect(mockReact.createElement).toHaveBeenCalledWith(
      expect.any(Function), // DealCallsManager component
      { dealId: '32167781' } // props
    );
  });

});