type HearlyPageRequest = {
  source: 'hearly-page';
  type: 'GET_MIC_STATE';
  requestId: string;
  platform: string;
};

class LocalChunkRecorder {
  private recorder: MediaRecorder | null = null;
  private timer: number | null = null;
  private chunks: Blob[] = [];

  constructor(
    private readonly stream: MediaStream,
    private readonly onChunk: (chunkBase64: string, timestamp: number) => void,
  ) {}

  start() {
    if (this.recorder) return;
    this.startWindow();
    this.timer = window.setInterval(() => this.startWindow(), 4000);
  }

  private startWindow() {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }

    this.chunks = [];
    const timestamp = Date.now();
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'audio/webm' });
      if (blob.size === 0) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1];
        if (base64) this.onChunk(base64, timestamp);
      };
      reader.readAsDataURL(blob);
    };
    this.recorder.start();

    window.setTimeout(() => {
      if (this.recorder?.state === 'recording') this.recorder.stop();
    }, 3900);
  }

  stop() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
    this.recorder = null;
  }
}

type HearlyContentResponse = {
  source: 'hearly-content';
  type: 'MIC_STATE';
  requestId: string;
  enabled: boolean;
  embedding: number[] | null;
  threshold?: number;
  workletUrl?: string;
  transcriptionEnabled?: boolean;
  embeddingModel?: 'fallback' | 'onnx-ready';
};

type HearlyPageStatus = {
  source: 'hearly-page';
  type:
    | 'MIC_PROCESSING_STARTED'
    | 'MIC_PROCESSING_STOPPED'
    | 'MIC_PROCESSING_ERROR'
    | 'VOICE_MATCH'
    | 'VOICE_ACTIVITY'
    | 'VOICE_WINDOW'
    | 'NEW_MIC_CHUNK';
  platform: string;
  score?: number;
  matched?: boolean;
  isSpeech?: boolean;
  confidence?: number;
  rms?: number;
  noiseFloor?: number;
  error?: string;
  audioBase64?: string;
  samplesBuffer?: ArrayBuffer;
  sampleRate?: number;
  vadConfidence?: number;
  timestamp?: number;
};

const PLATFORM = window.location.hostname.includes('zoom.us')
  ? 'zoom'
  : window.location.hostname.includes('teams.')
  ? 'teams'
  : window.location.hostname.includes('meet.google.com')
  ? 'meet'
  : 'unknown';

function postStatus(
  status: Omit<HearlyPageStatus, 'source' | 'platform'>,
  transfer?: Transferable[],
) {
  window.postMessage(
    {
      source: 'hearly-page',
      platform: PLATFORM,
      ...status,
    } satisfies HearlyPageStatus,
    window.location.origin,
    transfer ?? [],
  );
}

function requestMicState(): Promise<{
  enabled: boolean;
  embedding: Float32Array | null;
  threshold: number;
  workletUrl: string;
  transcriptionEnabled: boolean;
  embeddingModel: 'fallback' | 'onnx-ready';
}> {
  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      resolve({ enabled: false, embedding: null, threshold: 0.58, workletUrl: '', transcriptionEnabled: false, embeddingModel: 'fallback' });
    }, 500);

    const handleMessage = (event: MessageEvent<HearlyContentResponse>) => {
      if (event.source !== window) return;
      const data = event.data;
      if (
        data?.source !== 'hearly-content' ||
        data.type !== 'MIC_STATE' ||
        data.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      resolve({
        enabled: data.enabled,
        embedding: data.embedding ? new Float32Array(data.embedding) : null,
        threshold: data.threshold ?? 0.58,
        workletUrl: data.workletUrl ?? '',
        transcriptionEnabled: data.transcriptionEnabled ?? false,
        embeddingModel: data.embeddingModel ?? 'fallback',
      });
    };

    window.addEventListener('message', handleMessage);
    window.postMessage(
      {
        source: 'hearly-page',
        type: 'GET_MIC_STATE',
        requestId,
        platform: PLATFORM,
      } satisfies HearlyPageRequest,
      window.location.origin,
    );
  });
}

function shouldProcessUserMic(constraints?: MediaStreamConstraints): boolean {
  if (!constraints?.audio) return false;
  if (typeof constraints.audio === 'object') {
    const mandatory = (constraints.audio as { mandatory?: Record<string, unknown> })
      .mandatory;
    if (mandatory?.chromeMediaSource === 'tab') return false;
  }
  return true;
}

