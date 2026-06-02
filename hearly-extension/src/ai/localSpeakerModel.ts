import {
  averageFingerprints,
  decodeAudioBlob,
  extractVoiceFingerprintFromBlob,
  extractVoiceFingerprintFromSamples,
} from '@/audio/voiceFingerprint';
import { cosineSimilarity } from './speakerIdentity';

export type SpeakerModelStatus = 'fallback' | 'onnx-ready';

export interface SpeakerEmbeddingResult {
  embedding: Float32Array;
  modelStatus: SpeakerModelStatus;
}

export interface SpeakerComparisonResult {
  matched: boolean;
  score: number;
  threshold: number;
  modelStatus: SpeakerModelStatus;
}

const DEFAULT_THRESHOLD = 0.58;
const MODEL_PATH = 'models/hearly-speaker-v1.onnx';
const TARGET_SAMPLE_RATE = 16_000;
const MODEL_SECONDS = 3;
const N_FFT = 400;
const HOP_LENGTH = 160;
const N_MELS = 64;
const F_MIN = 40;
const F_MAX = 7600;

type OrtModule = typeof import('onnxruntime-web');
type OrtSession = import('onnxruntime-web').InferenceSession;

let ortPromise: Promise<OrtModule> | null = null;
let sessionPromise: Promise<OrtSession | null> | null = null;

function extensionUrl(path: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
}

async function loadOrt(): Promise<OrtModule> {
  if (!ortPromise) {
    ortPromise = import('onnxruntime-web').then((ort) => {
      ort.env.wasm.numThreads = 1;
      return ort;
    });
  }
  return ortPromise;
}

async function loadSpeakerSession(): Promise<OrtSession | null> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const modelUrl = extensionUrl(MODEL_PATH);
        const response = await fetch(modelUrl, { method: 'GET' });
        if (!response.ok) return null;

        const ort = await loadOrt();
        return await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
      } catch (error) {
        console.info('[Hearly] Local ONNX speaker model unavailable; using fallback.', error);
        return null;
      }
    })();
  }
  return sessionPromise;
}

function l2Normalize(vector: Float32Array): Float32Array {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i += 1) {
    const value = vector[i] ?? 0;
    sumSquares += value * value;
  }

  const magnitude = Math.sqrt(sumSquares);
  if (magnitude === 0) return vector;

  const output = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i += 1) {
    output[i] = (vector[i] ?? 0) / magnitude;
  }
  return output;
}

function averageEmbeddings(embeddings: readonly Float32Array[]): Float32Array {
  if (embeddings.length === 0) return new Float32Array(192);

  const output = new Float32Array(embeddings[0]?.length ?? 192);
  for (const embedding of embeddings) {
    for (let i = 0; i < output.length; i += 1) {
      output[i] += embedding[i] ?? 0;
    }
  }
  for (let i = 0; i < output.length; i += 1) {
    output[i] /= embeddings.length;
  }
  return l2Normalize(output);
}

function resampleLinear(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
): Float32Array {
  if (sourceSampleRate === targetSampleRate) return samples;

  const targetLength = Math.max(1, Math.round(samples.length * targetSampleRate / sourceSampleRate));
  const output = new Float32Array(targetLength);
  const ratio = sourceSampleRate / targetSampleRate;

  for (let i = 0; i < targetLength; i += 1) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(samples.length - 1, left + 1);
    const weight = sourceIndex - left;
    output[i] = (samples[left] ?? 0) * (1 - weight) + (samples[right] ?? 0) * weight;
  }

  return output;
}

function fitLength(samples: Float32Array, seconds: number, sampleRate: number): Float32Array {
  const targetLength = Math.floor(seconds * sampleRate);
  if (samples.length === targetLength) return samples;
  if (samples.length > targetLength) {
    const start = Math.floor((samples.length - targetLength) / 2);
    return samples.slice(start, start + targetLength);
  }

  const output = new Float32Array(targetLength);
  for (let i = 0; i < targetLength; i += 1) {
    output[i] = samples[i % Math.max(1, samples.length)] ?? 0;
  }
  return output;
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (10 ** (mel / 2595) - 1);
}

