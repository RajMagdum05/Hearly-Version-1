import { useTranscriptStore } from '@/store/transcriptStore';

export function useHistory() {
  const entries = useTranscriptStore((s) => s.entries);
  return { entries };
}
