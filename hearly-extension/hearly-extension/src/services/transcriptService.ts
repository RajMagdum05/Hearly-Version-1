import type { TranscriptEntry } from '@/utils/types';

/**
 * IndexedDB transcript persistence — implemented in Phase D/E.
 */
export async function saveTranscriptEntry(
  _entry: TranscriptEntry,
): Promise<void> {
  await Promise.resolve();
}

export async function listTranscriptEntries(): Promise<TranscriptEntry[]> {
  return [];
}
