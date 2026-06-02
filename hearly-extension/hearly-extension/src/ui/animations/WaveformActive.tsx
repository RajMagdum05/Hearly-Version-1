export interface WaveformActiveProps {
  /** When true (filter ON), bars animate in accent lime; when false, muted idle bars */
  energetic: boolean;
  className?: string;
  /** Softer amplitude and timing (enrolled home listening state) */
  calm?: boolean;
}

const BAR_COUNT = 5;
/** Small dots spread across the card — horizontal “loading” style wave */
const CALM_DOT_COUNT = 19;

const STAGGER: ReadonlyArray<
  'delay-0' | 'delay-75' | 'delay-100' | 'delay-150' | 'delay-200'
> = ['delay-0', 'delay-75', 'delay-100', 'delay-150', 'delay-200'];

function CalmDotStrip({ energetic }: { energetic: boolean }) {
  const delayMs = (i: number) => Math.round(i * 42);

  return (
    <div
      className={`flex h-9 w-full min-w-0 items-center justify-between gap-x-0.5 px-0.5 ${
        energetic
          ? 'shadow-[0_0_14px_rgba(181,240,61,0.07)]'
          : ''
      }`}
    >
      {Array.from({ length: CALM_DOT_COUNT }).map((_, i) => (
        <span
          key={i}
          className="flex shrink-0 items-center justify-center"
          aria-hidden
        >
          {energetic ? (
            <span
              className="block h-2 w-2 origin-center rounded-full bg-gradient-to-br from-hearly-accent/80 to-hearly-accent shadow-[0_0_6px_rgba(181,240,61,0.35)] motion-safe:animate-hearly-dot-wave motion-reduce:opacity-80 motion-reduce:animate-none"
              style={{ animationDelay: `${delayMs(i)}ms` }}
            />
          ) : (
            <span
              className="block h-2 w-2 origin-center rounded-full bg-[#4a4a4a] motion-safe:animate-hearly-dot-idle motion-reduce:animate-none motion-reduce:opacity-50"
              style={{ animationDelay: `${delayMs(i)}ms` }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Active / idle meter bars — use `calm` for enrolled home listening UI.
 */
export function WaveformActive({
  energetic,
  className = '',
  calm,
}: WaveformActiveProps) {
  if (calm) {
    return (
      <div className={`flex w-full items-center justify-center ${className}`.trim()}>
        <CalmDotStrip energetic={energetic} />
      </div>
    );
  }

  const activeAnim = 'animate-wave-bar';
  const activeTint = 'bg-hearly-accent';

  return (
    <div
      className={`flex h-14 items-end justify-center gap-1.5 ${
        energetic ? 'shadow-hearly-glow' : ''
      } ${className}`.trim()}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${
            energetic
              ? `${activeAnim} ${activeTint} ${STAGGER[i] ?? 'delay-0'}`
              : 'h-[9px] bg-[#2F2F2F] opacity-80'
          }`}
        />
      ))}
    </div>
  );
}
