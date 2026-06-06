import { HearlyMessage } from '../messages';
import { StreamingRecorder } from '../../audio/streamingRecorder';
import { loadVoiceProfile } from '../../services/storageService';
import { SPEAKER_SIMILARITY_THRESHOLD } from '../../config/constants';
import { showHearlySubtitle } from './subtitleOverlay';

export type EnrollmentStorageResult = {
  hearly_enrollment?: {
    isEnrolled?: boolean;
  };
  hearly_filter?: {
    isActive?: boolean;
  };
  hearly_voice_profile?: {
    embedding?: number[];
  };
  hearly_voice_runtime_profile?: {
    embedding?: number[];
    embeddingModel?: 'fallback' | 'onnx-ready';
  };
  hearly_transcript?: {
    isEnabled?: boolean;
  };
};

let runtimeVerificationInFlight = false;
let runtimeEmbeddingModel: 'fallback' | 'onnx-ready' = 'fallback';
let onnxUnavailableNotified = false;
let bannerDismissed = false;

let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let streamingRecorder: StreamingRecorder | null = null;

export async function decodeAudioBase64ToPcm(
  base64: string,
): Promise<{ samples: number[]; sampleRate: number } | null> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/webm' });
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData((await blob.arrayBuffer()).slice(0));
      const mixed = new Float32Array(buffer.length);
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i += 1) {
          mixed[i] += (channelData[i] ?? 0) / buffer.numberOfChannels;
        }
      }
      return { samples: Array.from(mixed), sampleRate: buffer.sampleRate };
    } finally {
      await context.close();
    }
  } catch (error) {
    console.warn('[Hearly] Failed to decode transcript audio chunk:', error);
    return null;
  }
}

export function installMicBridge(platform: string) {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data as {
      source?: string;
      type?: string;
      requestId?: string;
      platform?: string;
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
    if (data?.source !== 'hearly-page') return;

    if (data.type === 'GET_MIC_STATE' && data.requestId) {
      chrome.storage.local.get(['hearly_filter', 'hearly_transcript'], async (result: EnrollmentStorageResult) => {
        const profile = await loadVoiceProfile();
        const embeddingModel = profile?.embeddingModel ?? 'fallback';
        runtimeEmbeddingModel = embeddingModel;
        window.postMessage({
          source: 'hearly-content',
          type: 'MIC_STATE',
          requestId: data.requestId,
          enabled: result.hearly_filter?.isActive === true,
          embedding:
            embeddingModel === 'fallback'
              ? (profile?.embedding ? Array.from(profile.embedding) : null)
              : null,
          embeddingModel: embeddingModel,
          threshold: embeddingModel === 'fallback' ? SPEAKER_SIMILARITY_THRESHOLD : 0.58,
          workletUrl: chrome.runtime.getURL('hearly-processor.js'),
          transcriptionEnabled: result.hearly_transcript?.isEnabled === true,
        }, window.location.origin);
      });
      return;
    }

    if (data.type === 'VOICE_WINDOW' && data.samplesBuffer) {
      if (runtimeEmbeddingModel !== 'onnx-ready') return;
      if (runtimeVerificationInFlight) return;
      runtimeVerificationInFlight = true;
      chrome.runtime.sendMessage({
        type: 'HEARLY_VERIFY_VOICE_WINDOW',
        samples: Array.from(new Float32Array(data.samplesBuffer)),
        sampleRate: data.sampleRate ?? 48000,
        threshold: 0.58,
        vadConfidence: data.vadConfidence,
      }, (response?: { matched?: boolean; score?: number; unavailable?: boolean }) => {
        runtimeVerificationInFlight = false;
        if (chrome.runtime.lastError || !response) return;
        if (response.unavailable) {
          if (!onnxUnavailableNotified) {
            onnxUnavailableNotified = true;
            chrome.runtime.sendMessage({
              type: 'HEARLY_MIC_PROCESSING_ERROR',
              platform: data.platform ?? platform,
              error: 'Local ONNX speaker model unavailable. Export hearly-speaker-v1.onnx and reload extension.',
            } as HearlyMessage);
          }
          return;
        }
        onnxUnavailableNotified = false;
        window.postMessage({
          source: 'hearly-content',
          type: 'VOICE_MATCH_DECISION',
          matched: response.matched === true,
          score: response.score ?? 0,
          vadConfidence: data.vadConfidence,
        }, window.location.origin);

        chrome.runtime.sendMessage({
          type: 'HEARLY_VOICE_MATCH',
          platform: data.platform ?? platform,
          score: response.score ?? 0,
          matched: response.matched === true,
        } as HearlyMessage);
      });
      return;
    }

    if (data.type === 'NEW_MIC_CHUNK' && data.audioBase64) {
      void (async () => {
        const decoded = await decodeAudioBase64ToPcm(data.audioBase64!);
        if (!decoded) return;
        chrome.runtime.sendMessage({
          type: 'HEARLY_TRANSCRIBE_CHUNK',
          audioBase64: data.audioBase64,
          samples: decoded.samples,
          sampleRate: decoded.sampleRate,
          speaker: 'you',
          timestamp: data.timestamp ?? Date.now(),
        });
      })();
      return;
    }

    const map: Record<string, HearlyMessage['type']> = {
      MIC_PROCESSING_STARTED: 'HEARLY_MIC_PROCESSING_STARTED',
      MIC_PROCESSING_STOPPED: 'HEARLY_MIC_PROCESSING_STOPPED',
      MIC_PROCESSING_ERROR: 'HEARLY_MIC_PROCESSING_ERROR',
      VOICE_MATCH: 'HEARLY_VOICE_MATCH',
      VOICE_ACTIVITY: 'HEARLY_VOICE_ACTIVITY',
    };
    const type = data.type ? map[data.type] : undefined;
    if (type) {
      chrome.runtime.sendMessage({
        type,
        platform: data.platform ?? platform,
        score: data.score,
        matched: data.matched,
        isSpeech: data.isSpeech,
        confidence: data.confidence,
        rms: data.rms,
        noiseFloor: data.noiseFloor,
        error: data.error,
      } as HearlyMessage);
    }
  });
}

