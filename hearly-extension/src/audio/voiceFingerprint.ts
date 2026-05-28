const EMBEDDING_SIZE = 192;
const SEGMENT_COUNT = 24;
const FEATURES_PER_SEGMENT = EMBEDDING_SIZE / SEGMENT_COUNT;

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const output = new Float32Array(buffer.length);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      output[i] += data[i] / buffer.numberOfChannels;
    }
  }

  return output;
}

function trimSilence(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }

  if (peak <= 0.001) {
    return samples;
  }

  const threshold = peak * 0.08;
  let start = 0;
  let end = samples.length - 1;

  while (start < samples.length && Math.abs(samples[start]) < threshold) {
    start += 1;
  }

  while (end > start && Math.abs(samples[end]) < threshold) {
    end -= 1;
  }

  return samples.slice(start, end + 1);
}

function normalize(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }

  if (peak <= 0.001) {
    return samples;
  }

  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    output[i] = clampSample(samples[i] / peak);
  }

  return output;
}

function estimatePitchStrength(segment: Float32Array, sampleRate: number): number {
  if (segment.length < 2) {
    return 0;
  }

  const minLag = Math.max(16, Math.floor(sampleRate / 420));
  const maxLag = Math.min(segment.length - 1, Math.floor(sampleRate / 70));
  let best = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let energy = 0;

    for (let i = lag; i < segment.length; i += 1) {
      const current = segment[i];
      const previous = segment[i - lag];
      correlation += current * previous;
      energy += current * current + previous * previous;
    }

    if (energy > 0) {
      best = Math.max(best, (2 * correlation) / energy);
    }
  }

  return Math.max(0, best);
}

function extractSegmentFeatures(segment: Float32Array, sampleRate: number): number[] {
  if (segment.length === 0) {
    return Array.from({ length: FEATURES_PER_SEGMENT }, () => 0);
  }

  let sumAbs = 0;
  let sumSquares = 0;
  let peak = 0;
  let crossings = 0;
  let positive = 0;
  let attackSum = 0;

  for (let i = 0; i < segment.length; i += 1) {
    const sample = segment[i];
    const abs = Math.abs(sample);
    sumAbs += abs;
    sumSquares += sample * sample;
    peak = Math.max(peak, abs);

    if (sample > 0) {
      positive += 1;
    }

    if (i > 0) {
      const previous = segment[i - 1];
      if ((sample >= 0 && previous < 0) || (sample < 0 && previous >= 0)) {
        crossings += 1;
      }
      attackSum += Math.max(0, abs - Math.abs(previous));
    }
  }

  const meanAbs = sumAbs / segment.length;
  const rms = Math.sqrt(sumSquares / segment.length);
  const zcr = crossings / segment.length;
  const crest = rms > 0 ? peak / rms : 0;
  const positivity = positive / segment.length;
  const attack = attackSum / segment.length;
  const pitchStrength = estimatePitchStrength(segment, sampleRate);
  const quietness = 1 - Math.min(1, rms * 4);

  return [
    meanAbs,
    rms,
    zcr,
    Math.min(1, peak),
    Math.min(1, crest / 8),
    positivity,
    Math.min(1, attack * 20),
    Math.min(1, pitchStrength + quietness * 0.12),
  ];
}

function l2Normalize(vector: Float32Array): Float32Array {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sumSquares += vector[i] * vector[i];
  }

  const magnitude = Math.sqrt(sumSquares);
  if (magnitude === 0) {
    return vector;
  }

  const output = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i += 1) {
    output[i] = vector[i] / magnitude;
  }

  return output;
}

export async function decodeAudioBlob(blob: Blob): Promise<{
  samples: Float32Array;
  sampleRate: number;
}> {
  const context = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
    return {
      samples: normalize(trimSilence(mixToMono(audioBuffer))),
      sampleRate: audioBuffer.sampleRate,
    };
  } finally {
    await context.close();
  }
}

export async function extractVoiceFingerprintFromBlob(blob: Blob): Promise<Float32Array> {
  const { samples, sampleRate } = await decodeAudioBlob(blob);
  return extractVoiceFingerprintFromSamples(samples, sampleRate);
}

export function extractVoiceFingerprintFromSamples(
  rawSamples: Float32Array,
  sampleRate: number,
): Float32Array {
  const samples = normalize(trimSilence(rawSamples));
  const embedding = new Float32Array(EMBEDDING_SIZE);
  const segmentLength = Math.max(1, Math.floor(samples.length / SEGMENT_COUNT));

  for (let segmentIndex = 0; segmentIndex < SEGMENT_COUNT; segmentIndex += 1) {
    const start = segmentIndex * segmentLength;
    const end =
      segmentIndex === SEGMENT_COUNT - 1
        ? samples.length
        : Math.min(samples.length, start + segmentLength);
    const features = extractSegmentFeatures(samples.slice(start, end), sampleRate);

    for (let featureIndex = 0; featureIndex < FEATURES_PER_SEGMENT; featureIndex += 1) {
      embedding[segmentIndex * FEATURES_PER_SEGMENT + featureIndex] =
        features[featureIndex] ?? 0;
    }
  }

  return l2Normalize(embedding);
}

export function averageFingerprints(fingerprints: readonly Float32Array[]): Float32Array {
  if (fingerprints.length === 0) {
    return new Float32Array(EMBEDDING_SIZE);
  }

  const output = new Float32Array(EMBEDDING_SIZE);

  for (const fingerprint of fingerprints) {
    for (let i = 0; i < EMBEDDING_SIZE; i += 1) {
      output[i] += fingerprint[i] ?? 0;
    }
  }

  for (let i = 0; i < EMBEDDING_SIZE; i += 1) {
    output[i] /= fingerprints.length;
  }

  return l2Normalize(output);
}
