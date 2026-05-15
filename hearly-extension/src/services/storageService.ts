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