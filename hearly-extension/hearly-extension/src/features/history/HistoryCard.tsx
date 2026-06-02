import type { TranscriptEntry } from '@/utils/types';
import { formatDateHeading, formatTime } from '@/utils/formatters';

export interface HistoryCardProps {
  entry: TranscriptEntry;
  showDate?: boolean;
}

function formatHistoryTimestamp(entry: TranscriptEntry, showDate: boolean): string {
  const time = formatTime(entry.timestamp);
  return showDate ? `${formatDateHeading(entry.timestamp)} - ${time}` : time;
}

export function HistoryCard({ entry, showDate = false }: HistoryCardProps) {
  const isYou = entry.speaker === 'you';
  const speaker = isYou ? 'You' : 'Others';

  return (
    <article className="group rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <p className="line-clamp-3 text-[13px] font-normal leading-relaxed tracking-[-0.01em] text-[#eeeeee]">
        {entry.text}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${
            isYou
              ? 'border-hearly-accent/25 bg-hearly-accent/[0.07] text-hearly-accent'
              : 'border-white/[0.08] bg-white/[0.035] text-hearly-secondary'
          }`}
        >
          {speaker}
        </span>
        <time className="min-w-0 truncate text-right text-[10px] font-medium uppercase tracking-[0.1em] text-hearly-tertiary">
          {formatHistoryTimestamp(entry, showDate)}
        </time>
      </div>
    </article>
  );
}