export function startTranscriptionRecorder(stream: MediaStream) {
  if (streamingRecorder) return;
  console.log('[Hearly] Starting transcription recorder...');
  chrome.storage.local.get('hearly_app_settings', (settingsResult: any) => {
    const language = settingsResult.hearly_app_settings?.language ?? 'en';
    streamingRecorder = new StreamingRecorder(stream, 'others', (chunkBase64, timestamp) => {
      void (async () => {
        const decoded = await decodeAudioBase64ToPcm(chunkBase64);
        if (!decoded) return;
        chrome.runtime.sendMessage({
          type: 'HEARLY_TRANSCRIBE_CHUNK',
          audioBase64: chunkBase64,
          samples: decoded.samples,
          sampleRate: decoded.sampleRate,
          language,
          speaker: 'others',
          timestamp,
        });
      })();
    });
    streamingRecorder.start();
  });
}

export function stopTranscriptionRecorder() {
  const recorder = streamingRecorder;
  if (recorder) {
    recorder.stop();
    streamingRecorder = null;
  }
  console.log('[Hearly] Transcription recorder stopped');
}

export function stopMeetingAudioCapture(platform: string): void {
  stopTranscriptionRecorder();
  const node = sourceNode;
  if (node) {
    node.disconnect();
    sourceNode = null;
  }
  const ctx = audioContext;
  if (ctx) {
    ctx.close();
    audioContext = null;
  }
  const stream = mediaStream;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  console.log(`[Hearly] Audio capture stopped on ${platform} page`);
  chrome.runtime.sendMessage({ type: 'HEARLY_AUDIO_STOPPED', platform });
}