function createMelFilterBank(): Float32Array[] {
  const binCount = Math.floor(N_FFT / 2) + 1;
  const filters = Array.from({ length: N_MELS }, () => new Float32Array(binCount));
  const minMel = hzToMel(F_MIN);
  const maxMel = hzToMel(F_MAX);
  const melPoints = Array.from({ length: N_MELS + 2 }, (_, index) => (
    minMel + (index / (N_MELS + 1)) * (maxMel - minMel)
  ));
  const bins = melPoints.map((mel) => (
    Math.floor((N_FFT + 1) * melToHz(mel) / TARGET_SAMPLE_RATE)
  ));

  for (let melIndex = 1; melIndex <= N_MELS; melIndex += 1) {
    const left = bins[melIndex - 1] ?? 0;
    const center = bins[melIndex] ?? left + 1;
    const right = bins[melIndex + 1] ?? center + 1;
    const filter = filters[melIndex - 1];

    for (let bin = left; bin < center; bin += 1) {
      if (bin >= 0 && bin < binCount) {
        filter[bin] = (bin - left) / Math.max(1, center - left);
      }
    }
    for (let bin = center; bin < right; bin += 1) {
      if (bin >= 0 && bin < binCount) {
        filter[bin] = (right - bin) / Math.max(1, right - center);
      }
    }
  }

  return filters;
}

const MEL_FILTERS = createMelFilterBank();
const HANN_WINDOW = Float32Array.from(
  { length: N_FFT },
  (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (N_FFT - 1)),
);

function powerSpectrum(frame: Float32Array): Float32Array {
  const binCount = Math.floor(N_FFT / 2) + 1;
  const spectrum = new Float32Array(binCount);

  for (let bin = 0; bin < binCount; bin += 1) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < N_FFT; n += 1) {
      const angle = (2 * Math.PI * bin * n) / N_FFT;
      const sample = (frame[n] ?? 0) * (HANN_WINDOW[n] ?? 0);
      real += sample * Math.cos(angle);
      imag -= sample * Math.sin(angle);
    }
    spectrum[bin] = real * real + imag * imag;
  }

  return spectrum;
}

function toLogMel(samples: Float32Array): Float32Array {
  const padded = new Float32Array(samples.length + N_FFT);
  padded.set(samples, Math.floor(N_FFT / 2));
  const frameCount = Math.max(1, Math.floor((padded.length - N_FFT) / HOP_LENGTH) + 1);
  const output = new Float32Array(N_MELS * frameCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameIndex * HOP_LENGTH;
    const spectrum = powerSpectrum(padded.slice(start, start + N_FFT));

    for (let melIndex = 0; melIndex < N_MELS; melIndex += 1) {
      const filter = MEL_FILTERS[melIndex];
      let energy = 0;
      for (let bin = 0; bin < spectrum.length; bin += 1) {
        energy += (spectrum[bin] ?? 0) * (filter?.[bin] ?? 0);
      }
      output[melIndex * frameCount + frameIndex] = Math.log(Math.max(1e-6, energy));
    }
  }

  for (let melIndex = 0; melIndex < N_MELS; melIndex += 1) {
    const offset = melIndex * frameCount;
    let mean = 0;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      mean += output[offset + frameIndex] ?? 0;
    }
    mean /= frameCount;

    let variance = 0;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const delta = (output[offset + frameIndex] ?? 0) - mean;
      variance += delta * delta;
    }
    const std = Math.sqrt(variance / frameCount) || 1e-5;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      output[offset + frameIndex] = ((output[offset + frameIndex] ?? 0) - mean) / std;
    }
  }

  return output;
}

