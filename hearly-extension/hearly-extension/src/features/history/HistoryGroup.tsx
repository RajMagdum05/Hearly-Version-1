import type { TranscriptEntry } from '@/utils/types';
import { HistoryCard } from './HistoryCard';

export interface HistoryGroupProps {
  title: string;
  entries: TranscriptEntry[];
  showDate?: boolean;
}

export function HistoryGroup({
  title,
  entries,
  showDate = false,
}: HistoryGroupProps) {
  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-3 flex items-center gap-3 px-0.5">
        <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-hearly-secondary">
          {title}
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.12] to-transparent" />
      </div>
      <div className="flex flex-col gap-2.5">
        {entries.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} showDate={showDate} />
        ))}
      </div>
    </section>
  );
}
