import { Toggle } from '@/ui/shared';
import type { TranscriptEntry } from '@/utils/types';
import { formatTime } from '@/utils/formatters';

export interface TranscriptToggleProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  latestEntry?: TranscriptEntry;
}

export function TranscriptToggle({
  checked,
  onCheckedChange,
  latestEntry,
}: TranscriptToggleProps) {
  return (
    <section className="group shrink-0" aria-labelledby="transcript-toggle-heading">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/[0.11] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
        <div className="min-w-0 flex-1 text-left">
          <p
            id="transcript-toggle-heading"
            className="text-[14px] font-semibold leading-none tracking-[-0.025em] text-white"
          >
            Transcript
          </p>
          <p
            id="transcript-toggle-status"
            className={`mt-1.5 text-[11px] font-normal leading-snug tracking-[-0.01em] transition-colors duration-300 ease-out ${
              checked ? 'text-hearly-secondary' : 'text-hearly-tertiary'
            }`}
          >
            {checked
              ? 'Background speech transcription active'
              : 'Transcript is currently hidden'}
          </p>
        </div>
        <Toggle
          appearance="premium"
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-labelledby="transcript-toggle-heading"
          aria-describedby="transcript-toggle-status"
        />
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${
          checked ? 'mt-2.5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
        aria-hidden={!checked}
      >
        <div className="min-h-0 overflow-hidden">
          <article className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,box-shadow] duration-300 ease-out hover:border-white/[0.11] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="line-clamp-2 text-[12px] font-normal leading-relaxed tracking-[-0.01em] text-[#e8e8e8]">
              {latestEntry?.text ?? 'No transcript captured yet.'}
            </p>
            <time className="mt-2 block text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
              {latestEntry ? formatTime(latestEntry.timestamp) : 'Waiting'}
            </time>
          </article>
        </div>
      </div>
    </section>
  );
}
