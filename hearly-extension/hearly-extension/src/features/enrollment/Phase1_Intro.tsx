import { IconCheck } from '@/ui/shared/icons';

export interface Phase1_IntroProps {
  userName: string;
  onUserNameChange: (v: string) => void;
}

const CHECKLIST = [
  'Choose a quiet place with low background noise',
  'Use your normal speaking voice and pace',
  'Keep the sample short, clear, and natural',
] as const;

const inputClass =
  'w-full rounded-2xl border border-white/[0.08] bg-[#090909]/90 px-4 py-3.5 text-center text-[14px] font-medium text-white shadow-[0_14px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)] outline-none placeholder:text-hearly-tertiary transition-[border-color,background-color,box-shadow] duration-300 ease-out focus:border-hearly-accent/45 focus:bg-[#0D0D0D] focus:shadow-[0_0_0_1px_rgba(181,240,61,0.16),0_0_28px_rgba(181,240,61,0.09),inset_0_1px_0_rgba(255,255,255,0.06)]';

export function Phase1_Intro({
  userName,
  onUserNameChange,
}: Phase1_IntroProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-hearly-secondary">
          Preparation
        </p>
        <ul className="mt-3 space-y-3">
          {CHECKLIST.map((line) => (
            <li
              key={line}
              className="flex items-start gap-3 text-[12px] leading-relaxed text-hearly-secondary"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-hearly-accent/30 bg-hearly-accent/[0.06] text-hearly-accent">
                <IconCheck width={10} height={10} strokeWidth={2.5} aria-hidden />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-5 text-center shadow-[0_18px_44px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.045)]">
        <div
          className="pointer-events-none absolute inset-x-10 -top-16 h-28 rounded-full bg-hearly-accent/[0.045] blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-[244px]">
          <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-white">
            Your Voice Profile
          </h3>
          <p className="mx-auto mt-2 max-w-[220px] text-[12px] leading-relaxed text-hearly-secondary">
            Enter your name to begin voice enrollment.
          </p>
          <input
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            placeholder="Enter your name"
            className={`mt-4 ${inputClass}`}
            aria-label="Your name"
          />
        </div>
      </section>
    </div>
  );
}
