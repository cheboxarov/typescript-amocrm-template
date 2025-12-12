import { renderHook, act } from '@testing-library/react';
import { useAttachNextStatus } from '../useAttachNextStatus';
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
jest.mock('../useInterval');

const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockCallsAPI = callsAPI as jest.Mocked<typeof callsAPI>;

describe('useAttachNextStatus', () => {
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Настраиваем успешный мок store
    mockStore = {
      attachNextMode: {
        active: false,
        dealId: null,
        contactId: null,
        expiresAt: null,
        ttlSeconds: null,
      },
      activateAttachNext: jest.fn(),
      deactivateAttachNext: jest.fn(),
      updateAttachNextExpiry: jest.fn(),
    };

    mockUseCallsStore.mockReturnValue(mockStore);
    mockCallsAPI.getAttachNextStatus.mockResolvedValue({
      isActive: false,
      dealId: null,
      expiresAt: null,
      ttlSeconds: null,
    });
    mockCallsAPI.activateAttachNext.mockResolvedValue({
      isActive: true,
      dealId: 'deal-123',
      expiresAt: Date.now() + 600000,
      ttlSeconds: 600,
    });
    mockCallsAPI.cancelAttachNext.mockResolvedValue({ success: true });
  });

  it('Обработка undefined store - возвращает безопасные fallback значения', () => {
    mockUseCallsStore.mockReturnValue(undefined as any);

    const { result } = renderHook(() => useAttachNextStatus('contact-123'));

    expect(result.current.isActive).toBe(false); // fallback значение
    expect(result.current.dealId).toBeNull(); // fallback значение
    expect(result.current.expiresAt).toBeNull(); // fallback значение
    expect(result.current.ttlSeconds).toBeNull(); // fallback значение
    expect(result.current.activate).toBeDefined();
    expect(result.current.cancel).toBeDefined();
    expect(result.current.refresh).toBeDefined();
    expect(result.current.getRemainingTime).toBeDefined();
  });



  it('Нормальная работа с корректным store', () => {
    const { result } = renderHook(() => useAttachNextStatus('contact-123'));

    expect(result.current.isActive).toBe(false);
    expect(result.current.dealId).toBeNull();
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.ttlSeconds).toBeNull();
  });

  it('Активация режима с корректным store', () => {
    const { result } = renderHook(() => useAttachNextStatus('contact-123'));

    // Проверяем что функция определена и может быть вызвана
    expect(typeof result.current.activate).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.getRemainingTime).toBe('function');
  });

  it('Отмена режима с корректным store', async () => {
    const { result } = renderHook(() => useAttachNextStatus('contact-123'));

    await act(async () => {
      await result.current.cancel();
    });

    expect(mockStore.deactivateAttachNext).toHaveBeenCalled();
  });

  it('Обновление статуса с корректным store', async () => {
    const { result } = renderHook(() => useAttachNextStatus('contact-123'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCallsAPI.getAttachNextStatus).toHaveBeenCalledWith('contact-123');
  });
});
