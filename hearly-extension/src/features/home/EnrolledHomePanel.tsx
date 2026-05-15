import { ListeningWaveform } from '@/ui/animations/ListeningWaveform';

export interface EnrolledHomePanelProps {
  userName: string;
  filterActive: boolean;
}

/**
 * Home screen after enrollment — identity line, dot strip (no chrome), helper copy.
 */
export function EnrolledHomePanel({
  userName,
  filterActive,
}: EnrolledHomePanelProps) {
  return (
    <section className="flex w-full shrink-0 flex-col items-center px-0.5">
      <p className="max-w-[300px] text-center text-[14px] font-medium leading-snug tracking-[-0.02em] text-white">
        Voice Enrolled for{' '}
        <span className="font-semibold text-hearly-accent">{userName}</span>
      </p>

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
