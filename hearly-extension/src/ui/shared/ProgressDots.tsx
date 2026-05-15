export interface ProgressDotsProps {
  total: number;
  activeIndex: number;
}

/**
 * Minimal enrollment progress marker.
 */
export function ProgressDots({ total, activeIndex }: ProgressDotsProps) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={activeIndex + 1}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            i === activeIndex
              ? 'w-7 bg-hearly-accent shadow-[0_0_14px_rgba(181,240,61,0.28)]'
              : i < activeIndex
                ? 'w-3 bg-hearly-accent/45'
                : 'w-3 bg-white/[0.12]'
          }`}
        />
      ))}
    </div>
  );
}
