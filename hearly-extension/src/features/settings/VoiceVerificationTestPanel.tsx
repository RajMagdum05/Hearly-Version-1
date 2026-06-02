import { useEffect, useRef, useState } from 'react';
import { SPEAKER_SIMILARITY_THRESHOLD } from '@/config/constants';
import { cosineSimilarity } from '@/ai/speakerIdentity';
import { extractVoiceFingerprintFromBlob } from '@/audio/voiceFingerprint';
import { loadVoiceProfile } from '@/services/storageService';
import type { VoiceProfile } from '@/utils/types';

type VerificationResult = 'ACCEPT' | 'REJECT';
type TestMode = 'enrolled' | 'different';

type LogEntry = {
  id: string;
  message: string;
};

function formatScore(value: number | null) {
  return value === null ? '-' : value.toFixed(4);
}

function resultForScore(score: number, threshold: number): VerificationResult {
  return score >= threshold ? 'ACCEPT' : 'REJECT';
}

export function VoiceVerificationTestPanel() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [threshold, setThreshold] = useState(SPEAKER_SIMILARITY_THRESHOLD);
  const [score, setScore] = useState<number | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [testMode, setTestMode] = useState<TestMode>('enrolled');
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] ${message}`;
    console.info(`[Hearly Verification Test] ${message}`);
    setLogs((current) => [
      { id: `${Date.now()}-${Math.random()}`, message: line },
      ...current,
    ].slice(0, 12));
  };

  useEffect(() => {
    loadVoiceProfile().then((storedProfile) => {
      setProfile(storedProfile);
      if (storedProfile?.embedding) {
        addLog(`Loaded enrolled voiceprint with ${storedProfile.embedding.length} dimensions.`);
      } else {
        addLog('No enrolled voiceprint found. Train a voice profile before verification testing.');
      }
    });

    return () => {
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  const updateThreshold = (next: number) => {
    setThreshold(next);
    if (score === null) return;

    const nextResult = resultForScore(score, next);
    setResult(nextResult);
    addLog(`Threshold tuned to ${next.toFixed(2)}; ${score.toFixed(4)} ${nextResult === 'ACCEPT' ? '>=' : '<'} ${next.toFixed(2)} -> ${nextResult}.`);
  };

  const startRecording = async () => {
    if (!profile?.embedding) {
      addLog('Verification blocked: enrolled voiceprint is missing.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      addLog('Verification blocked: microphone recording is unavailable in this browser.');
      return;
    }

    setScore(null);
    setResult(null);
    setIsRecording(true);
    chunksRef.current = [];
    addLog(`Starting ${testMode === 'enrolled' ? 'enrolled-user' : 'different-person'} verification sample.`);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;

        const type = chunksRef.current[0]?.type || 'audio/webm';
        const sampleBlob = new Blob(chunksRef.current, { type });
        addLog(`Recorded verification sample: ${Math.round(sampleBlob.size / 1024)} KB.`);

        try {
          addLog('Generating verification fingerprint with the enrollment fingerprint pipeline.');
          const candidate = await extractVoiceFingerprintFromBlob(sampleBlob);
          addLog(`Generated candidate fingerprint with ${candidate.length} dimensions.`);

          const similarity = cosineSimilarity(profile.embedding, candidate);
          const decision = resultForScore(similarity, threshold);
          setScore(similarity);
          setResult(decision);

          addLog(`Cosine similarity calculated: ${similarity.toFixed(4)}.`);
          addLog(`Threshold decision: ${similarity.toFixed(4)} ${decision === 'ACCEPT' ? '>=' : '<'} ${threshold.toFixed(2)} -> ${decision}.`);
          addLog(
            testMode === 'enrolled'
              ? `Expected enrolled user to pass; observed ${decision}.`
              : `Expected different person to fail; observed ${decision}.`,
          );
        } catch (error) {
          addLog(`Fingerprint generation failed: ${error instanceof Error ? error.message : String(error)}.`);
        }
      };
      recorder.start();
      addLog('Microphone recording started. Speak for 3-5 seconds, then stop.');
    } catch (error) {
      setIsRecording(false);
      addLog(`Microphone permission or recording failed: ${error instanceof Error ? error.message : String(error)}.`);
    }
  };

  const hasProfile = Boolean(profile?.embedding);

  return (
    <section className="space-y-3" aria-labelledby="verification-test-title">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              id="verification-test-title"
              className="text-[14px] font-semibold leading-none tracking-[-0.025em] text-white"
            >
              Speaker Verification Test
            </p>
            <p className="mt-1.5 text-[11px] leading-snug tracking-[-0.01em] text-hearly-secondary">
              Compare a fresh voice sample against the enrolled voiceprint
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${
              result === 'ACCEPT'
                ? 'border-hearly-accent/25 bg-hearly-accent/[0.07] text-hearly-accent'
                : result === 'REJECT'
                  ? 'border-hearly-danger/30 bg-hearly-danger/[0.05] text-[#ff8a8a]'
                  : 'border-white/[0.08] bg-white/[0.035] text-hearly-tertiary'
            }`}
          >
            {result ?? 'Idle'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTestMode('enrolled')}
            className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
              testMode === 'enrolled'
                ? 'border-hearly-accent/35 bg-hearly-accent/[0.08] text-hearly-accent'
                : 'border-white/[0.08] bg-white/[0.025] text-hearly-secondary'
            }`}
          >
            Enrolled user
          </button>
          <button
            type="button"
            onClick={() => setTestMode('different')}
            className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
              testMode === 'different'
                ? 'border-hearly-accent/35 bg-hearly-accent/[0.08] text-hearly-accent'
                : 'border-white/[0.08] bg-white/[0.025] text-hearly-secondary'
            }`}
          >
            Different person
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
                Score
              </p>
              <p className="mt-1 text-[17px] font-semibold text-white">{formatScore(score)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
                Dimensions
              </p>
              <p className="mt-1 text-[17px] font-semibold text-white">
                {profile?.embedding?.length ?? 0}
              </p>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
              <span>Threshold</span>
              <span>{threshold.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(event) => {
                updateThreshold(Number(event.currentTarget.value));
              }}
              className="mt-2 w-full accent-hearly-accent"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={!hasProfile || isRecording}
            onClick={startRecording}
            className="flex-1 rounded-xl border border-hearly-accent/25 bg-hearly-accent/[0.06] px-3 py-2.5 text-[12px] font-semibold text-hearly-accent transition-colors hover:enabled:border-hearly-accent/45 hover:enabled:bg-hearly-accent/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Record Test
          </button>
          <button
            type="button"
            disabled={!isRecording}
            onClick={stopRecording}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:enabled:border-white/[0.16] hover:enabled:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
            Debug logs
          </p>
          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1 text-left">
            {logs.length > 0 ? (
              logs.map((entry) => (
                <p key={entry.id} className="text-[10px] leading-relaxed text-hearly-secondary">
                  {entry.message}
                </p>
              ))
            ) : (
              <p className="text-[10px] leading-relaxed text-hearly-tertiary">
                No verification logs yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
