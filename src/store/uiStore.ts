import { create } from 'zustand';

import { getTodayDateKey } from '../utils/date';

interface UiState {
  isBootstrapped: boolean;
  selectedCalendarDate: string;
  collapsedTaskTagGroups: Record<string, boolean>;
  setBootstrapped: (value: boolean) => void;
  setSelectedCalendarDate: (dateKey: string) => void;
  toggleTaskTagGroupCollapsed: (groupKey: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isBootstrapped: false,
  selectedCalendarDate: getTodayDateKey(),
  collapsedTaskTagGroups: {},
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  setSelectedCalendarDate: (selectedCalendarDate) => set({ selectedCalendarDate }),
  toggleTaskTagGroupCollapsed: (groupKey) =>
    set((state) => ({
      collapsedTaskTagGroups: {
        ...state.collapsedTaskTagGroups,
        [groupKey]: !state.collapsedTaskTagGroups[groupKey],
      },
    })),
}));
