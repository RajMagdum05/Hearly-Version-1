import type { SVGProps } from 'react';
import { useId } from 'react';

export type LogoSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<LogoSize, { w: number; h: number }> = {
  sm: { w: 56, h: 26 },
  md: { w: 72, h: 34 },
  lg: { w: 88, h: 40 },
};

/** Bell-curve heights (11 bars, index 0 = left). */
const BAR_HEIGHTS = [7, 9, 12, 16, 21, 26, 26, 21, 16, 12, 7] as const;

/** Left-to-right fill: dark olive → lime center → mirror. */
const BAR_FILLS = [
  '#3a4229',
  '#4a5532',
  '#5f6d3a',
  '#7a9438',
  '#9ec43a',
  '#B5F03D',
  '#B5F03D',
  '#9ec43a',
  '#7a9438',
  '#5f6d3a',
  '#3a4229',
] as const;

const VIEW_W = 72;
const VIEW_H = 36;
const BAR_W = 3.25;
const GAP = 2.25;
const PAD_X = 3;
const BASELINE = VIEW_H - 4;

function barX(i: number): number {
  return PAD_X + i * (BAR_W + GAP);
}

export interface HearlyLogoMarkProps {
  size?: LogoSize;
  className?: string;
  /** Extra emphasis on center bars (filter glow) */
  glow?: boolean;
  /** Staggered bar motion (audio-meter style) */
  animated?: boolean;
}

/**
 * Hearly waveform mark — 11 pill bars, no outer frame. Optional staggered dance.
 */
export function HearlyLogoMark({
  size = 'md',
  className = '',
  glow,
  animated = true,
}: HearlyLogoMarkProps) {
  const { w, h } = SIZE_PX[size];
  const uid = useId().replace(/:/g, '');
  const filterId = `hearly-logo-glow-${uid}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        {glow ? (
          <filter
            id={filterId}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>
      {BAR_HEIGHTS.map((barH, i) => {
        const cx = barX(i) + BAR_W / 2;
        const fill = BAR_FILLS[i] ?? '#B5F03D';
        const useGlow = Boolean(glow && (i === 5 || i === 6));
        const rectProps: SVGProps<SVGRectElement> = {
          x: -BAR_W / 2,
          y: -barH,
          width: BAR_W,
          height: barH,
          rx: BAR_W / 2,
          ry: BAR_W / 2,
          fill,
          filter: useGlow ? `url(#${filterId})` : undefined,
        };

        return (
          <g key={i} transform={`translate(${cx} ${BASELINE})`}>
            <g
              className={
                animated
                  ? 'motion-safe:animate-hearly-logo-bar motion-reduce:animate-none'
                  : undefined
              }
              style={
                animated
                  ? {
                      transformOrigin: 'center bottom',
                      animationDelay: `${i * 0.068}s`,
                    }
                  : undefined
              }
            >
              <rect {...rectProps} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
