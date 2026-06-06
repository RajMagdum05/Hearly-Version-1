import { embedPcmWindowWithOnnx } from './localSpeakerModel';

/**
 * ECAPA-TDNN ONNX runner — lazy init on first enrollment (Phase F).
 */
export async function embedVoiceSample(
  pcm: Float32Array,
  sampleRate: number = 16000,
): Promise<Float32Array> {
  const result = await embedPcmWindowWithOnnx(pcm, sampleRate);
  return result.embedding;
}
