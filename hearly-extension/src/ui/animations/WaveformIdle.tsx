/**
 * Dim static waveform — not enrolled; five bars, fixed low height, no animation.
 */
export function WaveformIdle({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex h-12 items-end justify-center gap-1 opacity-40 ${className}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-[6px] w-1 rounded-full bg-[#2A2A2A]"
        />
      ))}
    </div>
  );
}
