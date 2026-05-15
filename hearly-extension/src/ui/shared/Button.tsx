import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const variantClass: Record<Variant, string> = {
  primary:
    'rounded-full border border-hearly-accent/30 bg-white/[0.055] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(181,240,61,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:enabled:border-hearly-accent/50 hover:enabled:bg-hearly-accent/[0.09] hover:enabled:text-hearly-accent hover:enabled:shadow-[0_0_24px_rgba(181,240,61,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] active:enabled:scale-[0.99] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.025] disabled:text-hearly-tertiary disabled:shadow-none',
  secondary:
    'rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-2.5 text-sm font-medium text-hearly-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:enabled:border-white/[0.15] hover:enabled:bg-white/[0.05] hover:enabled:text-white active:enabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35',
  danger:
    'rounded-full border border-hearly-danger/35 bg-hearly-danger/[0.045] px-5 py-2.5 text-sm font-medium text-[#ff8a8a] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:enabled:border-[#ff8a8a]/45 hover:enabled:bg-hearly-danger/[0.08] hover:enabled:text-[#ffaaaa] active:enabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const width = fullWidth ? 'w-full' : '';
  return (
    <button
      type="button"
      className={`${variantClass[variant]} ${width} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
