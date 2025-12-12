import Widget from '../index';
import { amocrmService } from '@services/amocrmService';
import { logger } from '@utils/logger';

// Мокаем все зависимости
jest.mock('@components/DealCallsManager', () => ({
  DealCallsManager: jest.fn(() => null),
}));
jest.mock('@components/ContactWidget', () => jest.fn(() => null));
jest.mock('@services/amocrmService');
jest.mock('@utils/logger');
jest.mock('react', () => ({
  createElement: jest.fn(() => null)
}));
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn()
  }))
}));

// Получаем доступ к мокам
const mockAmoCRMService = amocrmService as jest.MockedObject<typeof amocrmService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockDealCallsManager = require('@components/DealCallsManager').DealCallsManager;
const mockContactWidget = require('@components/ContactWidget');

describe('Widget Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Мокаем AMoCRM сервис для карточки сделки
    mockAmoCRMService.getCurrentEntity.mockReturnValue('leads');
    mockAmoCRMService.getCurrentCard.mockReturnValue({
      id: '123',
      element_type: 'lead'
    });
    mockAmoCRMService.getAllContactsFromDeal.mockReturnValue([
      { contactId: 'contact-1', contactName: 'Contact 1', containerElement: document.createElement('div') },
      { contactId: 'contact-2', contactName: 'Contact 2', containerElement: document.createElement('div') }
    ]);
  });

  it('renderLeadWidgets получает контакты из AMoCRM сервиса', () => {
    const mockSelf = {};

    const result = Widget.renderLeadWidgets(mockSelf, 123);

    expect(mockAmoCRMService.getAllContactsFromDeal).toHaveBeenCalledWith();
    expect(result).toBe(true);
  });

  it('renderLeadWidgets логирует начало рендеринга', async () => {
    const mockSelf = {};

    await Widget.renderLeadWidgets(mockSelf, 123);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Начинаем рендеринг виджетов для карточки сделки',
      expect.objectContaining({ dealId: 123 })
    );
  });

  it('renderLeadWidgets логирует найденные контакты', () => {
    const mockSelf = {};

    Widget.renderLeadWidgets(mockSelf, 123);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Найдены контакты для создания виджетов',
      expect.objectContaining({
        dealId: 123,
        contactsCount: 2
      })
    );
  });

  it('renderLeadWidgets логирует успешное создание виджетов', () => {
    const mockSelf = {};

    Widget.renderLeadWidgets(mockSelf, 123);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Виджеты для карточки сделки успешно созданы',
      expect.objectContaining({
        dealId: 123,
        widgetsCreated: 2
      })
    );
  });

  it('renderLeadWidgets обрабатывает ошибки при получении контактов', () => {
    mockAmoCRMService.getAllContactsFromDeal.mockImplementation(() => {
      throw new Error('API Error');
    });

    const mockSelf = {};

    const result = Widget.renderLeadWidgets(mockSelf, 123);

    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Ошибка рендеринга виджетов для карточки сделки',
      expect.objectContaining({
        component: 'Widget',
        dealId: 123,
        error: 'API Error'
      }),
      expect.any(Error)
    );
  });

  it('renderContactWidget логирует рендеринг виджета контакта', () => {
    const mockSelf = {};

    const result = Widget.renderContactWidget(mockSelf);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Рендеринг виджета для карточки контакта',
      expect.objectContaining({
        component: 'Widget',
        method: 'renderContactWidget'
      })
    );
    expect(typeof result).toBe('boolean');
  });
});