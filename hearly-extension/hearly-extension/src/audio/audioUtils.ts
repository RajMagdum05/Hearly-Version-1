/** Resample / normalize helpers for PCM chunks (Phase F). */
export function normalizeSamples(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i] ?? 0);
    if (a > peak) peak = a;
  }
  if (peak === 0) return samples;
  for (let i = 0; i < samples.length; i++) {
    out[i] = (samples[i] ?? 0) / peak;
  }
  return out;
}
