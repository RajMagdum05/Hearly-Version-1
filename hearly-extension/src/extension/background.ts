import { HearlyMessage, MeetingStatus, Platform } from './messages';
import { compareSpeakerEmbeddings, embedPcmWindowWithOnnx } from '@/ai/localSpeakerModel';
import { transcribePcmWithOnnx } from '@/ai/localSttModel';
import type { TranscriptEntry } from '@/utils/types';
import { TranscriptMerger } from '@/audio/transcriptMerger';
import { loadTranscriptEntries, saveTranscriptEntries } from '@/services/storageService';
import { isCloudConfigured, transcribeAudioInCloud } from '@/services/cloudService';

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      v.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

let meetingStatus: MeetingStatus = {
  isInMeeting: false,
  platform: 'unknown',
  isActive: false
};

let currentSessionId = crypto.randomUUID();
const youMerger = new TranscriptMerger();
const othersMerger = new TranscriptMerger();
let sttUnavailableNotified = false;

type RuntimeVoiceProfile = {
  embedding?: number[];
  embeddingModel?: 'fallback' | 'onnx-ready';
};

function safeSendTabMessage(tabId: number, message: Record<string, unknown>) {
  chrome.tabs.sendMessage(tabId, message, () => {
    void chrome.runtime.lastError;
  });
}

// ─── Heartbeat Watchdog & Observability ──────────────────────────────────
class BackgroundWatchdog {
  private static activeTollInterval = 5000;
  private static keepAliveTabId: number | null = null;
  private static heartbeatTimer: any = null;

  public static registerTab(tabId: number) {
    this.keepAliveTabId = tabId;
    this.startWatchdog();
  }

  private static startWatchdog() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    this.heartbeatTimer = setInterval(() => {
      if (this.keepAliveTabId === null) return;
      
      chrome.tabs.sendMessage(this.keepAliveTabId, { type: 'HEARBEAT_PING' }, (response) => {
        if (chrome.runtime.lastError || !response || response.status !== 'pong') {
          console.warn('[Hearly Watchdog] Heartbeat missed for tab:', this.keepAliveTabId);
          this.reconnectPipeline(this.keepAliveTabId!);
        }
      });
    }, this.activeTollInterval);
  }

  private static reconnectPipeline(tabId: number) {
    console.log('[Hearly Watchdog] Initiating audio pipeline reconnect...');
    chrome.tabs.sendMessage(tabId, { type: 'HEARLY_STOP_AUDIO' }, () => {
      if (chrome.runtime.lastError) return;
      chrome.tabCapture.getMediaStreamId({ consumerTabId: tabId }, (streamId) => {
        if (chrome.runtime.lastError || !streamId) return;
        safeSendTabMessage(tabId, { type: 'HEARLY_START_AUDIO', streamId });
      });
    });
  }

  public static unregister() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.keepAliveTabId = null;
  }
}

function handleInstalled() {
  console.log('Hearly background ready');
}

