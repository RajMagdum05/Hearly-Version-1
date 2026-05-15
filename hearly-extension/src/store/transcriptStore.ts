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
    setLive: (text: string) => void;
    clearAll: () => void;
  };
}

/** Sample rows so History matches design previews before live capture ships. */
function seedDemoEntries(): TranscriptEntry[] {
  return [
    {
      id: 'demo-1',
      speaker: 'others',
      text: "Don't forget to pick up groceries on your way home",
      language: 'en',
      category: 'FAMILY',
      timestamp: new Date('2026-05-09T10:30:00').getTime(),
      sessionId: 'demo-session',
    },
    {
      id: 'demo-2',
      speaker: 'you',
      text: 'The quarterly targets look achievable if we prioritize the MVP.',
      language: 'en',
      category: 'POLITICS',
      timestamp: new Date('2026-05-09T11:15:00').getTime(),
      sessionId: 'demo-session',
    },
    {
      id: 'demo-3',
      speaker: 'others',
      text: 'Quick sync tomorrow morning — same link as last week.',
      language: 'en',
      category: 'GENERAL',
      timestamp: new Date('2026-05-09T14:05:00').getTime(),
      sessionId: 'demo-session',
    },
  ];
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  isEnabled: false,
  entries: seedDemoEntries(),
  liveText: '',
  actions: {
    toggle: () => set((s) => ({ isEnabled: !s.isEnabled })),
    setEnabled: (isEnabled) => set({ isEnabled }),
    addEntry: (entry) =>
      set((s) => ({ entries: [...s.entries, entry], liveText: entry.text })),
    setLive: (liveText) => set({ liveText }),
    clearAll: () => set({ entries: [], liveText: '' }),
  },
}));
