/**
 * ECAPA-TDNN ONNX runner — lazy init on first enrollment (Phase F).
 */
export async function embedVoiceSample(
  _pcm: Float32Array,
): Promise<Float32Array> {
  return new Float32Array(192);
}