async function embedWithOnnx(blob: Blob): Promise<Float32Array | null> {
  const session = await loadSpeakerSession();
  if (!session) return null;

  const ort = await loadOrt();
  const { samples, sampleRate } = await decodeAudioBlob(blob);
  const modelSamples = fitLength(
    resampleLinear(samples, sampleRate, TARGET_SAMPLE_RATE),
    MODEL_SECONDS,
    TARGET_SAMPLE_RATE,
  );
  const logMel = toLogMel(modelSamples);
  const frameCount = logMel.length / N_MELS;
  const input = new ort.Tensor('float32', logMel, [1, N_MELS, frameCount]);
  const inputName = session.inputNames[0] ?? 'log_mel';
  const outputName = session.outputNames[0] ?? 'embedding';
  const output = await session.run({ [inputName]: input });
  const tensor = output[outputName] ?? Object.values(output)[0];
  if (!tensor?.data) return null;

  return l2Normalize(new Float32Array(tensor.data as Float32Array));
}

/**
 * Local speaker-model adapter.
 *
 * If `public/models/hearly-speaker-v1.onnx` exists, enrollment uses the local
 * ONNX speaker encoder. Until that trained model is shipped, Hearly falls back
 * to the deterministic local fingerprint so the extension remains usable.
 */
export async function embedEnrollmentAudio(
  phraseAudio: readonly Blob[],
): Promise<SpeakerEmbeddingResult> {
  const onnxEmbeddings: Float32Array[] = [];

  for (const blob of phraseAudio) {
    const embedding = await embedWithOnnx(blob);
    if (!embedding) break;
    onnxEmbeddings.push(embedding);
  }

  if (onnxEmbeddings.length === phraseAudio.length && onnxEmbeddings.length > 0) {
    return {
      embedding: averageEmbeddings(onnxEmbeddings),
      modelStatus: 'onnx-ready',
    };
  }

  const fingerprints = await Promise.all(
    phraseAudio.map((blob) => extractVoiceFingerprintFromBlob(blob)),
  );

  return {
    embedding: averageFingerprints(fingerprints),
    modelStatus: 'fallback',
  };
}

export function embedPcmWindow(
  samples: Float32Array,
  sampleRate: number,
): SpeakerEmbeddingResult {
  return {
    embedding: extractVoiceFingerprintFromSamples(samples, sampleRate),
    modelStatus: 'fallback',
  };
}

export async function embedPcmWindowWithOnnx(
  samples: Float32Array,
  sampleRate: number,
): Promise<SpeakerEmbeddingResult> {
  const session = await loadSpeakerSession();
  if (!session) return embedPcmWindow(samples, sampleRate);

  const ort = await loadOrt();
  const modelSamples = fitLength(
    resampleLinear(samples, sampleRate, TARGET_SAMPLE_RATE),
    MODEL_SECONDS,
    TARGET_SAMPLE_RATE,
  );
  const logMel = toLogMel(modelSamples);
  const frameCount = logMel.length / N_MELS;
  const input = new ort.Tensor('float32', logMel, [1, N_MELS, frameCount]);
  const inputName = session.inputNames[0] ?? 'log_mel';
  const outputName = session.outputNames[0] ?? 'embedding';
  const output = await session.run({ [inputName]: input });
  const tensor = output[outputName] ?? Object.values(output)[0];

  if (!tensor?.data) return embedPcmWindow(samples, sampleRate);

  return {
    embedding: l2Normalize(new Float32Array(tensor.data as Float32Array)),
    modelStatus: 'onnx-ready',
  };
}

export function compareSpeakerEmbeddings(
  enrolledEmbedding: Float32Array,
  candidateEmbedding: Float32Array,
  threshold = DEFAULT_THRESHOLD,
): SpeakerComparisonResult {
  const score = cosineSimilarity(enrolledEmbedding, candidateEmbedding);

  return {
    matched: score >= threshold,
    score,
    threshold,
    modelStatus: 'fallback',
  };
}
