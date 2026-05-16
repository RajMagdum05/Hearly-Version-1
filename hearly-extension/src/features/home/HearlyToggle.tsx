import { Toggle } from '@/ui/shared';

export interface HearlyToggleProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  /** When true, no outer chrome — for use inside a shared controls card */
  embedded?: boolean;
  audioError?: string | null;
}

const headingId = 'hearly-filter-heading';
const statusId = 'hearly-filter-status';

/**
 * Enrolled home — voice filter ON/OFF: label + status, Apple-style switch (below branding).
 */
export function HearlyToggle({
  checked,
  onCheckedChange,
  embedded = false,
  audioError = null,
}: HearlyToggleProps) {
  const shell = embedded
    ? 'group shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/[0.11] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]'
    : 'group shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/[0.11] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]';

  return (
    <section className={shell} aria-labelledby={headingId}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 text-left">
            <p
              id={headingId}
              className="text-[14px] font-semibold leading-none tracking-[-0.025em] text-white"
            >
              Hearly
            </p>
            <p
              id={statusId}
              className={`mt-1.5 text-[11px] font-normal leading-snug tracking-[-0.01em] transition-colors duration-300 ease-out ${
                checked ? 'text-hearly-secondary' : 'text-hearly-tertiary'
              }`}
            >
              {checked
                ? 'Focused voice filtering active'
                : 'Hearly is currently inactive'}
            </p>
          </div>
          <Toggle
            appearance="premium"
            checked={checked}
            onCheckedChange={onCheckedChange}
            aria-labelledby={headingId}
            aria-describedby={statusId}
          />
        </div>
        {audioError && (
          <p className="mt-2 text-[11px] text-red-400 leading-snug">
            ⚠️ {audioError}
          </p>
        )}
      </div>
    </section>
  );
}
