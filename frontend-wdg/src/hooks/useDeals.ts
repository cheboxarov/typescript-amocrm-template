import { useEffect, useCallback } from 'react';
import { useDealsStore } from '@stores/dealsStore';
import { domParserService } from '@services/domParser';

/**
 * Хук для работы со сделками контакта
 */
export function useDeals(contactId: string | null) {
  const {
    deals,
    dealsLoading,
    dealsError,
    searchQuery,
    setDeals,
    setDealsLoading,
    setDealsError,
    setSearchQuery,
    getFilteredDeals,
  } = useDealsStore();

  // Загрузка сделок из DOM
  const fetchDeals = useCallback(() => {
    if (!contactId) {
      setDealsError('ID контакта не определен');
      return;
    }

    setDealsLoading(true);
    setDealsError(null);

    try {
      // Парсим сделки из DOM
      const parsedDeals = domParserService.parseDealsFromDOM();

      setDeals(parsedDeals);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки сделок';
      setDealsError(message);
      console.error('Error fetching deals:', error);
    } finally {
      setDealsLoading(false);
    }
  }, [contactId, setDeals, setDealsLoading, setDealsError]);

  // Обновление списка сделок
  const refresh = useCallback(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Поиск сделок
  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  // Автоматическая загрузка при изменении contactId
  useEffect(() => {
    if (contactId) {
      fetchDeals();
    }
  }, [contactId, fetchDeals]);

  return {
    deals: getFilteredDeals(),
    allDeals: deals,
    loading: dealsLoading,
    error: dealsError,
    searchQuery,
    refresh,
    search,
  };
}
