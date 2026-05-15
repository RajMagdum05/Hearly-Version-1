const BAR_COUNT = 5;

const BASE_DURATION_S = 4.2;
const DURATION_SPREAD = 0.45;

export interface InactiveWaveformProps {
  className?: string;
}

/**
 * Decorative “off” waveform — dim, matte bars, very slow idle motion (no levels / mic).
 */
export function InactiveWaveform({ className = '' }: InactiveWaveformProps) {
  return (
    <div
      className={`flex h-[52px] w-full max-w-[200px] items-end justify-center gap-[6px] opacity-[0.38] motion-reduce:opacity-[0.32] ${className}`.trim()}
      role="presentation"
      aria-hidden
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="h-[24px] w-[2.5px] shrink-0 origin-bottom rounded-full bg-[#2E2E2E] motion-safe:animate-wave-inactive motion-reduce:animate-none"
          style={{
            animationDuration: `${BASE_DURATION_S + (i % 3) * DURATION_SPREAD}s`,
            animationDelay: `${i * 0.24}s`,
          }}
        />
      ))}
    </div>
  );
}
