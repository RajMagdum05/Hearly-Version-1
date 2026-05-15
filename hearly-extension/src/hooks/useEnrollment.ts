import { useEnrollmentStore } from '@/store/enrollmentStore';

export function useEnrollment() {
  const isEnrolled = useEnrollmentStore((s) => s.isEnrolled);
  const userName = useEnrollmentStore((s) => s.userName);
  const phase = useEnrollmentStore((s) => s.phase);
  const voiceProfile = useEnrollmentStore((s) => s.voiceProfile);
  const actions = useEnrollmentStore((s) => s.actions);
  return { isEnrolled, userName, phase, voiceProfile, actions };
}
