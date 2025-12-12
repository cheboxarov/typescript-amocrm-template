import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttachNextButton from '../AttachNextButton';

// Моки
jest.mock('@hooks/useAttachNextStatus');
jest.mock('@hooks/useAmoCRMContext');
jest.mock('@utils/logger');
jest.mock('@styles/theme', () => ({
  theme: {
    colors: {
      success: '#52c41a',
      border: '#d9d9d9',
      borderLight: '#f0f0f0',
      textSecondary: '#666666',
      bgSecondary: '#f5f5f5',
      bgPrimary: '#ffffff',
    },
    fontWeights: {
      medium: 500,
    },
    fontSizes: {
      xs: '11px',
    },
    spacing: {
      sm: '8px',
    },
  },
}));

const mockUseAttachNextStatus = require('@hooks/useAttachNextStatus').useAttachNextStatus;
const mockUseAmoCRMContext = require('@hooks/useAmoCRMContext').useAmoCRMContext;
const mockLogger = require('@utils/logger').logger;

describe('AttachNextButton', () => {
  const defaultProps = {
    dealId: 'deal-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Настраиваем успешные моки по умолчанию
    mockUseAmoCRMContext.mockReturnValue({
      contactId: 'contact-123',
    });

    mockUseAttachNextStatus.mockReturnValue({
      isActive: false,
      dealId: null,
      expiresAt: null,
      ttlSeconds: null,
      activate: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(0),
    });
  });

  it('Отрисовывается без ошибок с корректным store', () => {
    render(<AttachNextButton {...defaultProps} />);

    expect(screen.getByText('Режим автопривязки не активен')).toBeInTheDocument();
    expect(screen.getByText('Привязать следующий звонок')).toBeInTheDocument();
  });

  it('Обработка undefined store - компонент не падает', () => {
    mockUseAttachNextStatus.mockReturnValue({
      isActive: undefined,
      dealId: undefined,
      expiresAt: undefined,
      ttlSeconds: undefined,
      activate: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
      cancel: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
      refresh: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
      getRemainingTime: jest.fn().mockReturnValue(0),
    });

    // Компонент должен отрисоваться без падения
    expect(() => {
      render(<AttachNextButton {...defaultProps} />);
    }).not.toThrow();

    // Должен показать дефолтный статус
    expect(screen.getByText('Режим автопривязки не активен')).toBeInTheDocument();
  });

  it('Обработка ошибок активации при undefined store', async () => {
    const mockActivate = jest.fn().mockRejectedValue(new Error('Store не инициализирован'));
    const loggerSpy = jest.spyOn(mockLogger, 'error').mockImplementation();

    mockUseAttachNextStatus.mockReturnValue({
      isActive: false,
      dealId: null,
      expiresAt: null,
      ttlSeconds: null,
      activate: mockActivate,
      cancel: jest.fn(),
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(0),
    });

    render(<AttachNextButton {...defaultProps} />);

    const button = screen.getByText('Привязать следующий звонок');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockActivate).toHaveBeenCalledWith('deal-123', 600);
      expect(loggerSpy).toHaveBeenCalledWith('Ошибка переключения AttachNextButton', expect.any(Object), expect.any(Error));
    });

    loggerSpy.mockRestore();
  });

  it('Показывает активный статус когда isActive=true', () => {
    mockUseAttachNextStatus.mockReturnValue({
      isActive: true,
      dealId: 'deal-123',
      expiresAt: Date.now() + 600000,
      ttlSeconds: 600,
      activate: jest.fn(),
      cancel: jest.fn(),
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(300),
    });

    render(<AttachNextButton {...defaultProps} />);

    expect(screen.getByText('Режим автопривязки активен')).toBeInTheDocument();
    expect(screen.getByText('Отменить автопривязку')).toBeInTheDocument();
    expect(screen.getByText('Осталось времени: 5:00')).toBeInTheDocument();
  });

  it('Показывает предупреждение когда активен для другой сделки', () => {
    mockUseAttachNextStatus.mockReturnValue({
      isActive: true,
      dealId: 'deal-456',
      expiresAt: Date.now() + 600000,
      ttlSeconds: 600,
      activate: jest.fn(),
      cancel: jest.fn(),
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(300),
    });

    render(<AttachNextButton {...defaultProps} />);

    expect(screen.getByText('Перенести на эту сделку')).toBeInTheDocument();
    expect(screen.getByText(/Режим уже активен для другой сделки/)).toBeInTheDocument();
  });

  it('Вызывает activate при клике на активацию', async () => {
    const mockActivate = jest.fn().mockResolvedValue(undefined);
    mockUseAttachNextStatus.mockReturnValue({
      isActive: false,
      dealId: null,
      expiresAt: null,
      ttlSeconds: null,
      activate: mockActivate,
      cancel: jest.fn(),
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(0),
    });

    render(<AttachNextButton {...defaultProps} />);

    const button = screen.getByText('Привязать следующий звонок');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockActivate).toHaveBeenCalledWith('deal-123', 600);
    });
  });

  it('Вызывает cancel при клике на отмену', async () => {
    const mockCancel = jest.fn().mockResolvedValue(undefined);
    mockUseAttachNextStatus.mockReturnValue({
      isActive: true,
      dealId: 'deal-123',
      expiresAt: Date.now() + 600000,
      ttlSeconds: 600,
      activate: jest.fn(),
      cancel: mockCancel,
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(300),
    });

    render(<AttachNextButton {...defaultProps} />);

    const button = screen.getByText('Отменить автопривязку');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  it('Использует propContactId вместо контекстного', () => {
    render(<AttachNextButton {...defaultProps} contactId="custom-contact-123" />);

    // Проверяем что useAttachNextStatus вызван с правильным contactId
    expect(mockUseAttachNextStatus).toHaveBeenCalledWith('custom-contact-123');
  });

  it('Использует контекстный contactId когда propContactId не передан', () => {
    render(<AttachNextButton {...defaultProps} />);

    expect(mockUseAttachNextStatus).toHaveBeenCalledWith('contact-123');
  });

  it('Вызывает onAttachNext callback когда передан', async () => {
    const mockOnAttachNext = jest.fn().mockResolvedValue(undefined);
    mockUseAttachNextStatus.mockReturnValue({
      isActive: false,
      dealId: null,
      expiresAt: null,
      ttlSeconds: null,
      activate: jest.fn(),
      cancel: jest.fn(),
      refresh: jest.fn(),
      getRemainingTime: jest.fn().mockReturnValue(0),
    });

    render(<AttachNextButton {...defaultProps} onAttachNext={mockOnAttachNext} />);

    const button = screen.getByText('Привязать следующий звонок');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnAttachNext).toHaveBeenCalledWith('deal-123');
    });
  });
});
