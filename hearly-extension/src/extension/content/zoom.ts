import type { HearlyMessage } from '../messages';

type EnrollmentStorageResult = {
  hearly_enrollment?: {
    isEnrolled?: boolean
  }
  hearly_filter?: {
    isActive?: boolean
  }
  hearly_voice_profile?: {
    embedding?: number[]
  }
  hearly_voice_runtime_profile?: {
    embedding?: number[]
    embeddingModel?: 'fallback' | 'onnx-ready'
  }
  hearly_transcript?: {
    isEnabled?: boolean
  }
}

const PLATFORM = 'zoom'
let runtimeVerificationInFlight = false
let runtimeEmbeddingModel: 'fallback' | 'onnx-ready' = 'fallback'
let onnxUnavailableNotified = false

async function decodeAudioBase64ToPcm(base64: string): Promise<{ samples: number[]; sampleRate: number } | null> {
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

class LocalChunkRecorder {
  private recorder: MediaRecorder | null = null
  private timer: number | null = null
  private chunks: Blob[] = []

  constructor(
    private readonly stream: MediaStream,
    private readonly speaker: 'you' | 'others',
    private readonly onChunk: (chunkBase64: string, timestamp: number, speaker: 'you' | 'others') => void,
  ) {}

  start() {
    if (this.recorder) return
    this.startWindow()
    this.timer = window.setInterval(() => this.startWindow(), 4000)
  }

  private startWindow() {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop()
    }
    this.chunks = []
    const timestamp = Date.now()
    this.recorder = new MediaRecorder(this.stream)
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'audio/webm' })
      if (blob.size === 0) return
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1]
        if (base64) this.onChunk(base64, timestamp, this.speaker)
      }
      reader.readAsDataURL(blob)
    }
    this.recorder.start()
    window.setTimeout(() => {
      if (this.recorder?.state === 'recording') this.recorder.stop()
    }, 3900)
  }

  stop() {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    if (this.recorder?.state === 'recording') {
      this.recorder.stop()
    }
    this.recorder = null
  }
}

function installMicBridge() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data as {
      source?: string
      type?: string
      requestId?: string
      platform?: string
      score?: number
      matched?: boolean
      isSpeech?: boolean
      confidence?: number
      rms?: number
      noiseFloor?: number
      error?: string
      audioBase64?: string
      samplesBuffer?: ArrayBuffer
      sampleRate?: number
      vadConfidence?: number
      timestamp?: number
    }
    if (data?.source !== 'hearly-page') return

    if (data.type === 'GET_MIC_STATE' && data.requestId) {
      chrome.storage.local.get(['hearly_filter', 'hearly_voice_runtime_profile', 'hearly_transcript'], (result: EnrollmentStorageResult) => {
        runtimeEmbeddingModel = result.hearly_voice_runtime_profile?.embeddingModel ?? 'fallback'
        window.postMessage({
          source: 'hearly-content',
          type: 'MIC_STATE',
          requestId: data.requestId,
          enabled: result.hearly_filter?.isActive === true,
          embedding:
            (result.hearly_voice_runtime_profile?.embeddingModel ?? 'fallback') === 'fallback'
              ? result.hearly_voice_runtime_profile?.embedding ?? null
              : null,
          embeddingModel: result.hearly_voice_runtime_profile?.embeddingModel ?? 'fallback',
          threshold: 0.58,
          workletUrl: chrome.runtime.getURL('hearly-processor.js'),
          transcriptionEnabled: result.hearly_transcript?.isEnabled === true,
        }, window.location.origin)
      })
      return
    }

    if (data.type === 'VOICE_WINDOW' && data.samplesBuffer) {
      if (runtimeEmbeddingModel !== 'onnx-ready') return
      if (runtimeVerificationInFlight) return
      runtimeVerificationInFlight = true
      chrome.runtime.sendMessage({
        type: 'HEARLY_VERIFY_VOICE_WINDOW',
        samples: Array.from(new Float32Array(data.samplesBuffer)),
        sampleRate: data.sampleRate ?? 48000,
        threshold: 0.58,
        vadConfidence: data.vadConfidence,
      }, (response?: { matched?: boolean; score?: number; unavailable?: boolean }) => {
        runtimeVerificationInFlight = false
        if (chrome.runtime.lastError || !response) return
        if (response.unavailable) {
          if (!onnxUnavailableNotified) {
            onnxUnavailableNotified = true
            chrome.runtime.sendMessage({
              type: 'HEARLY_MIC_PROCESSING_ERROR',
              platform: data.platform ?? PLATFORM,
              error: 'Local ONNX speaker model unavailable. Export hearly-speaker-v1.onnx and reload extension.',
            } as HearlyMessage)
          }
          return
        }
        onnxUnavailableNotified = false
        window.postMessage({
          source: 'hearly-content',
          type: 'VOICE_MATCH_DECISION',
            matched: response.matched === true,
            score: response.score ?? 0,
            vadConfidence: data.vadConfidence,
          }, window.location.origin)

          chrome.runtime.sendMessage({
            type: 'HEARLY_VOICE_MATCH',
            platform: data.platform ?? PLATFORM,
            score: response.score ?? 0,
            matched: response.matched === true,
          } as HearlyMessage)
      })
      return
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
        })
      })()
      return
    }

    const map: Record<string, HearlyMessage['type']> = {
      MIC_PROCESSING_STARTED: 'HEARLY_MIC_PROCESSING_STARTED',
      MIC_PROCESSING_STOPPED: 'HEARLY_MIC_PROCESSING_STOPPED',
      MIC_PROCESSING_ERROR: 'HEARLY_MIC_PROCESSING_ERROR',
      VOICE_MATCH: 'HEARLY_VOICE_MATCH',
      VOICE_ACTIVITY: 'HEARLY_VOICE_ACTIVITY',
    }
    const type = data.type ? map[data.type] : undefined
    if (type) {
      chrome.runtime.sendMessage({
        type,
        platform: data.platform ?? PLATFORM,
        score: data.score,
        matched: data.matched,
        isSpeech: data.isSpeech,
        confidence: data.confidence,
        rms: data.rms,
        noiseFloor: data.noiseFloor,
        error: data.error,
      } as HearlyMessage)
    }
  })
}

