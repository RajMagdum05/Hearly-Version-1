import * as ort from 'onnxruntime-web';

export type LocalSttResult = {
  text: string;
  score: number;
  unavailable: boolean;
};

const MODEL_PATH = 'models/hearly-stt-wav2vec2.onnx';
const VOCAB_PATH = 'models/hearly-stt-vocab.json';
const TARGET_SAMPLE_RATE = 16_000;

let sessionPromise: Promise<ort.InferenceSession | null> | null = null;
let vocabPromise: Promise<string[] | null> | null = null;

function extensionUrl(path: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
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

function normalizeAudio(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i] ?? 0));
  }
  if (peak < 1e-4) return samples;
  const output = new Float32Array(samples.length);
  const scale = 1 / peak;
  for (let i = 0; i < samples.length; i += 1) {
    output[i] = (samples[i] ?? 0) * scale;
  }
  return output;
}

async function loadSession(): Promise<ort.InferenceSession | null> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        ort.env.wasm.numThreads = 1;
        const modelUrl = extensionUrl(MODEL_PATH);
        const response = await fetch(modelUrl, { method: 'GET' });
        if (!response.ok) return null;
        return await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
      } catch (error) {
        console.warn('[Hearly] Local STT model unavailable:', error);
        return null;
      }
    })();
  }
  return sessionPromise;
}

async function loadVocabulary(): Promise<string[] | null> {
  if (!vocabPromise) {
    vocabPromise = (async () => {
      try {
        const response = await fetch(extensionUrl(VOCAB_PATH), { method: 'GET' });
        if (!response.ok) return null;
        const json = await response.json();
        if (Array.isArray(json)) return json.map((item) => String(item ?? ''));
        if (json && typeof json === 'object') {
          const rows = Object.entries(json as Record<string, unknown>)
            .map(([key, value]) => [Number(key), String(value ?? '')] as const)
            .filter(([index]) => Number.isFinite(index))
            .sort((a, b) => a[0] - b[0]);
          return rows.map(([, value]) => value);
        }
        return null;
      } catch (error) {
        console.warn('[Hearly] Local STT vocabulary unavailable:', error);
        return null;
      }
    })();
  }
  return vocabPromise;
}

function decodeGreedyCtc(logits: Float32Array, frames: number, vocabSize: number, vocab: readonly string[]): { text: string; score: number } {
  let previousToken = -1;
  let confidenceSum = 0;
  let confidenceCount = 0;
  const tokens: string[] = [];
  const blankId = 0;

  for (let frame = 0; frame < frames; frame += 1) {
    let bestToken = 0;
    let bestValue = Number.NEGATIVE_INFINITY;
    let sumExp = 0;

    for (let token = 0; token < vocabSize; token += 1) {
      const value = logits[frame * vocabSize + token] ?? Number.NEGATIVE_INFINITY;
      if (value > bestValue) {
        bestValue = value;
        bestToken = token;
      }
    }

    for (let token = 0; token < vocabSize; token += 1) {
      const value = logits[frame * vocabSize + token] ?? Number.NEGATIVE_INFINITY;
      sumExp += Math.exp(value - bestValue);
    }
    const bestProb = 1 / Math.max(1, sumExp);

    if (bestToken !== blankId && bestToken !== previousToken) {
      const raw = vocab[bestToken] ?? '';
      const cleaned = raw
        .replace(/<\|.*?\|>/g, '')
        .replace(/<pad>|<s>|<\/s>|<unk>/g, '')
        .replace(/\|/g, ' ')
        .replace(/_/g, ' ');
      if (cleaned) {
        tokens.push(cleaned);
        confidenceSum += bestProb;
        confidenceCount += 1;
      }
    }

    previousToken = bestToken;
  }

  const text = tokens.join('').replace(/\s+/g, ' ').trim();
  const score = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
  return { text, score };
}

export async function transcribePcmWithOnnx(
  samples: Float32Array,
  sampleRate: number,
): Promise<LocalSttResult> {
  const [session, vocab] = await Promise.all([loadSession(), loadVocabulary()]);
  if (!session || !vocab || vocab.length === 0) {
    return { text: '', score: 0, unavailable: true };
  }

  const normalized = normalizeAudio(resampleLinear(samples, sampleRate, TARGET_SAMPLE_RATE));
  const input = new ort.Tensor('float32', normalized, [1, normalized.length]);
  const inputName = session.inputNames[0] ?? 'input_values';

  try {
    const outputs = await session.run({ [inputName]: input });
    const outputName = session.outputNames[0] ?? Object.keys(outputs)[0];
    const tensor = outputs[outputName];
    if (!tensor || !(tensor.data instanceof Float32Array)) {
      return { text: '', score: 0, unavailable: true };
    }
    const dims = tensor.dims ?? [];
    const frames = Number(dims[1] ?? 0);
    const vocabSize = Number(dims[2] ?? vocab.length);
    if (!frames || !vocabSize) {
      return { text: '', score: 0, unavailable: true };
    }
    const decoded = decodeGreedyCtc(tensor.data, frames, vocabSize, vocab);
    return { text: decoded.text, score: decoded.score, unavailable: false };
  } catch (error) {
    console.warn('[Hearly] Local STT inference failed:', error);
    return { text: '', score: 0, unavailable: true };
  }
}
