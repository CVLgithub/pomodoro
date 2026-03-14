import { create } from 'zustand';

import { getTodayDateKey } from '../utils/date';

interface UiState {
  isBootstrapped: boolean;
  selectedCalendarDate: string;
  setBootstrapped: (value: boolean) => void;
  setSelectedCalendarDate: (dateKey: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isBootstrapped: false,
  selectedCalendarDate: getTodayDateKey(),
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  setSelectedCalendarDate: (selectedCalendarDate) => set({ selectedCalendarDate }),
}));