function handleMessage(message: HearlyMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
  if (message.type === 'MEETING_DETECTED') {
    meetingStatus.isInMeeting = true;
    meetingStatus.platform = message.payload?.platform as Platform;
    currentSessionId = crypto.randomUUID();
    console.log('Meeting detected:', meetingStatus.platform);
  }
  
  if (message.type === 'MEETING_ENDED') {
    meetingStatus = { isInMeeting: false, platform: 'unknown', isActive: false };
    currentSessionId = crypto.randomUUID();
    sttUnavailableNotified = false;
    BackgroundWatchdog.unregister();
  }
  
  if (message.type === 'HEARLY_TOGGLE') {
    meetingStatus.isActive = !meetingStatus.isActive;
    console.log('Hearly isActive:', meetingStatus.isActive);
  }
  
  if (message.type === 'GET_STATUS') {
    sendResponse(meetingStatus);
    return true;
  }

  if (message.type === 'ACTIVATE_HEARLY') {
    meetingStatus.isActive = true;
    console.log('Hearly activated from meeting page');
    chrome.action.openPopup().catch(() => {
      console.log('Hearly: popup open attempted');
    });
  }

  if (message.type === 'OPEN_POPUP') {
    chrome.action.openPopup().catch(() => {
      console.log('Hearly: could not open popup automatically');
    });
  }

  if (message.type === 'REQUEST_MIC_PERMISSION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => {
                stream.getTracks().forEach(t => t.stop());
                chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' });
              })
              .catch(() => {
                chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_DENIED' });
              });
          }
        });
      }
    });
  }

  if (message.type === 'POPUP_TOGGLE_AUDIO_ON') {
    const streamId = (message as any).streamId;
    const tabId = (message as any).tabId;

    if (!streamId || !tabId) {
      console.warn('[Hearly] POPUP_TOGGLE_AUDIO_ON missing streamId or tabId');
      return;
    }

    console.log('[Hearly] Forwarding streamId to content script on tab:', tabId);
    BackgroundWatchdog.registerTab(tabId);

    chrome.tabs.sendMessage(tabId, {
      type: 'HEARLY_START_AUDIO',
      streamId
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[Hearly] Could not reach content script:', chrome.runtime.lastError.message);
      } else {
        console.log('[Hearly] streamId delivered to content script successfully');
      }
    });
  }

  if (message.type === 'POPUP_TOGGLE_AUDIO_OFF') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        safeSendTabMessage(tab.id, { type: 'HEARLY_STOP_AUDIO' });
      }
    });
    BackgroundWatchdog.unregister();
  }

  if (message.type === 'HEARLY_TRANSCRIBE_CHUNK') {
    const samples = message.samples;
    const sampleRate = message.sampleRate ?? 16000;
    const language = ((message as any).language ?? 'en') as 'en' | 'hi' | 'mr';
    const speaker = ((message as any).speaker ?? 'others') as 'you' | 'others';
    const timestamp = (message as any).timestamp ?? Date.now();
    if (!Array.isArray(samples) || samples.length === 0) {
      return;
    }

    void (async () => {
      let transcriptionText = '';
      let isUnavailable = false;

      // 1. Try local STT first
      const localResult = await transcribePcmWithOnnx(new Float32Array(samples), sampleRate);
      if (!localResult.unavailable) {
        transcriptionText = localResult.text;
      } else {
        // 2. Fall back to cloud STT if configured
        if (isCloudConfigured()) {
          try {
            const wavBlob = encodeWav(new Float32Array(samples), sampleRate);
            const cloudResult = await transcribeAudioInCloud({ audio: wavBlob, language });
            if (cloudResult && cloudResult.text) {
              transcriptionText = cloudResult.text;
            }
          } catch (error) {
            console.error('[Hearly] Cloud transcription failed:', error);
            isUnavailable = true;
          }
        } else {
          isUnavailable = true;
        }
      }

      if (isUnavailable) {
        if (!sttUnavailableNotified) {
          sttUnavailableNotified = true;
          chrome.runtime.sendMessage({
            type: 'HEARLY_MIC_PROCESSING_ERROR',
            error: 'Transcription service unavailable. Set up local STT model or configure VITE_HEARLY_API_BASE_URL for cloud transcription.',
          } as HearlyMessage);
        }
        return;
      }

      sttUnavailableNotified = false;
      const trimmed = transcriptionText.trim();
      if (!trimmed) return;

      const merger = speaker === 'you' ? youMerger : othersMerger;
      const merged = merger.merge(trimmed).trim();
      if (!merged) return;

      const entry: TranscriptEntry = {
        id: `msg-${crypto.randomUUID()}`,
        speaker,
        text: merged,
        language,
        timestamp,
        sessionId: `session-${currentSessionId}`,
      };

      const list = await loadTranscriptEntries();
      list.push(entry);
      await saveTranscriptEntries(list);
      chrome.runtime.sendMessage({
        type: 'HEARLY_NEW_TRANSCRIPT_ENTRY',
        entry,
      });
    })();
  }

  if (message.type === 'HEARLY_VERIFY_VOICE_WINDOW' && Array.isArray(message.samples)) {
    const samples = message.samples;
    chrome.storage.local.get(['hearly_voice_runtime_profile'], (result) => {
      void (async () => {
        const profile = result.hearly_voice_runtime_profile as RuntimeVoiceProfile | undefined;
        if (profile?.embeddingModel !== 'onnx-ready' || !profile.embedding) {
          sendResponse({ matched: false, score: 0, unavailable: true });
          return;
        }

        try {
          const candidate = await embedPcmWindowWithOnnx(
            new Float32Array(samples),
            message.sampleRate ?? 48000,
          );
          const comparison = compareSpeakerEmbeddings(
            new Float32Array(profile.embedding),
            candidate.embedding,
            message.threshold ?? 0.58,
          );
          if (candidate.modelStatus !== 'onnx-ready') {
            sendResponse({ matched: false, score: 0, unavailable: true });
            return;
          }
          sendResponse({
            matched: comparison.matched,
            score: comparison.score,
            unavailable: false,
          });
        } catch (error) {
          console.warn('[Hearly] Runtime ONNX voice verification failed:', error);
          sendResponse({ matched: false, score: 0, unavailable: true });
        }
      })();
    });
    return true;
  }
}

function handleTabRemoved() {
  meetingStatus = { isInMeeting: false, platform: 'unknown', isActive: false };
  BackgroundWatchdog.unregister();
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
