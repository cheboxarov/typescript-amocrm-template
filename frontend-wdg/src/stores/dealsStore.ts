import { create } from 'zustand';
import { Deal } from '../types/models';

interface DealsState {
  // Состояние сделок
  deals: Deal[];
  dealsLoading: boolean;
  dealsError: string | null;
  searchQuery: string;

  // Actions
  setDeals: (deals: Deal[]) => void;
  setDealsLoading: (loading: boolean) => void;
  setDealsError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Computed
  getFilteredDeals: () => Deal[];

  // Reset
  reset: () => void;
}

const initialState = {
  deals: [],
  dealsLoading: false,
  dealsError: null,
  searchQuery: '',
};

export const useDealsStore = create<DealsState>((set, get) => ({
  ...initialState,

  setDeals: (deals) =>
    set({ deals }),

  setDealsLoading: (loading) =>
    set({ dealsLoading: loading }),

  setDealsError: (error) =>
    set({ dealsError: error }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  getFilteredDeals: () => {
    const { deals, searchQuery } = get();

    if (!searchQuery.trim()) {
      return deals;
    }

    const query = searchQuery.toLowerCase();
    return deals.filter((deal) =>
      deal.name.toLowerCase().includes(query) ||
      deal.id.includes(query)
    );
  },

  reset: () => set(initialState),
}));
