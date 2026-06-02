import { create } from 'zustand';

interface FilterState {
  isActive: boolean;
  actions: {
    toggle: () => void;
    setActive: (active: boolean) => void;
  };
}

export const useFilterStore = create<FilterState>((set) => ({
  isActive: false,
  actions: {
    toggle: () => set((s) => ({ isActive: !s.isActive })),
    setActive: (isActive) => set({ isActive }),
  },
}));
