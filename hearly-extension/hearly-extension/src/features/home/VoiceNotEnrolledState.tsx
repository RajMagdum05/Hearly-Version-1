import { useState } from 'react';
import { IconMic } from '@/ui/shared/icons';

export interface VoiceNotEnrolledStateProps {
  onStartVoiceTraining: () => void;
  className?: string;
}

/** Inset + soft lime halo (not heavy / muddy) */
const CARD_SHADOW_IDLE = 'inset 0 1px 0 rgba(255, 255, 255, 0.04)';
const CARD_SHADOW_ACCENT = [
  CARD_SHADOW_IDLE,
  '0 0 0 1px rgba(181, 240, 61, 0.12)',
  '0 16px 42px rgba(0, 0, 0, 0.22)',
  '0 0 36px rgba(181, 240, 61, 0.12)',
].join(', ');

/**
 * Home screen before voice enrollment — calm card: icon, headline, benefit line, primary CTA.
 */
export function VoiceNotEnrolledState({
  onStartVoiceTraining,
  className = '',
}: VoiceNotEnrolledStateProps) {
  const [cardAccentGlow, setCardAccentGlow] = useState(false);

  return (
    <section
      className={`flex w-full flex-col items-center justify-center px-0 py-1 ${className}`.trim()}
      aria-labelledby="hearly-enroll-card-title"
    >
      <p className="shrink-0 rounded-full border border-[#ff6b6b]/20 bg-[#ff6b6b]/[0.055] px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff8a8a]">
        Voice Not Enrolled
      </p>

      <div
        className={`mt-4 w-full max-w-[308px] overflow-visible rounded-2xl border bg-white/[0.025] p-5 transition-[box-shadow,border-color,background-color] duration-300 ease-out ${
          cardAccentGlow
            ? 'border-hearly-accent/30'
            : 'border-white/[0.07]'
        }`}
        style={{ boxShadow: cardAccentGlow ? CARD_SHADOW_ACCENT : CARD_SHADOW_IDLE }}
        role="region"
        aria-label="Voice enrollment"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[box-shadow,border-color] duration-300"
            aria-hidden
          >
            <IconMic
              width={19}
              height={19}
              className="text-hearly-secondary"
              strokeWidth={1.5}
              style={{
                filter: 'drop-shadow(0 0 5px rgba(181, 240, 61, 0.35)) drop-shadow(0 0 12px rgba(181, 240, 61, 0.12))',
              }}
            />
          </div>

          <h2
            id="hearly-enroll-card-title"
            className="mt-4 text-[17px] font-semibold tracking-[-0.03em] text-white"
          >
            Enroll Your Voice
          </h2>
          <p className="mt-2 max-w-[248px] text-[13px] font-normal leading-relaxed tracking-[-0.01em] text-hearly-secondary">
            Set up focused listening in three quick steps.
          </p>

          <button
            type="button"
            onClick={onStartVoiceTraining}
            onPointerEnter={() => setCardAccentGlow(true)}
            onPointerLeave={() => setCardAccentGlow(false)}
            onFocus={() => setCardAccentGlow(true)}
            onBlur={() => setCardAccentGlow(false)}
            className="mt-6 w-full rounded-full border border-hearly-accent/30 bg-white/[0.055] py-3 text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_0_18px_rgba(181,240,61,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,background-color,border-color,color,box-shadow] duration-300 ease-out hover:border-hearly-accent/50 hover:bg-hearly-accent/[0.09] hover:text-hearly-accent hover:shadow-[0_0_24px_rgba(181,240,61,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearly-accent/35"
          >
            Start Voice Training
          </button>
        </div>
      </div>
    </section>
  );
}
