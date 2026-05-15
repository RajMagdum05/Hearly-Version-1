import { create } from 'zustand';
import type { EnrollmentPhase, VoiceProfile } from '@/utils/types';

interface EnrollmentState {
  isEnrolled: boolean;
  userName: string;
  phase: EnrollmentPhase;
  voiceProfile: VoiceProfile | null;
  actions: {
    setPhase: (phase: EnrollmentPhase) => void;
    setProfile: (profile: VoiceProfile | null) => void;
    clearProfile: () => void;
  };
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
  isEnrolled: false,
  userName: '',
  phase: 'intro',
  voiceProfile: null,
  actions: {
    setPhase: (phase) => set({ phase }),
    setProfile: (voiceProfile) =>
      set({
        voiceProfile,
        isEnrolled: Boolean(voiceProfile),
        userName: voiceProfile?.userName ?? '',
      }),
    clearProfile: () =>
      set({
        voiceProfile: null,
        isEnrolled: false,
        userName: '',
        phase: 'intro',
      }),
  },
}));
