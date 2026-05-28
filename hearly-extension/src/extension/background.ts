import { HearlyMessage, MeetingStatus, Platform } from './messages';
import { transcribeAudioInCloud } from '../services/cloudService';
import type { TranscriptEntry } from '../utils/types';
import { TranscriptMerger } from '../audio/transcriptMerger';
import { loadTranscriptEntries, saveTranscriptEntries } from '../services/storageService';

let meetingStatus: MeetingStatus = {
  isInMeeting: false,
  platform: 'unknown',
  isActive: false
};

let currentSessionId = crypto.randomUUID();

const youMerger = new TranscriptMerger();
const othersMerger = new TranscriptMerger();

let lastAssistantCallTime = 0;
let assistantCalling = false;

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
      chrome.tabCapture.getMediaStreamId({ consumerTabId: tabId }, (streamId) => {
        if (chrome.runtime.lastError || !streamId) return;
        chrome.tabs.sendMessage(tabId, { type: 'HEARLY_START_AUDIO', streamId });
      });
    });
  }

  public static unregister() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.keepAliveTabId = null;
  }
}

// ─── AI Assistant Sliding Context Window ──────────────────────────────────
function getContextForLLM(entries: TranscriptEntry[]): string {
  let contextStr = "";
  let estimatedTokens = 0;
  const maxTokens = 1500;
  
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry) continue;
    const line = `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.speaker === 'you' ? 'You' : 'Others'}: ${entry.text}\n`;
    const lineTokens = Math.ceil(line.length / 4);
    
    if (estimatedTokens + lineTokens > maxTokens) {
      break;
    }
    
    contextStr = line + contextStr;
    estimatedTokens += lineTokens;
  }
  return contextStr;
}

function triggerAssistantInsights(entries: TranscriptEntry[]) {
  const now = Date.now();
  if (now - lastAssistantCallTime < 15000 || assistantCalling) return;
  
  assistantCalling = true;
  lastAssistantCallTime = now;
  
  const context = getContextForLLM(entries);
  const formData = new FormData();
  formData.append('context', context);
  
  fetch('http://localhost:8787/api/assistant', {
    method: 'POST',
    body: formData,
  })
    .then(res => res.json())
    .then((data: any) => {
      if (data.suggestion) {
        chrome.storage.local.set({ hearly_assistant_suggestion: data.suggestion }, () => {
          chrome.runtime.sendMessage({
            type: 'HEARLY_ASSISTANT_SUGGESTION',
            suggestion: data.suggestion,
          });
        });
      }
    })
    .catch(err => console.error('[Hearly Assistant] Call failed:', err))
    .finally(() => {
      assistantCalling = false;
    });
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
        chrome.tabs.sendMessage(tab.id, { type: 'HEARLY_STOP_AUDIO' });
      }
    });
    BackgroundWatchdog.unregister();
  }

  if (message.type === 'HEARLY_TRANSCRIBE_CHUNK' && (message as any).audioBase64) {
    const audioBase64 = (message as any).audioBase64;
    const language = (message as any).language ?? 'en';
    const speaker = (message as any).speaker ?? 'others';
    const timestamp = (message as any).timestamp ?? Date.now();

    const binaryString = atob(audioBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });

    transcribeAudioInCloud({ audio: audioBlob, language })
      .then((result) => {
        if (result && result.text && result.text.trim()) {
          const merger = speaker === 'you' ? youMerger : othersMerger;
          const novelText = merger.merge(result.text);

          if (novelText && novelText.trim()) {
            const entry: TranscriptEntry = {
              id: `msg-${crypto.randomUUID()}`,
              speaker: speaker as any,
              text: novelText.trim(),
              language: (result.language || language) as any,
              timestamp,
              sessionId: `session-${currentSessionId}`
            };

            loadTranscriptEntries().then((list) => {
              list.push(entry);
              saveTranscriptEntries(list).then(() => {
                chrome.runtime.sendMessage({
                  type: 'HEARLY_NEW_TRANSCRIPT_ENTRY',
                  entry
                });
                triggerAssistantInsights(list);
              });
            });
          }
        }
      })
      .catch((err) => {
        console.error('[Hearly] Transcription failed:', err);
      });
  }
}

function handleTabRemoved() {
  meetingStatus = { isInMeeting: false, platform: 'unknown', isActive: false };
  BackgroundWatchdog.unregister();
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
