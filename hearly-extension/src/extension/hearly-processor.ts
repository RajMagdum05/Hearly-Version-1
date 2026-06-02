// hearly-processor.ts

interface AudioWorkletProcessor {
  readonly port: MessagePort;
}

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

declare const currentTime: number;
declare const sampleRate: number;

const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

class HearyVoiceProcessor extends AudioWorkletProcessor {
  private ringBuffer: Float32Array;
  private writeIndex: number = 0;
  private readonly processorSampleRate: number;
  private windowSize: number;
  private rmsThreshold: number = 0.012;
  private lastMatchTime: number = Number.NEGATIVE_INFINITY;
  private blockedGain: number = 0;
  private targetGain: number = 1.0;
  private currentGain: number = 1.0;
  private filterActive: boolean = false;
  private enrolledEmbedding: Float32Array | null = null;
  private similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD;
  private samplesSinceEvaluation: number = 0;
  private samplesSeen: number = 0;

  constructor() {
    super();
    this.processorSampleRate = typeof sampleRate === 'number' && sampleRate > 0 ? sampleRate : 48000;
    this.windowSize = Math.floor(this.processorSampleRate * 0.75);
    this.ringBuffer = new Float32Array(this.windowSize);
    
    this.port.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'SET_EMBEDDING') {
        this.enrolledEmbedding = new Float32Array(payload.embedding);
        this.similarityThreshold = payload.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
      } else if (type === 'SET_FILTER_ACTIVE') {
        this.filterActive = payload.active;
        if (!payload.active) {
          this.lastMatchTime = Number.NEGATIVE_INFINITY;
        }
      }
    };
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const x = a[i] ?? 0;
      const y = b[i] ?? 0;
      dot += x * y;
      na += x * x;
      nb += y * y;
    }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d === 0 ? 0 : dot / d;
  }

  private estimatePitchStrength(segment: Float32Array, sampleRate: number): number {
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
        const current = segment[i] ?? 0;
        const previous = segment[i - lag] ?? 0;
        correlation += current * previous;
        energy += current * current + previous * previous;
      }

      if (energy > 0) {
        best = Math.max(best, (2 * correlation) / energy);
      }
    }

    return Math.max(0, best);
  }

  private extractFeatures(samples: Float32Array, sampleRate: number): Float32Array {
    const segmentCount = 24;
    const featuresPerSegment = 8;
    const embedding = new Float32Array(segmentCount * featuresPerSegment);
    const segmentLength = Math.max(1, Math.floor(samples.length / segmentCount));

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const start = segmentIndex * segmentLength;
      const end =
        segmentIndex === segmentCount - 1
          ? samples.length
          : Math.min(samples.length, start + segmentLength);
      let sumAbs = 0;
      let sumSquares = 0;
      let peak = 0;
      let crossings = 0;
      let positive = 0;
      let attack = 0;

      for (let i = start; i < end; i += 1) {
        const sample = samples[i] ?? 0;
        const abs = Math.abs(sample);
        sumAbs += abs;
        sumSquares += sample * sample;
        peak = Math.max(peak, abs);
        if (sample > 0) positive += 1;
        if (i > start) {
          const previous = samples[i - 1] ?? 0;
          if ((sample >= 0 && previous < 0) || (sample < 0 && previous >= 0)) {
            crossings += 1;
          }
          attack += Math.max(0, abs - Math.abs(previous));
        }
      }

      const length = Math.max(1, end - start);
      const rms = Math.sqrt(sumSquares / length);
      const offset = segmentIndex * featuresPerSegment;
      
      embedding[offset] = sumAbs / length;
      embedding[offset + 1] = rms;
      embedding[offset + 2] = crossings / length;
      embedding[offset + 3] = Math.min(1, peak);
      embedding[offset + 4] = rms > 0 ? Math.min(1, peak / rms / 8) : 0;
      embedding[offset + 5] = positive / length;
      embedding[offset + 6] = Math.min(1, (attack / length) * 20);

      const segmentSamples = samples.slice(start, end);
      const pitchStrength = this.estimatePitchStrength(segmentSamples, sampleRate);
      const quietness = 1 - Math.min(1, rms * 4);
      embedding[offset + 7] = Math.min(1, pitchStrength + quietness * 0.12);
    }

    // Normalize L2
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) embedding[i] /= norm;
    }

    return embedding;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const length = channelData.length;

    // 1. Write to circular ring buffer
    for (let i = 0; i < length; i++) {
      this.ringBuffer[this.writeIndex] = channelData[i] ?? 0;
      this.writeIndex = (this.writeIndex + 1) % this.windowSize;
    }
    this.samplesSeen += length;

    // 2. Compute RMS of the current frame
    let frameSumSquares = 0;
    for (let i = 0; i < length; i++) {
      const val = channelData[i] ?? 0;
      frameSumSquares += val * val;
    }
    const frameRms = Math.sqrt(frameSumSquares / length);
    const hasSpeech = frameRms > this.rmsThreshold;

    // 3. Low-latency periodic speaker verification.
    this.samplesSinceEvaluation += length;
    const evaluationInterval = Math.floor(this.processorSampleRate * 0.18);
    if (
      this.samplesSinceEvaluation >= evaluationInterval &&
      this.samplesSeen >= this.windowSize &&
      hasSpeech &&
      this.enrolledEmbedding &&
      this.filterActive
    ) {
      this.samplesSinceEvaluation = 0;
      const linearBuffer = new Float32Array(this.windowSize);
      for (let i = 0; i < this.windowSize; i++) {
        linearBuffer[i] = this.ringBuffer[(this.writeIndex + i) % this.windowSize] ?? 0;
      }

      const currentEmbedding = this.extractFeatures(linearBuffer, this.processorSampleRate);
      const similarity = this.cosineSimilarity(this.enrolledEmbedding, currentEmbedding);
      const isMatch = similarity >= this.similarityThreshold;

      this.port.postMessage({
        type: 'VOICE_MATCH_EVALUATION',
        score: similarity,
        matched: isMatch
      });

      if (isMatch) {
        this.lastMatchTime = currentTime;
      }
    }

    // 4. Determine target gain based on active speech matching
    if (this.filterActive && this.enrolledEmbedding) {
      const matchGracePeriod = 0.45;
      const isWithinMatchGrace = (currentTime - this.lastMatchTime) < matchGracePeriod;
      this.targetGain = !hasSpeech || isWithinMatchGrace ? 1.0 : this.blockedGain;
    } else {
      this.targetGain = 1.0;
    }

    // 5. Exponential gain smoothing
    const channels = output.length;
    for (let i = 0; i < length; i++) {
      const smoothing = this.targetGain < this.currentGain ? 0.32 : 0.12;
      this.currentGain += (this.targetGain - this.currentGain) * smoothing;
      for (let c = 0; c < channels; c++) {
        if (output[c]) {
          output[c][i] = (channelData[i] ?? 0) * this.currentGain;
        }
      }
    }

    return true;
  }
}

registerProcessor('hearly-voice-processor', HearyVoiceProcessor);
