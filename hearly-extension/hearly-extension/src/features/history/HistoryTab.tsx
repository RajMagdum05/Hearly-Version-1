import type { AppLanguage } from '@/utils/types';
import { languageHistorySubtitle } from '@/config/languages';
import { HistoryGroup } from './HistoryGroup';
import type { TranscriptEntry } from '@/utils/types';

export interface HistoryTabProps {
  language: AppLanguage;
  entries: TranscriptEntry[];
}

interface HistorySection {
  id: 'today' | 'yesterday' | 'older';
  title: string;
  entries: TranscriptEntry[];
  showDate?: boolean;
}

function startOfDay(ts = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupHistory(entries: TranscriptEntry[]): HistorySection[] {
  const today = startOfDay();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const grouped: Record<HistorySection['id'], TranscriptEntry[]> = {
    today: [],
    yesterday: [],
    older: [],
  };

  for (const entry of entries) {
    const day = startOfDay(entry.timestamp);
    if (day === today) {
      grouped.today.push(entry);
    } else if (day === yesterday) {
      grouped.yesterday.push(entry);
    } else {
      grouped.older.push(entry);
    }
  }

  const sections: HistorySection[] = [
    { id: 'today', title: 'Today', entries: grouped.today },
    { id: 'yesterday', title: 'Yesterday', entries: grouped.yesterday },
    { id: 'older', title: 'Older', entries: grouped.older, showDate: true },
  ];

  return sections.filter((section) => section.entries.length > 0);
}

export function HistoryTab({ language, entries }: HistoryTabProps) {
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  const sections = groupHistory(sortedEntries);

  return (
    <div className="pb-1">
      <header className="mb-5 px-0.5">
        <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.03em] text-white">
          Transcript History
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-hearly-secondary">
          {languageHistorySubtitle(language)}
        </p>
      </header>
      {entries.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
          <p className="text-[14px] font-medium tracking-[-0.02em] text-white">
            No transcript history yet.
          </p>
          <p className="mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-hearly-tertiary">
            Enable transcript capture to see recent activity here.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <HistoryGroup
            key={section.id}
            title={section.title}
            entries={section.entries}
            showDate={section.showDate}
          />
        ))
      )}
    </div>
  );
}
