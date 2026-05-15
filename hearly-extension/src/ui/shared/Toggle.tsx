import type { InputHTMLAttributes } from 'react';

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  /** Softer matte OFF + subtle lime glow ON (Hearly filter row). Default matches legacy switch. */
  appearance?: 'default' | 'premium';
}

/**
 * Apple-style switch — track 44×24px, thumb 20px per product spec.
 */
export function Toggle({
  checked,
  onCheckedChange,
  disabled,
  className = '',
  id,
  appearance = 'default',
  ...rest
}: ToggleProps) {
  const premium = appearance === 'premium';
  const duration = premium
    ? 'duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]'
    : 'duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]';

  const trackChecked = premium
    ? 'bg-hearly-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.12),0_0_0_1px_rgba(181,240,61,0.16),0_0_14px_rgba(181,240,61,0.18)]'
    : 'bg-hearly-accent';
  const trackUnchecked = premium
    ? 'border border-white/[0.09] bg-[#1b1b1b] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_2px_5px_rgba(0,0,0,0.48)]'
    : 'bg-[#2A2A2A]';

  const thumbChecked = premium
    ? 'translate-x-5 bg-white shadow-[0_2px_5px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.3)]'
    : 'translate-x-5 bg-hearly-bg shadow-[0_1px_2px_rgba(0,0,0,0.25)]';
  const thumbUnchecked = premium
    ? 'translate-x-0 bg-[#a8a8a8] shadow-[0_2px_4px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,255,255,0.14)]'
    : 'translate-x-0 bg-[#666666] shadow-[0_1px_2px_rgba(0,0,0,0.25)]';

  return (
    <label
      className={`group/toggle relative inline-flex h-6 w-11 shrink-0 cursor-pointer select-none items-center ${disabled ? 'cursor-not-allowed opacity-35' : ''} ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...rest}
      />
      <span
        className={`pointer-events-none block h-6 w-11 rounded-full transition-[background-color,border-color,box-shadow] ${duration} peer-focus-visible:ring-2 peer-focus-visible:ring-hearly-accent/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-hearly-bg ${
          checked ? trackChecked : trackUnchecked
        } ${premium && !disabled ? 'group-hover/toggle:border-white/[0.13]' : ''}`}
      />
      <span
        className={`pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[transform,background-color,box-shadow] ${duration} ${
          checked ? thumbChecked : thumbUnchecked
        }`}
      />
    </label>
  );
}
