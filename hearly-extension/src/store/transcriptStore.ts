import { create } from 'zustand';
import type { TranscriptEntry } from '@/utils/types';

interface TranscriptState {
  isEnabled: boolean;
  entries: TranscriptEntry[];
  liveText: string;
  actions: {
    toggle: () => void;
    setEnabled: (enabled: boolean) => void;
    addEntry: (entry: TranscriptEntry) => void;
    setEntries: (entries: TranscriptEntry[]) => void;
    setLive: (text: string) => void;
    clearAll: () => void;
  };
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  isEnabled: false,
  entries: [],
  liveText: '',
  actions: {
    toggle: () => set((s) => ({ isEnabled: !s.isEnabled })),
    setEnabled: (isEnabled) => set({ isEnabled }),
    addEntry: (entry) =>
      set((s) => ({ entries: [...s.entries, entry], liveText: entry.text })),
    setEntries: (entries) => set({ entries, liveText: entries.at(-1)?.text ?? '' }),
    setLive: (liveText) => set({ liveText }),
    clearAll: () => set({ entries: [], liveText: '' }),
  },
}));
