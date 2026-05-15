import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
}

export function Card({
  children,
  elevated,
  className = '',
  ...rest
}: CardProps) {
  const surface = elevated ? 'bg-white/[0.035]' : 'bg-white/[0.025]';
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] ${surface} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