installMicBridge()

function detectMeeting(): boolean {
  const path = window.location.pathname
  const host = window.location.hostname
  // Covers zoom.us/wc/ and app.zoom.us/wc/
  return (host.includes('zoom.us') && path.includes('/wc/'))
}

function sendMeetingDetected() {
  chrome.runtime.sendMessage({
    type: 'MEETING_DETECTED',
    payload: { platform: 'zoom' }
  } as HearlyMessage);
}

function injectHearlyBanner(): void {
  if (document.getElementById('hearly-banner')) return

  // Check enrollment state first
  chrome.storage.local.get('hearly_enrollment', (result: EnrollmentStorageResult) => {
    const isEnrolled = result?.hearly_enrollment?.isEnrolled === true

    const banner = document.createElement('div')
    banner.id = 'hearly-banner'
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
    `

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
    `

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
      `
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
      `
    }

    document.body.appendChild(banner)

    // Enrolled: activate Hearly
    document.getElementById('hearly-activate-btn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ACTIVATE_HEARLY' })
      banner.remove()
    })

    // Not enrolled: open popup to train
    document.getElementById('hearly-train-btn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
      banner.remove()
    })

    // Dismiss
    document.getElementById('hearly-dismiss-btn')?.addEventListener('click', () => {
      banner.remove()
    })
  })
}

if (detectMeeting()) {
  sendMeetingDetected()
  injectHearlyBanner()
  console.log('Hearly: Zoom meeting detected');
} else {
  console.log('Hearly: Zoom page, no active meeting');
}

// ─── Audio Capture (Phase 2 — tabCapture via background) ──────────────────

let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let sourceNode: MediaStreamAudioSourceNode | null = null
let streamingRecorder: LocalChunkRecorder | null = null

function startTranscriptionRecorder(stream: MediaStream) {
  if (streamingRecorder) return
  console.log('[Hearly] Starting transcription recorder...')
  chrome.storage.local.get('hearly_app_settings', (settingsResult: any) => {
    const language = settingsResult.hearly_app_settings?.language ?? 'en'
    streamingRecorder = new LocalChunkRecorder(stream, 'others', (chunkBase64, timestamp) => {
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
        })
      })()
    })
    streamingRecorder.start()
  })
}

function stopTranscriptionRecorder() {
  if (streamingRecorder) {
    streamingRecorder.stop()
    streamingRecorder = null
  }
  console.log('[Hearly] Transcription recorder stopped')
}

function stopMeetingAudioCapture(): void {
  stopTranscriptionRecorder()
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null }
  if (audioContext) { audioContext.close(); audioContext = null }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
  console.log('[Hearly] Audio capture stopped on Zoom page')
  chrome.runtime.sendMessage({ type: 'HEARLY_AUDIO_STOPPED', platform: 'zoom' })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'HEARBEAT_PING') {
    sendResponse({ status: 'pong' })
    return true
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
      mediaStream = stream
      audioContext = new AudioContext({ sampleRate: 16000 })

      // Handle browser Autoplay policy
      if (audioContext.state === 'suspended') {
        const resume = () => {
          audioContext?.resume();
          window.removeEventListener('click', resume);
        };
        window.addEventListener('click', resume);
      }

      sourceNode = audioContext.createMediaStreamSource(stream)
      sourceNode.connect(audioContext.destination)
      console.log('[Hearly] Audio capture started on Zoom page (tabCapture)')
      chrome.runtime.sendMessage({ type: 'HEARLY_AUDIO_STARTED', platform: 'zoom' })

      // Check if transcription is enabled
      chrome.storage.local.get('hearly_transcript', (result: EnrollmentStorageResult) => {
        if (result.hearly_transcript?.isEnabled) {
          startTranscriptionRecorder(stream)
        }
      })
    }).catch((err) => {
      console.warn('[Hearly] Zoom tabCapture stream failed:', err)
      chrome.runtime.sendMessage({ type: 'HEARLY_AUDIO_ERROR', error: String(err) })
    })
  }

  if (message.type === 'HEARLY_STOP_AUDIO') {
    stopMeetingAudioCapture()
  }

  if (message.type === 'HEARLY_FILTER_STATE_CHANGED') {
    chrome.storage.local.get('hearly_filter', (result: EnrollmentStorageResult) => {
      window.postMessage({
        source: 'hearly-content',
        type: 'FILTER_STATE_CHANGED',
        active: result.hearly_filter?.isActive === true,
      }, window.location.origin)
    })
  }

  if (message.type === 'HEARLY_TRANSCRIPT_STATE_CHANGED') {
    chrome.storage.local.get('hearly_transcript', (result: EnrollmentStorageResult) => {
      const isEnabled = result.hearly_transcript?.isEnabled === true

      // Notify the page context
      window.postMessage({
        source: 'hearly-content',
        type: 'TRANSCRIPT_STATE_CHANGED',
        enabled: isEnabled,
      }, window.location.origin);

      if (isEnabled) {
        if (mediaStream && !streamingRecorder) {
          startTranscriptionRecorder(mediaStream)
        }
      } else {
        stopTranscriptionRecorder()
      }
    })
  }
})