export function injectHearlyBanner(): void {
  if (bannerDismissed || document.getElementById('hearly-banner')) return;

  chrome.storage.local.get('hearly_enrollment', (result: EnrollmentStorageResult) => {
    if (bannerDismissed || document.getElementById('hearly-banner')) return;
    const isEnrolled = result?.hearly_enrollment?.isEnrolled === true;

    const banner = document.createElement('div');
    banner.id = 'hearly-banner';
    banner.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: rgba(14, 14, 14, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 14px 10px 12px;
      font-family: Inter, -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05);
      white-space: nowrap;
    `;

    const logoSvg = `
      <div style="
        width: 34px;
        height: 34px;
        background: #0f0f0f;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 1px solid rgba(181,240,61,0.15);
      ">
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>
            @keyframes hb1 { 0%,100%{height:4px;y:6px} 50%{height:10px;y:3px} }
            @keyframes hb2 { 0%,100%{height:8px;y:4px} 50%{height:14px;y:1px} }
            @keyframes hb3 { 0%,100%{height:12px;y:2px} 50%{height:16px;y:0px} }
            @keyframes hb4 { 0%,100%{height:14px;y:1px} 50%{height:10px;y:3px} }
            @keyframes hb5 { 0%,100%{height:8px;y:4px} 50%{height:14px;y:1px} }
            @keyframes hb6 { 0%,100%{height:4px;y:6px} 50%{height:9px;y:3px} }
            .hb1{animation:hb1 1.1s ease-in-out infinite}
            .hb2{animation:hb2 0.9s ease-in-out infinite 0.1s}
            .hb3{animation:hb3 1.0s ease-in-out infinite 0.2s}
            .hb4{animation:hb4 0.8s ease-in-out infinite 0.15s}
            .hb5{animation:hb5 1.1s ease-in-out infinite 0.05s}
            .hb6{animation:hb6 0.9s ease-in-out infinite 0.25s}
          </style>
          <rect class="hb1" x="0"  y="6"  width="2.5" rx="1.25" height="4"  fill="#3a5c0a" opacity="0.6"/>
          <rect class="hb2" x="3"  y="4"  width="2.5" rx="1.25" height="8"  fill="#6aaa10" opacity="0.75"/>
          <rect class="hb3" x="6"  y="2"  width="2.5" rx="1.25" height="12" fill="#B5F03D"/>
          <rect class="hb4" x="9"  y="1"  width="2.5" rx="1.25" height="14" fill="#B5F03D"/>
          <rect class="hb5" x="12" y="4"  width="2.5" rx="1.25" height="8"  fill="#6aaa10" opacity="0.75"/>
          <rect class="hb6" x="15" y="6"  width="2.5" rx="1.25" height="4"  fill="#3a5c0a" opacity="0.6"/>
        </svg>
      </div>
    `;

    if (isEnrolled) {
      banner.innerHTML = `
        ${logoSvg}
        <div style="display:flex; flex-direction:column; gap:1px;">
          <div style="color:#F0F0F0; font-size:13px; font-weight:600; letter-spacing:-0.1px; line-height:1.3;">
            Hearly detected your meeting
          </div>
          <div style="color:#9CA3AF; font-size:11px; font-weight:400; line-height:1.3;">
            Voice focus is ready
          </div>
        </div>
        <button id="hearly-activate-btn" style="
          background: #B5F03D;
          color: #000000;
          border: none;
          border-radius: 10px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: Inter, -apple-system, sans-serif;
          letter-spacing: 0.1px;
          flex-shrink: 0;
        ">Activate</button>
        <button id="hearly-dismiss-btn" style="
          background: transparent;
          color: #444444;
          border: none;
          padding: 4px 2px;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          flex-shrink: 0;
        ">×</button>
      `;
    } else {
      banner.innerHTML = `
        ${logoSvg}
        <div style="display:flex; flex-direction:column; gap:1px;">
          <div style="color:#F0F0F0; font-size:13px; font-weight:600; letter-spacing:-0.1px; line-height:1.3;">
            Train your voice in 30 sec
          </div>
          <div style="color:#9CA3AF; font-size:11px; font-weight:400; line-height:1.3;">
            Let Hearly learn your voice to get started
          </div>
        </div>
        <button id="hearly-train-btn" style="
          background: transparent;
          color: #B5F03D;
          border: 1px solid rgba(181,240,61,0.4);
          border-radius: 10px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: Inter, -apple-system, sans-serif;
          letter-spacing: 0.1px;
          flex-shrink: 0;
        ">Open Hearly</button>
        <button id="hearly-dismiss-btn" style="
          background: transparent;
          color: #444444;
          border: none;
          padding: 4px 2px;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          flex-shrink: 0;
        ">×</button>
      `;
    }

    const appendToBody = () => {
      if (bannerDismissed || document.getElementById('hearly-banner')) return;
      if (document.body) {
        document.body.appendChild(banner);

        document.getElementById('hearly-activate-btn')?.addEventListener('click', () => {
          chrome.runtime.sendMessage({ type: 'ACTIVATE_HEARLY' });
          bannerDismissed = true;
          banner.remove();
        });

        document.getElementById('hearly-train-btn')?.addEventListener('click', () => {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
          bannerDismissed = true;
          banner.remove();
        });

        document.getElementById('hearly-dismiss-btn')?.addEventListener('click', () => {
          bannerDismissed = true;
          banner.remove();
        });
      } else {
        const bodyObserver = new MutationObserver((_, obs) => {
          if (document.body) {
            obs.disconnect();
            appendToBody();
          }
        });
        bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
    };

    appendToBody();
  });
}

export function injectHearlyIndicator(): void {
  if (document.getElementById('hearly-indicator')) return;

  const container = document.createElement('div');
  container.id = 'hearly-indicator';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: rgba(14, 14, 14, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    font-family: Inter, -apple-system, sans-serif;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.05);
    cursor: pointer;
    user-select: none;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  `;

  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.04)';
    container.style.borderColor = 'rgba(255, 255, 255, 0.16)';
  });
  container.addEventListener('mouseleave', () => {
    container.style.transform = 'scale(1)';
    container.style.borderColor = 'rgba(255, 255, 255, 0.08)';
  });

  const label = document.createElement('span');
  label.id = 'hearly-indicator-label';
  label.style.cssText = `
    color: #F0F0F0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: -0.1px;
    transition: color 0.3s ease;
  `;
  container.appendChild(label);

  const dot = document.createElement('div');
  dot.id = 'hearly-indicator-dot';
  dot.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: background 0.3s ease;
  `;
  container.appendChild(dot);

  const updateState = (isActive: boolean) => {
    if (isActive) {
      label.innerText = 'Hearly ON';
      label.style.color = '#F0F0F0';
      dot.style.background = '#B5F03D';
      dot.style.boxShadow = 'none';
    } else {
      label.innerText = 'Hearly OFF';
      label.style.color = '#9CA3AF';
      dot.style.background = '#EF4444';
      dot.style.boxShadow = 'none';
    }
  };

  container.addEventListener('click', () => {
    chrome.storage.local.get('hearly_filter', (result: EnrollmentStorageResult) => {
      const active = result.hearly_filter?.isActive === true;
      if (!active) {
        chrome.storage.local.set({ hearly_filter: { isActive: true } }, () => {
          chrome.runtime.sendMessage({ type: 'HEARLY_TOGGLE' });
          window.postMessage({
            source: 'hearly-content',
            type: 'FILTER_STATE_CHANGED',
            active: true
          }, window.location.origin);
          updateState(true);
        });
      }
    });
  });

  chrome.storage.local.get('hearly_filter', (result: EnrollmentStorageResult) => {
    updateState(result.hearly_filter?.isActive === true);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.hearly_filter) {
      updateState((changes.hearly_filter.newValue as any)?.isActive === true);
    }
  });

  const appendToBody = () => {
    if (document.body) {
      document.body.appendChild(container);
    } else {
      setTimeout(appendToBody, 100);
    }
  };
  appendToBody();
}

export function registerMessageListener(platform: string) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'HEARLY_NEW_TRANSCRIPT_ENTRY' && message.entry) {
      showHearlySubtitle(message.entry);
    }

    if (message.type === 'HEARBEAT_PING') {
      sendResponse({ status: 'pong' });
      return true;
    }

    if (message.type === 'HEARLY_START_AUDIO' && message.streamId) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: message.streamId
          }
        } as MediaTrackConstraints,
        video: false
      }).then((stream) => {
        mediaStream = stream;
        audioContext = new AudioContext({ sampleRate: 16000 });

        if (audioContext.state === 'suspended') {
          const resume = () => {
            audioContext?.resume();
            window.removeEventListener('click', resume);
          };
          window.addEventListener('click', resume);
        }

        sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(audioContext.destination);
        console.log(`[Hearly] Audio capture started on ${platform} page (tabCapture)`);
        chrome.runtime.sendMessage({ type: 'HEARLY_AUDIO_STARTED', platform });

        chrome.storage.local.get('hearly_transcript', (result: EnrollmentStorageResult) => {
          if (result.hearly_transcript?.isEnabled) {
            startTranscriptionRecorder(stream);
          }
        });
      }).catch((err) => {
        console.warn(`[Hearly] ${platform} tabCapture stream failed:`, err);
        chrome.runtime.sendMessage({ type: 'HEARLY_AUDIO_ERROR', error: String(err) });
      });
    }

    if (message.type === 'HEARLY_STOP_AUDIO') {
      stopMeetingAudioCapture(platform);
    }

    if (message.type === 'HEARLY_FILTER_STATE_CHANGED') {
      chrome.storage.local.get('hearly_filter', (result: EnrollmentStorageResult) => {
        window.postMessage({
          source: 'hearly-content',
          type: 'FILTER_STATE_CHANGED',
          active: result.hearly_filter?.isActive === true,
        }, window.location.origin);
      });
    }

    if (message.type === 'HEARLY_TRANSCRIPT_STATE_CHANGED') {
      chrome.storage.local.get('hearly_transcript', (result: EnrollmentStorageResult) => {
        const isEnabled = result.hearly_transcript?.isEnabled === true;

        window.postMessage({
          source: 'hearly-content',
          type: 'TRANSCRIPT_STATE_CHANGED',
          enabled: isEnabled,
        }, window.location.origin);

        if (isEnabled) {
          if (mediaStream && !streamingRecorder) {
            startTranscriptionRecorder(mediaStream);
          }
        } else {
          stopTranscriptionRecorder();
        }
      });
    }
  });
}

export function initPlatform(
  platform: string,
  detectMeeting: () => boolean,
  observeTarget: () => HTMLElement | null
) {
  installMicBridge(platform);
  injectHearlyBanner();
  injectHearlyIndicator();

  const sendMeetingDetected = () => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DETECTED',
      payload: { platform }
    } as HearlyMessage);
  };

  const sendMeetingEnded = () => {
    chrome.runtime.sendMessage({ type: 'MEETING_ENDED' } as HearlyMessage);
  };

  const startObserver = () => {
    const target = observeTarget();
    if (!target) {
      setTimeout(startObserver, 50);
      return;
    }

    if (detectMeeting()) {
      sendMeetingDetected();
      console.log(`[Hearly] ${platform} meeting active on load`);
    }

    let lastMeetingState = detectMeeting();

    const observer = new MutationObserver(() => {
      const currentState = detectMeeting();

      if (currentState !== lastMeetingState) {
        if (currentState) {
          sendMeetingDetected();
          console.log(`[Hearly] ${platform} meeting started`);
        } else {
          sendMeetingEnded();
          console.log(`[Hearly] ${platform} meeting ended`);
        }
        lastMeetingState = currentState;
      }

      if (!document.getElementById('hearly-banner') && !bannerDismissed) {
        injectHearlyBanner();
      }
    });

    observer.observe(target, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  };

  startObserver();
  registerMessageListener(platform);
}
