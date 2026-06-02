import { VoiceNotEnrolledState } from './VoiceNotEnrolledState';

export interface UnenrolledHeroProps {
  onStart: () => void;
}

export function UnenrolledHero({ onStart }: UnenrolledHeroProps) {
  return (
    <VoiceNotEnrolledState
      onStartVoiceTraining={onStart}
      className="w-full flex-1"
    />
  );
}
