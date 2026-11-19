import { create } from 'zustand';

import { getTodayDateKey } from '../utils/date';

export interface ToastMessage {
  id: number;
  message: string;
  /** Beschriftung der optionalen Aktion rechts, z. B. "Bearbeiten". */
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'success';
}

export type ToastInput = Omit<ToastMessage, 'id'>;

interface UiState {
  isBootstrapped: boolean;
  selectedCalendarDate: string;
  toast: ToastMessage | null;
  setBootstrapped: (value: boolean) => void;
  setSelectedCalendarDate: (dateKey: string) => void;
  showToast: (toast: ToastInput) => void;
  hideToast: (id?: number) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set, get) => ({
  isBootstrapped: false,
  selectedCalendarDate: getTodayDateKey(),
  toast: null,
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  setSelectedCalendarDate: (selectedCalendarDate) => set({ selectedCalendarDate }),
  showToast: (toast) => {
    toastCounter += 1;
    set({ toast: { ...toast, id: toastCounter } });
  },
  hideToast: (id) => {
    // Mit `id` schließt nur genau diese Meldung, nicht eine inzwischen neuere.
    if (id !== undefined && get().toast?.id !== id) {
      return;
    }

    set({ toast: null });
  },
}));

/** Kurze, nicht modale Rückmeldung; außerhalb von React aufrufbar (z. B. aus Stores). */
export const showToast = (toast: ToastInput): void => useUiStore.getState().showToast(toast);
