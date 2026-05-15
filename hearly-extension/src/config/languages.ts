import type { AppLanguage } from '@/utils/types';

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  id: AppLanguage;
  label: string;
  historySubtitle: string;
}> = [
  {
    id: 'en',
    label: 'English',
    historySubtitle: 'All your filtered conversations in English',
  },
  {
    id: 'hi',
    label: 'Hindi',
    historySubtitle: 'All your filtered conversations in Hindi',
  },
  {
    id: 'mr',
    label: 'Marathi',
    historySubtitle: 'All your filtered conversations in Marathi',
  },
];

export function languageHistorySubtitle(lang: AppLanguage): string {
  const row = LANGUAGE_OPTIONS.find((l) => l.id === lang);
  return row?.historySubtitle ?? LANGUAGE_OPTIONS[0].historySubtitle;
}
