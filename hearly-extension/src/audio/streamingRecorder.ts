// streamingRecorder.ts
// Continuous overlapping audio chunk recording with integrated AdaptiveVAD

import { AdaptiveVAD } from './vad';

export class StreamingRecorder {
  private mediaRecorder1: MediaRecorder | null = null;
  private mediaRecorder2: MediaRecorder | null = null;
  private stream: MediaStream;
  private chunkDurationMs = 4000; // 4s chunks
  private overlapMs = 2000;       // 2s overlap
  
  private intervalId: any = null;
  private timeoutIds: any[] = [];
  
  private onAudioChunkReady: (chunkBase64: string, timestamp: number, speaker: 'you' | 'others') => void;
  private speaker: 'you' | 'others';
  
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private vad: AdaptiveVAD;
  private hasSpeechInCurrentWindow = false;

  constructor(
    stream: MediaStream,
    speaker: 'you' | 'others',
    callback: (chunk: string, ts: number, spk: 'you' | 'others') => void
  ) {
    this.stream = stream;
    this.speaker = speaker;
    this.onAudioChunkReady = callback;
    this.vad = new AdaptiveVAD();
  }

  public start() {
    this.startVADAnalysis();
    
    const recordBuffer = (recorderIndex: 1 | 2) => {
      let chunks: Blob[] = [];
      const startTime = Date.now();
      
      const recorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(this.stream, recorderOptions);
      } catch (e) {
        recorder = new MediaRecorder(this.stream);
      }

      if (recorderIndex === 1) {
        this.mediaRecorder1 = recorder;
      } else {
        this.mediaRecorder2 = recorder;
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (this.hasSpeechInCurrentWindow) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            if (base64) {
              this.onAudioChunkReady(base64, startTime, this.speaker);
            }
          };
          reader.readAsDataURL(audioBlob);
        }
        
        // Reset speech tracker for the next window
        this.hasSpeechInCurrentWindow = false;
        chunks = [];
      };

      recorder.start();

      const timeoutId = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, this.chunkDurationMs);
      
      this.timeoutIds.push(timeoutId);
    };

    // Start recorder 1 at t=0
    recordBuffer(1);

    // Schedule recorder 2 at t=2
    const initialTimeout = setTimeout(() => {
      recordBuffer(2);
    }, this.chunkDurationMs - this.overlapMs);

    this.timeoutIds.push(initialTimeout);

    // Schedule subsequent runs
    this.intervalId = setInterval(() => {
      recordBuffer(1);
      const subTimeout = setTimeout(() => {
        recordBuffer(2);
      }, this.chunkDurationMs - this.overlapMs);
      this.timeoutIds.push(subTimeout);
    }, (this.chunkDurationMs - this.overlapMs) * 2);
  }

  private startVADAnalysis() {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const { isSpeech } = this.vad.process(input);
        if (isSpeech) {
          this.hasSpeechInCurrentWindow = true;
        }
      };

      source.connect(this.analyser);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('[Hearly VAD] VAD setup failed, falling back to full capture:', err);
      this.hasSpeechInCurrentWindow = true;
    }
  }

  public stop() {
    const intId = this.intervalId;
    if (intId) {
      clearInterval(intId);
      this.intervalId = null;
    }
    
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];

    if (this.mediaRecorder1 && this.mediaRecorder1.state !== 'inactive') {
      try { this.mediaRecorder1.stop(); } catch {}
      this.mediaRecorder1 = null;
    }

    if (this.mediaRecorder2 && this.mediaRecorder2.state !== 'inactive') {
      try { this.mediaRecorder2.stop(); } catch {}
      this.mediaRecorder2 = null;
    }

    const proc = this.scriptProcessor;
    if (proc) {
      proc.disconnect();
      this.scriptProcessor = null;
    }
    const ana = this.analyser;
    if (ana) {
      ana.disconnect();
      this.analyser = null;
    }
    const ctx = this.audioContext;
    if (ctx) {
      void ctx.close();
      this.audioContext = null;
    }
  }
}
