import { AudioWaveform } from '@/ui/shared/AudioWaveform';
import { isCloudConfigured } from '@/services/cloudService';

export interface EnrolledHomePanelProps {
  userName: string;
  filterActive: boolean;
  analyser?: AnalyserNode | null;
  capturing?: boolean;
  audioPlatform?: string | null;
  audioError?: string | null;
  voiceScore?: number | null;
  voiceMatched?: boolean | null;
  speechActive?: boolean | null;
  speechConfidence?: number | null;
  transcriptEnabled?: boolean;
}

/**
 * Home screen after enrollment — identity line, dot strip (no chrome), helper copy.
 */
export function EnrolledHomePanel({
  userName,
  filterActive,
  analyser = null,
  capturing = false,
  audioPlatform,
  audioError,
  voiceScore,
  voiceMatched,
  speechActive,
  speechConfidence,
  transcriptEnabled = false,
}: EnrolledHomePanelProps) {
  const platformName =
    audioPlatform && audioPlatform !== 'unknown'
      ? audioPlatform[0].toUpperCase() + audioPlatform.slice(1)
      : 'meeting';

  return (
    <section className="flex w-full shrink-0 flex-col items-center px-0.5">
      <p className="max-w-[300px] text-center text-[14px] font-medium leading-snug tracking-[-0.02em] text-white">
        Voice Enrolled for{' '}
        <span className="font-semibold text-hearly-accent">{userName}</span>
      </p>

      {capturing && (
        <div className="mt-4 w-full max-w-[300px] rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-hearly-tertiary">
              Hearly active on {platformName}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {typeof speechActive === 'boolean' ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    speechActive
                      ? 'border-hearly-accent/30 bg-hearly-accent/[0.08] text-hearly-accent'
                      : 'border-white/[0.08] bg-white/[0.03] text-hearly-secondary'
                  }`}
                >
                  {speechActive ? 'Speech' : 'Quiet'}
                  {typeof speechConfidence === 'number'
                    ? ` ${Math.round(speechConfidence * 100)}%`
                    : ''}
                </span>
              ) : null}
              {typeof voiceScore === 'number' ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    voiceMatched
                      ? 'border-hearly-accent/30 bg-hearly-accent/[0.08] text-hearly-accent'
                      : 'border-white/[0.08] bg-white/[0.03] text-hearly-secondary'
                  }`}
                >
                  {Math.round(voiceScore * 100)}%
                </span>
              ) : null}
            </div>
          </div>
          <AudioWaveform analyser={analyser} isActive={capturing} />
        </div>
      )}

      {audioError && !capturing ? (
        <p className="mt-3 max-w-[280px] text-center text-[11px] font-medium leading-relaxed tracking-[-0.01em] text-hearly-danger">
          {audioError}
        </p>
      ) : null}

      {!isCloudConfigured() && transcriptEnabled && (
        <div className="mt-3 max-w-[280px] rounded-xl border border-hearly-accent/20 bg-hearly-accent/[0.02] p-2.5 text-center text-[10px] font-normal leading-normal text-hearly-secondary">
          <span className="font-semibold text-hearly-accent">Note:</span> Cloud transcription fallback is unconfigured. Local STT model files are required for transcription.
        </div>
      )}

      {!capturing && filterActive && (
        <div className="mt-5 w-full max-w-[300px] px-0.5" role="status" aria-label="Voice filter active">
          <AudioWaveform analyser={null} isActive={true} />
        </div>
      )}

      <p className="mt-5 max-w-[280px] text-center text-[11px] font-normal leading-relaxed tracking-[-0.01em] text-hearly-secondary">
        {filterActive
          ? voiceMatched
            ? 'Your enrolled voice is being detected in the meeting audio.'
            : 'Hearly is processing your meeting audio. Enable it before joining for mic filtering.'
          : 'Turn Hearly on to filter and listen in real time.'}
      </p>
    </section>
  );
}
