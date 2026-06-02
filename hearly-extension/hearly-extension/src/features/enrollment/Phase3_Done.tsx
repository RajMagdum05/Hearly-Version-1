import { IconCheck } from '@/ui/shared/icons';

export function Phase3_Done() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-hearly-accent/20 bg-hearly-accent/[0.035] p-5 text-center shadow-[0_0_34px_rgba(181,240,61,0.1),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div
        className="pointer-events-none absolute left-1/2 top-4 h-28 w-28 -translate-x-1/2 rounded-full border border-hearly-accent/10 motion-safe:animate-pulse-ring"
        aria-hidden
      />
      <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-hearly-accent/25 bg-black/25 text-hearly-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <IconCheck width={22} height={22} strokeWidth={2.2} aria-hidden />
      </div>
      <p className="relative mt-4 text-[15px] font-semibold tracking-[-0.02em] text-white">
        Enrollment complete
      </p>
      <p className="relative mx-auto mt-2 max-w-[230px] text-[12px] leading-relaxed text-hearly-secondary">
        Your voice sample has been captured and your profile is ready to use.
      </p>
    </section>
  );
}
