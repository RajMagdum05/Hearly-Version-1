import { STORAGE_KEYS } from '@/config/constants';
import type { AppSettings, VoiceProfile, TranscriptEntry } from '@/utils/types';
import { EncryptedLocalStorage } from './cryptoStorage';

// Guard: returns true only when running inside a real Chrome extension context.
// In normal browser (npm run dev), chrome.storage doesn't exist — we fall back to defaults.
const isChromeExtension = (): boolean =>
  typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';

export async function loadVoiceProfile(): Promise<VoiceProfile | null> {
  if (!isChromeExtension()) return null;
  const profile = await EncryptedLocalStorage.decryptAndGet<any>(STORAGE_KEYS.voiceProfile);
  if (!profile || typeof profile !== 'object') return null;

  return {
    ...profile,
    embeddingModel: profile.embeddingModel ?? 'fallback',
    embedding:
      profile.embedding instanceof Float32Array
        ? profile.embedding
        : new Float32Array(profile.embedding),
  };
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  if (!isChromeExtension()) return;
  await EncryptedLocalStorage.encryptAndSet(STORAGE_KEYS.voiceProfile, {
    ...profile,
    embedding: Array.from(profile.embedding),
  });
  await chrome.storage.local.set({
    hearly_voice_runtime_profile: {
      id: profile.id,
      userName: profile.userName,
      embedding: Array.from(profile.embedding),
      embeddingModel: profile.embeddingModel,
      enrolledAt: profile.enrolledAt,
    },
  });
}

export async function loadAppSettings(): Promise<Partial<AppSettings>> {
  if (!isChromeExtension()) return {};
  const raw = await chrome.storage.local.get(STORAGE_KEYS.appSettings);
  const v = raw[STORAGE_KEYS.appSettings];
  return v && typeof v === 'object' ? (v as AppSettings) : {};
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  if (!isChromeExtension()) return;
  await chrome.storage.local.set({ [STORAGE_KEYS.appSettings]: settings });
}

export async function saveEnrollmentState(data: {
  isEnrolled: boolean
  userName: string
}): Promise<void> {
  if (!isChromeExtension()) return;
  return new Promise((resolve) => {
    chrome.storage.local.set({ hearly_enrollment: data }, resolve)
  })
}

export async function loadEnrollmentState(): Promise<{
  isEnrolled: boolean
  userName: string
} | null> {
  if (!isChromeExtension()) return null;
  return new Promise((resolve) => {
    chrome.storage.local.get('hearly_enrollment', (result) => {
      const data = result.hearly_enrollment as { isEnrolled: boolean; userName: string } | undefined
      resolve(data ?? null)
    })
  })
}

export async function clearEnrollmentState(): Promise<void> {
  if (!isChromeExtension()) return;
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      [
        'hearly_enrollment',
        'hearly_filter',
        'hearly_transcript',
        'hearly_voice_profile',
        'hearly_voice_runtime_profile',
        'hearly_app_settings',
        'hearly_transcript_meta',
        'hearly_transcript_entries'
      ],
      resolve
    )
  })
}

// Filter state
export async function saveFilterState(isActive: boolean): Promise<void> {
  if (!isChromeExtension()) return;
  return new Promise((resolve) => {
    chrome.storage.local.set({ hearly_filter: { isActive } }, resolve)
  })
}

export async function loadFilterState(): Promise<{ isActive: boolean } | null> {
  if (!isChromeExtension()) return null;
  return new Promise((resolve) => {
    chrome.storage.local.get('hearly_filter', (result) => {
      resolve((result.hearly_filter as { isActive: boolean } | undefined) ?? null)
    })
  })
}

// Transcript state
export async function saveTranscriptState(isEnabled: boolean): Promise<void> {
  if (!isChromeExtension()) return;
  return new Promise((resolve) => {
    chrome.storage.local.set({ hearly_transcript: { isEnabled } }, resolve)
  })
}

export async function loadTranscriptState(): Promise<{ isEnabled: boolean } | null> {
  if (!isChromeExtension()) return null;
  return new Promise((resolve) => {
    chrome.storage.local.get('hearly_transcript', (result) => {
      resolve((result.hearly_transcript as { isEnabled: boolean } | undefined) ?? null)
    })
  })
}

export async function loadTranscriptEntries(): Promise<TranscriptEntry[]> {
  if (!isChromeExtension()) return [];
  const entries = await EncryptedLocalStorage.decryptAndGet<TranscriptEntry[]>('hearly_transcript_entries');
  return entries ?? [];
}

export async function saveTranscriptEntries(entries: TranscriptEntry[]): Promise<void> {
  if (!isChromeExtension()) return;
  await EncryptedLocalStorage.encryptAndSet('hearly_transcript_entries', entries);
}
