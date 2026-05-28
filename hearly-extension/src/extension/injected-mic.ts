import { StreamingRecorder } from '../audio/streamingRecorder';

type HearlyPageRequest = {
  source: 'hearly-page';
  type: 'GET_MIC_STATE';
  requestId: string;
  platform: string;
};

type HearlyContentResponse = {
  source: 'hearly-content';
  type: 'MIC_STATE';
  requestId: string;
  enabled: boolean;
  embedding: number[] | null;
  threshold?: number;
  workletUrl?: string;
  transcriptionEnabled?: boolean;
};

type HearlyPageStatus = {
  source: 'hearly-page';
  type:
    | 'MIC_PROCESSING_STARTED'
    | 'MIC_PROCESSING_STOPPED'
    | 'MIC_PROCESSING_ERROR'
    | 'VOICE_MATCH'
    | 'NEW_MIC_CHUNK';
  platform: string;
  score?: number;
  matched?: boolean;
  error?: string;
  audioBase64?: string;
  timestamp?: number;
};

const PLATFORM = window.location.hostname.includes('zoom.us')
  ? 'zoom'
  : window.location.hostname.includes('teams.')
  ? 'teams'
  : window.location.hostname.includes('meet.google.com')
  ? 'meet'
  : 'unknown';

function postStatus(status: Omit<HearlyPageStatus, 'source' | 'platform'>) {
  window.postMessage(
    {
      source: 'hearly-page',
      platform: PLATFORM,
      ...status,
    } satisfies HearlyPageStatus,
    window.location.origin,
  );
}

function requestMicState(): Promise<{
  enabled: boolean;
  embedding: Float32Array | null;
  threshold: number;
  workletUrl: string;
  transcriptionEnabled: boolean;
}> {
  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      resolve({ enabled: false, embedding: null, threshold: 0.58, workletUrl: '', transcriptionEnabled: false });
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
let activeMicRecorder: StreamingRecorder | null = null;
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
    
    if (data.type === 'TRANSCRIPT_STATE_CHANGED') {
      const isEnabled = data.enabled;
      if (isEnabled) {
        if (activeMicStream && !activeMicRecorder) {
          activeMicRecorder = new StreamingRecorder(activeMicStream, 'you', (chunkBase64, timestamp) => {
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
  enrolledEmbedding: Float32Array,
  threshold: number,
  enabled: boolean,
  workletUrl: string,
  transcriptionEnabled: boolean,
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

  workletNode.port.postMessage({
    type: 'SET_EMBEDDING',
    payload: {
      embedding: Array.from(enrolledEmbedding),
      threshold,
    },
  });

  workletNode.port.postMessage({
    type: 'SET_FILTER_ACTIVE',
    payload: {
      active: enabled,
    },
  });

  workletNode.port.onmessage = (event) => {
    const { type, score, matched } = event.data;
    if (type === 'VOICE_MATCH_EVALUATION') {
      postStatus({
        type: 'VOICE_MATCH',
        score,
        matched,
      });
    }
  };

  source.connect(workletNode);
  workletNode.connect(destination);

  if (transcriptionEnabled) {
    activeMicRecorder = new StreamingRecorder(stream, 'you', (chunkBase64, timestamp) => {
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
      if (!state.embedding) return stream;
      return await processUserMicStream(stream, state.embedding, state.threshold, state.enabled, state.workletUrl, state.transcriptionEnabled);
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
