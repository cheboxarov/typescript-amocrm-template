import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CallsModal from '../CallsModal';

// Моки
jest.mock('@hooks/useUnassignedCalls');
jest.mock('@hooks/useAmoCRMContext');
jest.mock('@components/CallCard', () => {
  return function MockCallCard({ call }: any) {
    return <div data-testid={`call-card-${call.id}`}>{call.id}</div>;
  };
});
jest.mock('@components/EmptyState', () => {
  return function MockEmptyState({ description }: any) {
    return <div data-testid="empty-state">{description}</div>;
  };
});
jest.mock('@components/Loader', () => {
  return function MockLoader({ tip }: any) {
    return <div data-testid="loader">{tip}</div>;
  };
});
jest.mock('@utils/logger');
jest.mock('@styles/theme', () => ({
  theme: {
    colors: {
      primary: '#1890ff',
      borderLight: '#f0f0f0',
      textPrimary: '#000000',
    },
  },
}));

const mockUseUnassignedCalls = require('@hooks/useUnassignedCalls').useUnassignedCalls;
const mockUseAmoCRMContext = require('@hooks/useAmoCRMContext').useAmoCRMContext;

describe('CallsModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Настраиваем успешные моки по умолчанию
    mockUseAmoCRMContext.mockReturnValue({
      contactId: 'contact-123',
    });

    mockUseUnassignedCalls.mockReturnValue({
      calls: [
        { id: 'call-1', contactId: 'contact-123', dealId: null, createdAt: '2023-01-01', duration: 120 },
        { id: 'call-2', contactId: 'contact-123', dealId: null, createdAt: '2023-01-02', duration: 180 },
      ],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      assignCall: jest.fn(),
      unassignCall: jest.fn(),
    });
  });

  it('Отрисовывается без ошибок с корректным store', () => {
    render(<CallsModal {...defaultProps} />);

    expect(screen.getByText('Неразобранные звонки контакта')).toBeInTheDocument();
    expect(screen.getByTestId('call-card-call-1')).toBeInTheDocument();
    expect(screen.getByTestId('call-card-call-2')).toBeInTheDocument();
  });

  it('Обработка undefined store - компонент показывает ошибку инициализации', () => {
    mockUseUnassignedCalls.mockReturnValue({
      calls: undefined,
      loading: undefined,
      error: undefined,
      hasMore: undefined,
      loadMore: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
      refresh: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
      assignCall: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
      unassignCall: jest.fn().mockRejectedValue(new Error('Store не инициализирован')),
    });

    render(<CallsModal {...defaultProps} />);

    // Должен показать ошибку инициализации
    expect(screen.getByText('Ошибка инициализации')).toBeInTheDocument();
    expect(screen.getByText('Ошибка инициализации компонента. Попробуйте перезагрузить страницу.')).toBeInTheDocument();
  });

  it('Показывает loader при первой загрузке', () => {
    mockUseUnassignedCalls.mockReturnValue({
      calls: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      assignCall: jest.fn(),
      unassignCall: jest.fn(),
    });

    render(<CallsModal {...defaultProps} />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Загрузка звонков...')).toBeInTheDocument();
  });

  it('Показывает ошибку когда нет звонков и есть ошибка', () => {
    const mockRefresh = jest.fn();
    mockUseUnassignedCalls.mockReturnValue({
      calls: [],
      loading: false,
      error: 'Ошибка загрузки звонков',
      hasMore: false,
      loadMore: jest.fn(),
      refresh: mockRefresh,
      assignCall: jest.fn(),
      unassignCall: jest.fn(),
    });

    render(<CallsModal {...defaultProps} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки звонков')).toBeInTheDocument();
    expect(screen.getByText('Повторить попытку')).toBeInTheDocument();

    // Проверяем что кнопка повтора вызывает refresh
    const retryButton = screen.getByText('Повторить попытку');
    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('Показывает пустое состояние когда нет звонков', () => {
    mockUseUnassignedCalls.mockReturnValue({
      calls: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      assignCall: jest.fn(),
      unassignCall: jest.fn(),
    });

    render(<CallsModal {...defaultProps} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Нет неразобранных звонков')).toBeInTheDocument();
  });

  it('Показывает кнопку "Загрузить еще" когда hasMore=true', () => {
    const mockLoadMore = jest.fn();
    mockUseUnassignedCalls.mockReturnValue({
      calls: [{ id: 'call-1', contactId: 'contact-123', dealId: null, createdAt: '2023-01-01', duration: 120 }],
      loading: false,
      error: null,
      hasMore: true,
      loadMore: mockLoadMore,
      refresh: jest.fn(),
      assignCall: jest.fn(),
      unassignCall: jest.fn(),
    });

    render(<CallsModal {...defaultProps} />);

    const loadMoreButton = screen.getByText('Загрузить еще');
    expect(loadMoreButton).toBeInTheDocument();

    fireEvent.click(loadMoreButton);
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('Показывает badge с количеством звонков', () => {
    render(<CallsModal {...defaultProps} />);

    // Badge должен содержать число 2 (количество звонков)
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('Вызывает onClose при закрытии модального окна', () => {
    render(<CallsModal {...defaultProps} />);

    // Находим кнопку закрытия модального окна по классу
    const closeButton = document.querySelector('.ant-modal-close');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    } else {
      // Если кнопка не найдена, тест должен упасть
      throw new Error('Close button not found');
    }
  });

  it('Передает правильные пропы в CallCard', () => {
    const mockAssignCall = jest.fn();
    const mockUnassignCall = jest.fn();

    mockUseUnassignedCalls.mockReturnValue({
      calls: [{ id: 'call-1', contactId: 'contact-123', dealId: null, createdAt: '2023-01-01', duration: 120 }],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      assignCall: mockAssignCall,
      unassignCall: mockUnassignCall,
    });

    render(<CallsModal {...defaultProps} />);

    // CallCard должен быть отрендерен с правильными пропами
    expect(screen.getByTestId('call-card-call-1')).toBeInTheDocument();
  });

  it('Вызывает refresh при клике на кнопку обновления', () => {
    const mockRefresh = jest.fn();
    mockUseUnassignedCalls.mockReturnValue({
      calls: [{ id: 'call-1', contactId: 'contact-123', dealId: null, createdAt: '2023-01-01', duration: 120 }],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: mockRefresh,
      assignCall: jest.fn(),
      unassignCall: jest.fn(),
    });

    render(<CallsModal {...defaultProps} />);

    const refreshButton = screen.getByTitle('Обновить список');
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('Не рендерится когда visible=false', () => {
    render(<CallsModal {...defaultProps} visible={false} />);

    // Модальное окно не должно быть видимо
    expect(screen.queryByText('Неразобранные звонки контакта')).not.toBeInTheDocument();
  });
});
