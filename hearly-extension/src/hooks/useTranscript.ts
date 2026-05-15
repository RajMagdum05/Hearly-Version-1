import { useTranscriptStore } from '@/store/transcriptStore';

export function useTranscript() {
  const isEnabled = useTranscriptStore((s) => s.isEnabled);
  const entries = useTranscriptStore((s) => s.entries);
  const liveText = useTranscriptStore((s) => s.liveText);
  const actions = useTranscriptStore((s) => s.actions);
  return { isEnabled, entries, liveText, actions };
}
