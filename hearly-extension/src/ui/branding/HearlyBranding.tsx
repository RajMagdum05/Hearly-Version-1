import type { ReactNode } from 'react';
import { HearlyLogoMark, type LogoSize } from '@/ui/shared/HearlyLogoMark';

export interface HearlyBrandingProps {
  /** Primary product name (split Hear / ly when exactly "Hearly") */
  title?: string;
  /** Secondary version line */
  versionLabel?: string;
  /** Short tagline under the version */
  tagline?: string;
  /** Logo size — passed through to `HearlyLogoMark` */
  logoSize?: LogoSize;
  /** Soft halo behind the mark (default on for subtle depth) */
  logoGlow?: boolean;
  /** Wave motion on logo bars */
  logoAnimated?: boolean;
  /** Extra classes on the outer section */
  className?: string;
  /** Space between logo and title block (Tailwind spacing scale) */
  gapAfterLogo?: string;
  /** Space between version and tagline */
  gapVersionToTagline?: string;
  /** Optional compact action in the branding corner */
  cornerAction?: ReactNode;
}

const TAGLINE_LEAD = 'Cut the Noise, ';
const TAGLINE_ACCENT = 'Keep the Talk.';

const defaults = {
  title: 'Hearly',
  versionLabel: 'Version 1',
  tagline: `${TAGLINE_LEAD}${TAGLINE_ACCENT}`,
  gapAfterLogo: 'mt-5',
  gapVersionToTagline: 'mt-3',
} as const;

function BrandTagline({
  tagline,
  className,
}: {
  tagline: string;
  className: string;
}) {
  if (tagline === `${TAGLINE_LEAD}${TAGLINE_ACCENT}`) {
    return (
      <p
        className={`max-w-[280px] text-[13px] font-semibold leading-[1.5] tracking-[-0.01em] ${className}`}
      >
        <span className="text-hearly-secondary/95">{TAGLINE_LEAD}</span>
        <span className="text-hearly-accent">{TAGLINE_ACCENT}</span>
      </p>
    );
  }
  return (
    <p
      className={`max-w-[280px] text-[13px] font-semibold leading-[1.5] tracking-[-0.01em] text-hearly-secondary/95 ${className}`}
    >
      {tagline}
    </p>
  );
}

function BrandWordmark({ title }: { title: string }) {
  if (title === 'Hearly') {
    return (
      <h1 className="text-[24px] font-bold leading-[1.05] tracking-[-0.03em]">
        <span className="text-white">Hear</span>
        <span className="text-hearly-accent">ly</span>
      </h1>
    );
  }
  return (
    <h1 className="text-[24px] font-bold leading-[1.05] tracking-[-0.03em] text-white">
      {title}
    </h1>
  );
}

/**
 * Centered branding block — identity, subtle version, premium tagline.
 */
export function HearlyBranding({
  title = defaults.title,
  versionLabel = defaults.versionLabel,
  tagline = defaults.tagline,
  logoSize = 'md',
  logoGlow = true,
  logoAnimated = true,
  className = '',
  gapAfterLogo = defaults.gapAfterLogo,
  gapVersionToTagline = defaults.gapVersionToTagline,
  cornerAction,
}: HearlyBrandingProps) {
  return (
    <section
      className={`relative shrink-0 overflow-hidden border-b border-white/[0.045] bg-hearly-bg px-5 pb-5 pt-5 ${className}`}
      aria-label="Product"
    >
      {/* Very soft ambient behind logo only */}
      <div
        className="pointer-events-none absolute left-1/2 top-6 h-20 w-36 -translate-x-1/2 rounded-full bg-hearly-accent/[0.045] blur-3xl"
        aria-hidden
      />
      {cornerAction ? (
        <div className="absolute right-4 top-7 z-20">{cornerAction}</div>
      ) : null}

      <div className="relative flex flex-col items-center text-center">
        <div className="relative">
          <HearlyLogoMark
            size={logoSize}
            glow={logoGlow}
            animated={logoAnimated}
          />
        </div>

        <div className={`flex w-full max-w-[300px] flex-col items-center ${gapAfterLogo}`}>
          <BrandWordmark title={title} />
          <p
            className="mt-2.5 text-xs tabular-nums text-hearly-secondary motion-reduce:animate-none motion-safe:animate-hearly-version [font-variation-settings:'wght'_520]"
          >
            {versionLabel}
          </p>
          <BrandTagline tagline={tagline} className={gapVersionToTagline} />
        </div>
      </div>
    </section>
  );
}
