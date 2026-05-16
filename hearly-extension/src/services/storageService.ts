import { STORAGE_KEYS } from '@/config/constants';
import type { AppSettings, VoiceProfile } from '@/utils/types';

// Guard: returns true only when running inside a real Chrome extension context.
// In normal browser (npm run dev), chrome.storage doesn't exist — we fall back to defaults.
const isChromeExtension = (): boolean =>
  typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';

export async function loadVoiceProfile(): Promise<VoiceProfile | null> {
  if (!isChromeExtension()) return null;
  const raw = await chrome.storage.local.get(STORAGE_KEYS.voiceProfile);
  const v = raw[STORAGE_KEYS.voiceProfile];
  return v && typeof v === 'object' ? (v as VoiceProfile) : null;
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  if (!isChromeExtension()) return;
  await chrome.storage.local.set({ [STORAGE_KEYS.voiceProfile]: profile });
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
  return new Promise((resolve) => {
    chrome.storage.local.set({ hearly_enrollment: data }, resolve)
  })
}

export async function loadEnrollmentState(): Promise<{
  isEnrolled: boolean
  userName: string
} | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('hearly_enrollment', (result) => {
      const data = result.hearly_enrollment as { isEnrolled: boolean; userName: string } | undefined
      resolve(data ?? null)
    })
  })
}

export async function clearEnrollmentState(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      [
        'hearly_enrollment',
        'hearly_filter',
        'hearly_transcript',
        'hearly_voice_profile',
        'hearly_app_settings',
        'hearly_transcript_meta'
      ],
      resolve
    )
  })
}

// Filter state
export async function saveFilterState(isActive: boolean): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ hearly_filter: { isActive } }, resolve)
  })
}

export async function loadFilterState(): Promise<{ isActive: boolean } | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('hearly_filter', (result) => {
      resolve((result.hearly_filter as { isActive: boolean } | undefined) ?? null)
    })
  })
}

// Transcript state
export async function saveTranscriptState(isEnabled: boolean): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ hearly_transcript: { isEnabled } }, resolve)
  })
}

export async function loadTranscriptState(): Promise<{ isEnabled: boolean } | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('hearly_transcript', (result) => {
      resolve((result.hearly_transcript as { isEnabled: boolean } | undefined) ?? null)
    })
  })
}