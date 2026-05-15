import type { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'muted' | 'accent';
}

export function Badge({
  children,
  variant = 'muted',
  className = '',
  ...rest
}: BadgeProps) {
  const tone =
    variant === 'accent'
      ? 'border border-hearly-accent/25 bg-hearly-accent/[0.07] text-hearly-accent'
      : 'border border-white/[0.08] bg-white/[0.025] text-hearly-secondary';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ${tone} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
