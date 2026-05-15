import type { TranscriptEntry } from '@/utils/types';

export type HearlyMessage =
  | { type: 'HEARLY_TOGGLE'; payload: { active: boolean } }
  | { type: 'TRANSCRIPT_TOGGLE'; payload: { enabled: boolean } }
  | { type: 'NEW_TRANSCRIPT'; payload: TranscriptEntry }
  | { type: 'VOICE_ENROLLED'; payload: { userName: string } }
  | { type: 'REQUEST_STATUS' }
  | {
      type: 'STATUS_RESPONSE';
      payload: { active: boolean; enrolled: boolean };
    };
