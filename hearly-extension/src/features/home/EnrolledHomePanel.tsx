import { ListeningWaveform } from '@/ui/animations/ListeningWaveform';
import { AudioWaveform } from '@/ui/shared/AudioWaveform';

export interface EnrolledHomePanelProps {
  userName: string;
  filterActive: boolean;
  analyser: AnalyserNode | null;
  capturing: boolean;
}

/**
 * Home screen after enrollment — identity line, dot strip (no chrome), helper copy.
 */
export function EnrolledHomePanel({
  userName,
  filterActive,
  analyser,
  capturing,
}: EnrolledHomePanelProps) {
  return (
    <section className="flex w-full shrink-0 flex-col items-center px-0.5">
      <p className="max-w-[300px] text-center text-[14px] font-medium leading-snug tracking-[-0.02em] text-white">
        Voice Enrolled for{' '}
        <span className="font-semibold text-hearly-accent">{userName}</span>
      </p>

      {capturing && (
        <div className="mt-4 w-full max-w-[300px] rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-hearly-tertiary">
            Live Audio
          </p>
          <AudioWaveform analyser={analyser} isActive={capturing} />
        </div>
      )}

      <div
        className="mt-5 w-full max-w-[300px] px-0.5"
        role="status"
        aria-label={
          filterActive ? 'Voice filter active' : 'Voice filter paused'
        }
      >
        <ListeningWaveform energetic={filterActive} className="w-full" />
      </div>

      <p className="mt-5 max-w-[280px] text-center text-[11px] font-normal leading-relaxed tracking-[-0.01em] text-hearly-secondary">
        {filterActive
          ? 'Hearly is listening for your enrolled voice.'
          : 'Turn Hearly on to filter and listen in real time.'}
      </p>
    </section>
  );
}
