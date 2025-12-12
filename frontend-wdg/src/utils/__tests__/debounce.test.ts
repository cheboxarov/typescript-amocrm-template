import { debounce, createDebouncedStoreUpdater } from '../debounce';
import { logger } from '../logger';

// Мокаем logger чтобы он не выводил в консоль во время тестов
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

describe('debounce', () => {
  let mockFn: jest.Mock;
  let debouncedFn: (...args: any[]) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFn = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('Функция не вызывается немедленно', () => {
    debouncedFn = debounce(mockFn, 100);

    debouncedFn();

    expect(mockFn).not.toHaveBeenCalled();
  });

  it('Функция вызывается один раз после задержки', () => {
    debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('Множественные вызовы отменяют предыдущие', () => {
    debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    jest.advanceTimersByTime(50);
    debouncedFn();
    jest.advanceTimersByTime(50);
    debouncedFn();
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('Функция вызывается с последними аргументами', () => {
    debouncedFn = debounce(mockFn, 100);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('third');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('third');
  });

  it('immediate: true вызывает функцию немедленно', () => {
    debouncedFn = debounce(mockFn, 100, true);

    debouncedFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('immediate: true не вызывает функцию повторно после задержки', () => {
    debouncedFn = debounce(mockFn, 100, true);

    debouncedFn();
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('Контекст (this) сохраняется', () => {
    const context = { value: 42 };
    const mockMethod = jest.fn(function(this: typeof context) {
      return this.value;
    });

    debouncedFn = debounce(mockMethod.bind(context), 100);

    debouncedFn();
    jest.advanceTimersByTime(100);

    expect(mockMethod).toHaveBeenCalledTimes(1);
    expect(mockMethod.mock.results[0].value).toBe(42);
  });
});

describe('createDebouncedStoreUpdater', () => {
  let mockUpdater: jest.Mock;
  let mockSet: jest.Mock;
  let debouncedUpdater: (set: any, ...args: any[]) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockUpdater = jest.fn();
    mockSet = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('Возвращает функцию с правильным типом', () => {
    debouncedUpdater = createDebouncedStoreUpdater(mockUpdater, 100);

    expect(typeof debouncedUpdater).toBe('function');
  });

  it('Вызывает logger.debug с правильными параметрами', () => {
    debouncedUpdater = createDebouncedStoreUpdater(mockUpdater, 100, 'testUpdater');

    debouncedUpdater(mockSet, 'arg1', 'arg2');
    jest.advanceTimersByTime(100);

    expect(logger.debug).toHaveBeenCalledWith('Debounced testUpdater', {
      component: 'debounce',
      wait: 100,
      argsCount: 2
    });
  });

  it('Использует значение по умолчанию для имени', () => {
    debouncedUpdater = createDebouncedStoreUpdater(mockUpdater, 100);

    debouncedUpdater(mockSet);
    jest.advanceTimersByTime(100);

    expect(logger.debug).toHaveBeenCalledWith('Debounced store update', {
      component: 'debounce',
      wait: 100,
      argsCount: 0
    });
  });

  it('Использует значение по умолчанию для wait', () => {
    debouncedUpdater = createDebouncedStoreUpdater(mockUpdater);

    debouncedUpdater(mockSet);
    jest.advanceTimersByTime(100);

    expect(logger.debug).toHaveBeenCalledWith('Debounced store update', {
      component: 'debounce',
      wait: 100,
      argsCount: 0
    });
  });

  it('Передает аргументы в оригинальную функцию и вызывает set', () => {
    debouncedUpdater = createDebouncedStoreUpdater(mockUpdater, 100);

    debouncedUpdater(mockSet, 'test', 123, { key: 'value' });
    jest.advanceTimersByTime(100);

    expect(mockUpdater).toHaveBeenCalledWith('test', 123, { key: 'value' });
    expect(mockSet).toHaveBeenCalledWith(mockUpdater.mock.results[0].value);
  });

  it('Применяет debounce логику к обновлению стора', () => {
    debouncedUpdater = createDebouncedStoreUpdater(mockUpdater, 100);

    debouncedUpdater(mockSet, 'first');
    debouncedUpdater(mockSet, 'second');
    jest.advanceTimersByTime(100);

    expect(mockUpdater).toHaveBeenCalledTimes(1);
    expect(mockUpdater).toHaveBeenCalledWith('second');
    expect(mockSet).toHaveBeenCalledTimes(1);
  });
});
