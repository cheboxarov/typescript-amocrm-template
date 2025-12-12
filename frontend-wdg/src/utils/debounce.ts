import { logger } from '@utils/logger';

/**
 * Утилита для debounce функций
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func(...args);
    }
  };
}

/**
 * Debounced версия функции для предотвращения множественных вызовов
 * Принимает updater функцию и возвращает функцию, которая принимает set и args
 */
export function createDebouncedStoreUpdater<T extends (...args: any[]) => any>(
  updater: T,
  wait: number = 100,
  name?: string
): (set: (state: any) => void, ...args: Parameters<T>) => void {
  const debounced = debounce((set: (state: any) => void, ...args: Parameters<T>) => {
    logger.debug(`Debounced ${name || 'store update'}`, {
      component: 'debounce',
      wait,
      argsCount: args.length
    });
    set(updater(...args));
  }, wait);

  return (set: (state: any) => void, ...args: Parameters<T>) => {
    debounced(set, ...args);
  };
}