let activeWorkletNode: AudioWorkletNode | null = null;
let activeMicRecorder: LocalChunkRecorder | null = null;
let activeMicStream: MediaStream | null = null;

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data;
  if (data?.source === 'hearly-content') {
    if (data.type === 'FILTER_STATE_CHANGED') {
      if (activeWorkletNode) {
        activeWorkletNode.port.postMessage({
          type: 'SET_FILTER_ACTIVE',
          payload: { active: data.active }
        });
      }
    }

    if (data.type === 'VOICE_MATCH_DECISION' && activeWorkletNode) {
      activeWorkletNode.port.postMessage({
        type: 'SET_EXTERNAL_MATCH',
        payload: {
          matched: data.matched,
          score: data.score,
          vadConfidence: data.vadConfidence,
        },
      });
    }
    
    if (data.type === 'TRANSCRIPT_STATE_CHANGED') {
      const isEnabled = data.enabled;
      if (isEnabled) {
        if (activeMicStream && !activeMicRecorder) {
          activeMicRecorder = new LocalChunkRecorder(activeMicStream, (chunkBase64, timestamp) => {
            postStatus({
              type: 'NEW_MIC_CHUNK',
              audioBase64: chunkBase64,
              timestamp,
            });
          });
          activeMicRecorder.start();
        }
      } else {
        if (activeMicRecorder) {
          activeMicRecorder.stop();
          activeMicRecorder = null;
        }
      }
    }
  }
});

async function processUserMicStream(
  stream: MediaStream,
  enrolledEmbedding: Float32Array | null,
  threshold: number,
  enabled: boolean,
  workletUrl: string,
  transcriptionEnabled: boolean,
  embeddingModel: 'fallback' | 'onnx-ready',
): Promise<MediaStream> {
  const context = new AudioContext();
  activeMicStream = stream;

  try {
    await context.audioWorklet.addModule(workletUrl);
  } catch (err) {
    console.error('[Hearly] Failed to add AudioWorklet module:', err);
    throw err;
  }

  const source = context.createMediaStreamSource(stream);
  const destination = context.createMediaStreamDestination();

  const workletNode = new AudioWorkletNode(context, 'hearly-voice-processor');
  activeWorkletNode = workletNode;

  if (enrolledEmbedding && embeddingModel === 'fallback') {
    workletNode.port.postMessage({
      type: 'SET_EMBEDDING',
      payload: {
        embedding: Array.from(enrolledEmbedding),
        threshold,
      },
    });
  }

  workletNode.port.postMessage({
    type: 'SET_FILTER_ACTIVE',
    payload: {
      active: enabled,
    },
  });

  workletNode.port.onmessage = (event) => {
    const { type, score, matched, isSpeech, confidence, rms, noiseFloor, samples, sampleRate, vadConfidence } = event.data;
    if (type === 'VOICE_MATCH_EVALUATION') {
      postStatus({
        type: 'VOICE_MATCH',
        score,
        matched,
      });
    } else if (type === 'VOICE_ACTIVITY') {
      postStatus({
        type: 'VOICE_ACTIVITY',
        isSpeech,
        confidence,
        rms,
        noiseFloor,
      });
    } else if (type === 'VOICE_WINDOW' && embeddingModel === 'onnx-ready' && samples instanceof ArrayBuffer) {
      postStatus(
        {
          type: 'VOICE_WINDOW',
          samplesBuffer: samples,
          sampleRate,
          vadConfidence,
        },
        [samples],
      );
    }
  };

  source.connect(workletNode);
  workletNode.connect(destination);

  if (transcriptionEnabled) {
    activeMicRecorder = new LocalChunkRecorder(stream, (chunkBase64, timestamp) => {
      postStatus({
        type: 'NEW_MIC_CHUNK',
        audioBase64: chunkBase64,
        timestamp,
      });
    });
    activeMicRecorder.start();
  }

  stream.getTracks().forEach((track) => {
    track.addEventListener('ended', () => {
      if (activeMicRecorder) {
        activeMicRecorder.stop();
        activeMicRecorder = null;
      }
      workletNode.disconnect();
      source.disconnect();
      void context.close();
      if (activeWorkletNode === workletNode) {
        activeWorkletNode = null;
      }
      activeMicStream = null;
      postStatus({ type: 'MIC_PROCESSING_STOPPED' });
    });
  });

  postStatus({ type: 'MIC_PROCESSING_STARTED' });
  return destination.stream;
}

function installMicInterceptor() {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia) return;
  if ((mediaDevices.getUserMedia as { __hearlyPatched?: boolean }).__hearlyPatched) {
    return;
  }

  const nativeGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
  const patchedGetUserMedia = async (constraints?: MediaStreamConstraints) => {
    const stream = await nativeGetUserMedia(constraints);
    if (!shouldProcessUserMic(constraints)) return stream;

    try {
      const state = await requestMicState();
      if (!state.embedding && state.embeddingModel !== 'onnx-ready') return stream;
      return await processUserMicStream(
        stream,
        state.embedding,
        state.threshold,
        state.enabled,
        state.workletUrl,
        state.transcriptionEnabled,
        state.embeddingModel,
      );
    } catch (error) {
      postStatus({
        type: 'MIC_PROCESSING_ERROR',
        error: String(error),
      });
      return stream;
    }
  };

  patchedGetUserMedia.__hearlyPatched = true;
  mediaDevices.getUserMedia = patchedGetUserMedia;
}

installMicInterceptor();
