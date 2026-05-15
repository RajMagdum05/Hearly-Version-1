export function PulseRing({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
      aria-hidden
    >
      <span className="absolute h-24 w-24 animate-pulse-ring rounded-full border border-hearly-accent/30" />
    </span>
  );
}
