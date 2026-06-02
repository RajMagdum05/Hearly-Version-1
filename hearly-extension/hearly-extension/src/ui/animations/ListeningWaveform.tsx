import type { WaveformActiveProps } from './WaveformActive';
import { WaveformActive } from './WaveformActive';

export type ListeningWaveformProps = Pick<WaveformActiveProps, 'energetic' | 'className'>;

/**
 * Home “listening” meter — compact horizontal dot pulse when active; soft idle dots when off.
 */
export function ListeningWaveform({ energetic, className }: ListeningWaveformProps) {
  return <WaveformActive energetic={energetic} calm className={className} />;
}
