import { renderHook, act } from '@testing-library/react';
import { useUnassignedCalls } from '../useUnassignedCalls';
import { useCallsStore } from '@stores/callsStore';
import { callsAPI } from '@services/callsApi';

// Моки
jest.mock('@stores/callsStore');
jest.mock('@services/callsApi');
jest.mock('@utils/logger');
jest.mock('antd', () => ({
  notification: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockCallsAPI = callsAPI as jest.Mocked<typeof callsAPI>;

describe('useUnassignedCalls', () => {
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Настраиваем успешный мок store
    mockStore = {
      unassignedCalls: [],
      callsLoading: false,
      callsError: null,
      currentPage: 1,
      hasMore: false,
      totalCalls: 0,
      setUnassignedCalls: jest.fn(),
      appendUnassignedCalls: jest.fn(),
      setCallsLoading: jest.fn(),
      setCallsError: jest.fn(),
      setCurrentPage: jest.fn(),
      setHasMore: jest.fn(),
      setTotalCalls: jest.fn(),
      updateCall: jest.fn(),
      removeCall: jest.fn(),
    };

    mockUseCallsStore.mockReturnValue(mockStore);
    mockCallsAPI.getUnassignedCalls.mockResolvedValue({
      items: [
        {
          id: 'call-1',
          contactId: 'contact-123',
          dealId: null,
          createdAt: new Date().toISOString(),
          duration: 120,
        },
      ],
      total: 1,
      hasMore: false,
    });
    mockCallsAPI.assignCallToDeal.mockResolvedValue({
      id: 'call-1',
      dealId: 'deal-123',
    });
    mockCallsAPI.unassignCall.mockResolvedValue({
      id: 'call-1',
      dealId: null,
    });
  });

  it('Обработка undefined store - возвращает безопасные fallback значения', () => {
    mockUseCallsStore.mockReturnValue(undefined as any);

    const { result } = renderHook(() => useUnassignedCalls('contact-123'));

    expect(result.current.calls).toEqual([]); // fallback значение
    expect(result.current.loading).toBe(false); // fallback значение
    expect(result.current.error).toBeNull(); // fallback значение
    expect(result.current.hasMore).toBe(false); // fallback значение
    expect(result.current.loadMore).toBeDefined();
    expect(result.current.refresh).toBeDefined();
    expect(result.current.assignCall).toBeDefined();
    expect(result.current.unassignCall).toBeDefined();
  });



  it('Нормальная работа с корректным store', () => {
    const { result } = renderHook(() => useUnassignedCalls('contact-123'));

    expect(result.current.calls).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it('Загрузка звонков с корректным store', async () => {
    const { result } = renderHook(() => useUnassignedCalls('contact-123'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCallsAPI.getUnassignedCalls).toHaveBeenCalledWith('contact-123', 1, 20);
    expect(mockStore.setUnassignedCalls).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'call-1' }),
    ]);
  });

  it('Привязка звонка к сделке с корректным store', async () => {
    const { result } = renderHook(() => useUnassignedCalls('contact-123'));

    await act(async () => {
      await result.current.assignCall('call-1', 'deal-123');
    });

    expect(mockCallsAPI.assignCallToDeal).toHaveBeenCalledWith('call-1', 'deal-123');
    expect(mockStore.removeCall).toHaveBeenCalledWith('call-1');
  });

  it('Отвязка звонка от сделки с корректным store', async () => {
    const { result } = renderHook(() => useUnassignedCalls('contact-123'));

    await act(async () => {
      await result.current.unassignCall('call-1');
    });

    expect(mockCallsAPI.unassignCall).toHaveBeenCalledWith('call-1');
    expect(mockStore.updateCall).toHaveBeenCalledWith('call-1', { dealId: null });
  });
});
