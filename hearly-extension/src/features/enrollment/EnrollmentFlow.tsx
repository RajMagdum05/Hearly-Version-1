import { useCallback, useState } from 'react';
import { Button, ProgressDots } from '@/ui/shared';
import { HearlyLogoMark } from '@/ui/shared/HearlyLogoMark';
import { Phase1_Intro } from './Phase1_Intro';
import { Phase2_Record } from './Phase2_Record';
import { Phase3_Done } from './Phase3_Done';

/** Must match extension popup shell; avoid fixed positioning inside MV3 popup documents. */
const POPUP_W = 'w-[380px]';
const POPUP_H = 'h-[600px]';

const STEPS = ['Before You Start', 'Voice Recording', 'Completion'] as const;

const primaryButtonClass =
  'rounded-full border border-hearly-accent/30 bg-white/[0.055] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_0_22px_rgba(181,240,61,0.11),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:enabled:border-hearly-accent/55 hover:enabled:bg-hearly-accent/10 hover:enabled:text-hearly-accent hover:enabled:shadow-[0_0_28px_rgba(181,240,61,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] active:enabled:scale-[0.99] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.025] disabled:text-hearly-tertiary disabled:shadow-none';

const secondaryButtonClass =
  'rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[13px] font-medium text-hearly-secondary transition-[background-color,border-color,color,transform] duration-300 ease-out hover:enabled:border-white/[0.16] hover:enabled:bg-white/[0.05] hover:enabled:text-white active:enabled:scale-[0.99]';

export interface EnrollmentFlowProps {
  onClose: () => void;
  onComplete: (name: string) => void;
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div
          className="absolute inset-0 rounded-2xl border border-hearly-accent/15 bg-hearly-accent/[0.035] shadow-[0_0_30px_rgba(181,240,61,0.08)]"
          aria-hidden
        />
        <HearlyLogoMark size="sm" glow={false} />
      </div>
      <div className="mt-4">
        <ProgressDots total={STEPS.length} activeIndex={step} />
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-hearly-tertiary">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}

export function EnrollmentFlow({ onClose, onComplete }: EnrollmentFlowProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const handleTrainingComplete = useCallback(() => {
    setHasRecording(true);
    setIsRecording(false);
  }, []);

  return (
    <div
      className={`relative flex ${POPUP_W} ${POPUP_H} shrink-0 flex-col overflow-hidden bg-hearly-bg text-hearly-text`}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-hearly-accent/[0.035] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(255,255,255,0.035),transparent)]"
        aria-hidden
      />

      <div className="relative flex shrink-0 justify-end px-4 pb-1 pt-3">
        <button
          type="button"
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-[15px] leading-none text-hearly-secondary transition-[background-color,border-color,color] duration-200 hover:border-white/[0.16] hover:bg-white/[0.055] hover:text-white"
          onClick={onClose}
        >
          x
        </button>
      </div>

      <div className="scrollbar-none relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 pb-7 [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex w-full max-w-[312px] flex-1 flex-col">
          <StepHeader step={step} />

          {step === 0 && (
            <>
              <h2 className="mt-5 text-center text-[22px] font-semibold leading-tight tracking-[-0.03em] text-white">
                Before You Start
              </h2>
              <p className="mx-auto mt-2 max-w-[292px] text-center text-[13px] leading-relaxed text-hearly-secondary">
                Set up your voice profile in a quiet moment. Hearly will use this
                sample to recognize you with more confidence.
              </p>
              <div className="mt-6">
                <Phase1_Intro
                  userName={name}
                  onUserNameChange={setName}
                />
              </div>
              <Button
                variant="secondary"
                className={`mt-6 w-full ${primaryButtonClass}`}
                disabled={!name.trim()}
                onClick={() => setStep(1)}
              >
                Continue
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mt-5 text-center text-[22px] font-semibold leading-tight tracking-[-0.03em] text-white">
                Voice Recording
              </h2>
              <p className="mx-auto mt-2 max-w-[292px] text-center text-[13px] leading-relaxed text-hearly-secondary">
                Read the phrase naturally. Keep your pace steady and stay close
                to your normal speaking voice.
              </p>
              <div className="mt-6">
                <Phase2_Record
                  displayName={name}
                  isRecording={isRecording}
                  hasRecording={hasRecording}
                  onToggleRecord={() => {
                    setIsRecording((recording) => {
                      if (recording) {
                        return false;
                      }
                      setHasRecording(false);
                      return true;
                    });
                  }}
                  onTrainingComplete={handleTrainingComplete}
                />
              </div>
              <div className="mt-6 flex gap-3 pb-1">
                <Button
                  variant="secondary"
                  className={`flex-1 ${secondaryButtonClass}`}
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
                <Button
                  variant="secondary"
                  className={`flex-1 ${primaryButtonClass}`}
                  disabled={!hasRecording}
                  onClick={() => setStep(2)}
                >
                  Train Voice
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mt-5 text-center text-[22px] font-semibold leading-tight tracking-[-0.03em] text-white">
                Voice Enrolled
              </h2>
              <p className="mx-auto mt-2 max-w-[292px] text-center text-[13px] leading-relaxed text-hearly-secondary">
                Your profile is ready. Hearly can now focus on your voice during
                listening sessions.
              </p>
              <div className="mt-6">
                <Phase3_Done />
              </div>
              <Button
                variant="secondary"
                className={`mt-6 w-full ${primaryButtonClass}`}
                onClick={() => {
                  onComplete(name);
                }}
              >
                Start Using Hearly
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
