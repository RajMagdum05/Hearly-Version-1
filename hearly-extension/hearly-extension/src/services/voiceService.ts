import type { VoiceProfile } from '@/utils/types';
import { loadVoiceProfile, saveVoiceProfile } from './storageService';

/**
 * Voice enrollment and comparison orchestration (real ONNX wiring in Phase F).
 */
export async function getStoredVoiceProfile(): Promise<VoiceProfile | null> {
  return loadVoiceProfile();
}

export async function persistVoiceProfile(profile: VoiceProfile): Promise<void> {
  await saveVoiceProfile(profile);
}
