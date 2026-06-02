import { useEffect, useMemo, useRef, useState } from 'react';
import { embedEnrollmentAudio, type SpeakerModelStatus } from '@/ai/localSpeakerModel';
import { IconCheck, IconMic } from '@/ui/shared/icons';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onaudiostart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface Phase2_RecordProps {
  displayName: string;
  isRecording: boolean;
  hasRecording: boolean;
  onToggleRecord: () => void;
  onTrainingComplete: (
    embedding: Float32Array,
    phraseAudio: Blob[],
    modelStatus: SpeakerModelStatus,
  ) => void;
}

const WAVE_HEIGHTS = [14, 18, 13, 22, 16, 28, 18, 34, 20, 30, 17, 26, 15, 22, 13, 18] as const;

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function isSpokenWordMatch(spokenWord: string, target: string) {
  if (spokenWord === target) {
    return true;
  }

  if (target === 'hey') {
    return spokenWord === 'hay' || spokenWord === 'hei';
  }

  if (target === 'hearly') {
    return (
      spokenWord === 'early' ||
      spokenWord.includes('earl') ||
      spokenWord.includes('harl') ||
      spokenWord.endsWith('ly')
    );
  }

  if (target.length >= 4 && spokenWord.length >= 4) {
    return (
      target.includes(spokenWord) ||
      spokenWord.includes(target) ||
      target.slice(0, 3) === spokenWord.slice(0, 3)
    );
  }

  return false;
}

function countSequentialMatches(
  targetWords: readonly string[],
  spokenWords: readonly string[],
  startIndex: number,
) {
  let matched = startIndex;

  for (const spokenWord of spokenWords) {
    if (matched >= targetWords.length) break;

    const target = targetWords[matched];
    if (isSpokenWordMatch(spokenWord, target)) {
      matched += 1;
      continue;
    }

    if (matched > startIndex) {
      break;
    }
  }

  return matched;
}

function getMatchedWordCount(
  targetWords: readonly string[],
  spokenText: string,
  currentMatched: number,
) {
  const spokenWords = normalizeWords(spokenText);
  const fromBeginning = countSequentialMatches(targetWords, spokenWords, 0);
  const fromCurrentWord = countSequentialMatches(
    targetWords,
    spokenWords,
    currentMatched,
  );

  return Math.max(currentMatched, fromBeginning, fromCurrentWord);
}

function stopRecognition(recognition: SpeechRecognitionLike) {
  try {
    recognition.stop();
  } catch {
    // Chrome can throw if recognition has already ended.
  }
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function buildPhrases(displayName: string) {
  const name = displayName.trim() || 'your name';

  return [
    `Hey Hearly, this is ${name}. I am training my voice profile.`,
    'Hearly should recognize my voice clearly in quiet and noisy moments.',
    'My voice profile helps Hearly focus on me during every listening session.',
  ];
}

function RecordingWaveform({
  active,
  complete,
}: {
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className="flex h-[52px] items-center justify-center gap-[6px] rounded-2xl border border-white/[0.06] bg-black/30 px-4"
      aria-hidden
    >
      {WAVE_HEIGHTS.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-[2.5px] origin-center rounded-full transition-[background-color,opacity,transform] duration-500 ${
            active
              ? 'animate-wave-bar-flow bg-hearly-accent opacity-95'
              : complete
                ? 'bg-hearly-accent/60 opacity-80'
                : 'animate-wave-idle-calm bg-white/20 opacity-60'
          }`}
          style={{
            height,
            animationDelay: `${index * 82}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function Phase2_Record({
  displayName,
  isRecording,
  hasRecording,
  onToggleRecord,
  onTrainingComplete,
}: Phase2_RecordProps) {
  const phrases = useMemo(() => buildPhrases(displayName), [displayName]);
  const phraseWords = useMemo(
    () => phrases.map((phrase) => phrase.split(' ')),
    [phrases],
  );
  const totalWords = useMemo(
    () => phraseWords.reduce((total, words) => total + words.length, 0),
    [phraseWords],
  );
  const normalizedPhraseWords = useMemo(
    () => phrases.map((phrase) => normalizeWords(phrase)),
    [phrases],
  );
  const [activePhrase, setActivePhrase] = useState(0);
  const [activeWord, setActiveWord] = useState(0);
  const [phraseReadyNext, setPhraseReadyNext] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isProcessingPhrase, setIsProcessingPhrase] = useState(false);
  const completeNotifiedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const phraseAudioRef = useRef<Blob[]>([]);
  const activeWordRef = useRef(0);

  const completedWordsBeforeActive = phraseWords
    .slice(0, activePhrase)
    .reduce((total, words) => total + words.length, 0);
  const trainedWords = hasRecording
    ? totalWords
    : completedWordsBeforeActive + activeWord;
  const progress = Math.min(100, Math.round((trainedWords / totalWords) * 100));
  const status = hasRecording
    ? 'All phrases captured'
    : isProcessingPhrase
      ? 'Building voice print'
    : isRecording
      ? 'Listening to your voice'
      : phraseReadyNext
        ? 'Phrase captured'
        : !speechSupported
          ? 'Speech recognition unavailable'
      : 'Ready to record';
  const activePhraseComplete =
    hasRecording || activeWord >= phraseWords[activePhrase].length;
  const isFinalPhrase = activePhrase === phrases.length - 1;

  useEffect(() => {
    if (isRecording && !hasRecording) {
      if (!phraseReadyNext) {
        setActiveWord(0);
        activeWordRef.current = 0;
      }
      setRecordingError(null);
      completeNotifiedRef.current = false;
    }
  }, [isRecording, hasRecording, phraseReadyNext]);

  useEffect(() => {
    if (!isRecording || hasRecording || phraseReadyNext) {
      return;
    }

    let cancelled = false;

    async function startCapture() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setRecordingError('Microphone recording is not available in this browser.');
        onToggleRecord();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (cancelled) {
          stopTracks(stream);
          return;
        }

        audioChunksRef.current = [];
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.start();
      } catch {
        setRecordingError('Microphone permission is needed to train your voice.');
        onToggleRecord();
      }
    }

    void startCapture();

    return () => {
      cancelled = true;
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === 'recording') {
        recorder.stop();
      }
      stopTracks(mediaStreamRef.current);
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
    };
  }, [hasRecording, isRecording, onToggleRecord, phraseReadyNext]);

  const finishPhraseCapture = async () => {
    const recorder = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return null;
    }

    setIsProcessingPhrase(true);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const type = audioChunksRef.current[0]?.type || 'audio/webm';
        resolve(new Blob(audioChunksRef.current, { type }));
      };
      recorder.stop();
    });

    stopTracks(stream);
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;

    try {
      phraseAudioRef.current.push(blob);
      return blob;
    } catch {
      setRecordingError('Could not read that voice sample. Please try again.');
      return null;
    } finally {
      setIsProcessingPhrase(false);
    }
  };

  const completePhrase = async () => {
    const phraseBlob = await finishPhraseCapture();
    if (!phraseBlob) {
      onToggleRecord();
      return;
    }

    if (isFinalPhrase && !completeNotifiedRef.current) {
      completeNotifiedRef.current = true;
      const { embedding, modelStatus } = await embedEnrollmentAudio(phraseAudioRef.current);
      onTrainingComplete(
        embedding,
        [...phraseAudioRef.current],
        modelStatus,
      );
      return;
    }

    onToggleRecord();
  };

  useEffect(() => {
    if (!isRecording || hasRecording || phraseReadyNext) {
      return;
    }

    if (!speechSupported) {
      return;
    }

    const RecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      setSpeechSupported(false);
      setRecordingError('Chrome speech recognition is needed for phrase-by-phrase training.');
      onToggleRecord();
      return;
    }

    const Recognition = RecognitionConstructor;
    let cancelled = false;
    setSpeechSupported(true);

    async function startRecognition() {
      if (cancelled) {
        return;
      }

      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onaudiostart = () => {
        setSpeechSupported(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';

        for (let i = 0; i < event.results.length; i += 1) {
          transcript += ` ${event.results[i][0].transcript}`;
        }

        const targetWords = normalizedPhraseWords[activePhrase];
        const matchedWords = getMatchedWordCount(
          targetWords,
          transcript,
          activeWordRef.current,
        );
        const nextMatchedWords = Math.min(
          matchedWords,
          phraseWords[activePhrase].length,
        );

        activeWordRef.current = nextMatchedWords;
        setActiveWord(nextMatchedWords);

        if (nextMatchedWords >= targetWords.length) {
          setPhraseReadyNext(true);
          stopRecognition(recognition);

          void completePhrase();
        }
      };

      recognition.onerror = (event) => {
        setSpeechSupported(false);
        setRecordingError(
          event?.error === 'not-allowed'
            ? 'Speech recognition permission is needed to train your voice.'
            : 'Speech recognition could not hear the phrase. Please try again.',
        );
        stopRecognition(recognition);
        onToggleRecord();
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setSpeechSupported(false);
      }
    }

    void startRecognition();

    return () => {
      cancelled = true;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onaudiostart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        stopRecognition(recognition);
      }
      recognitionRef.current = null;
    };
  }, [
    activePhrase,
    hasRecording,
    isFinalPhrase,
    isRecording,
    normalizedPhraseWords,
    onToggleRecord,
    onTrainingComplete,
    phraseReadyNext,
    phraseWords,
    speechSupported,
  ]);

  useEffect(() => {
    if (hasRecording) {
      setActivePhrase(phrases.length - 1);
      setActiveWord(phraseWords[phrases.length - 1].length);
      setPhraseReadyNext(false);
    }
  }, [hasRecording, phraseWords, phrases.length]);

  const handlePrimaryRecordAction = () => {
    setSpeechSupported(true);

    if (hasRecording) {
      setActivePhrase(0);
      setActiveWord(0);
      activeWordRef.current = 0;
      setPhraseReadyNext(false);
      phraseAudioRef.current = [];
    }

    onToggleRecord();
  };

  const handleNextPhrase = () => {
    setSpeechSupported(true);
    setActivePhrase((phraseIndex) => Math.min(phraseIndex + 1, phrases.length - 1));
    setActiveWord(0);
    activeWordRef.current = 0;
    setPhraseReadyNext(false);
    onToggleRecord();
  };

  return (
    <div className="space-y-5 text-center">
      <section
        className={`rounded-3xl border bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[border-color,box-shadow,background-color] duration-500 ${
          isRecording
            ? 'border-hearly-accent/35 bg-hearly-accent/[0.035] shadow-[0_0_34px_rgba(181,240,61,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'border-white/[0.07]'
        }`}
      >
        <div className="flex items-center justify-between text-left">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-hearly-tertiary">
              Recording state
            </p>
            <p className="mt-1 text-[14px] font-semibold text-white">{status}</p>
          </div>
          <span
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              isRecording
                ? 'bg-hearly-accent shadow-[0_0_12px_rgba(181,240,61,0.55)]'
                : hasRecording
                  ? 'bg-hearly-accent/70'
                  : 'bg-white/20'
            }`}
            aria-hidden
          />
        </div>

        <div className="mt-4">
          <RecordingWaveform active={isRecording} complete={hasRecording} />
        </div>

        {recordingError ? (
          <div className="mt-3 text-left">
            <p className="text-[11px] font-medium leading-relaxed text-hearly-danger">
              {recordingError}
            </p>
            {recordingError.toLowerCase().includes('permission') && (
              <button
                type="button"
                onClick={() => {
                  if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
                  } else {
                    window.open(window.location.href, '_blank');
                  }
                }}
                className="mt-2 text-[11px] font-semibold text-hearly-accent hover:underline"
              >
                Open in a new tab to grant permissions
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/25 px-3.5 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-hearly-tertiary">
              Phrase {activePhrase + 1} of {phrases.length}
            </p>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-300 ${
                activePhraseComplete
                  ? 'border-hearly-accent/35 bg-hearly-accent/[0.09] text-hearly-accent'
                  : 'border-white/[0.08] bg-white/[0.03] text-transparent'
              }`}
              aria-hidden
            >
              <IconCheck width={11} height={11} strokeWidth={2.4} />
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-hearly-secondary">
            {phraseWords[activePhrase].map((word, index) => {
              const isTrained = hasRecording || index < activeWord;
              const isCurrent = isRecording && !hasRecording && index === activeWord;

              return (
                <span
                  key={`${word}-${index}`}
                  className={`transition-colors duration-300 ${
                    isTrained
                      ? 'font-medium text-hearly-accent'
                      : isCurrent
                        ? 'text-white'
                        : 'text-hearly-secondary'
                  }`}
                >
                  {word}
                  {index < phraseWords[activePhrase].length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
            {phrases.map((phrase, index) => (
              <div
                key={phrase}
                className={`h-1 rounded-full transition-colors duration-300 ${
                  hasRecording || index < activePhrase || (index === activePhrase && activePhraseComplete)
                    ? 'bg-hearly-accent'
                    : index === activePhrase
                      ? 'bg-hearly-accent/35'
                      : 'bg-white/[0.08]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-hearly-accent transition-[width] duration-700 ease-out shadow-[0_0_12px_rgba(181,240,61,0.28)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {phraseReadyNext && !hasRecording && !isFinalPhrase ? (
        <button
          type="button"
          onClick={handleNextPhrase}
          className="mx-auto flex h-[46px] min-w-[150px] items-center justify-center rounded-full border border-hearly-accent/30 bg-hearly-accent/[0.08] px-5 text-[12px] font-semibold text-hearly-accent shadow-[0_0_24px_rgba(181,240,61,0.12),inset_0_1px_0_rgba(255,255,255,0.055)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:border-hearly-accent/50 hover:bg-hearly-accent/[0.12] hover:text-white active:scale-[0.98]"
        >
          Next Phrase
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePrimaryRecordAction}
          disabled={isProcessingPhrase}
          className={`mx-auto flex h-[66px] w-[66px] items-center justify-center rounded-full border transition-[border-color,background-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.98] ${
            isRecording
              ? 'border-hearly-accent/60 bg-hearly-accent/[0.08] text-white shadow-[0_0_30px_rgba(181,240,61,0.16)]'
              : 'border-white/[0.1] bg-white/[0.035] text-hearly-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-hearly-accent/40 hover:bg-hearly-accent/[0.06]'
          }`}
          aria-pressed={isRecording}
        >
          <IconMic width={27} height={27} strokeWidth={1.8} aria-hidden />
        </button>
      )}
      <p className="text-[12px] font-medium text-hearly-secondary">
        {isProcessingPhrase
          ? 'Saving this phrase to your voice profile'
          : isRecording
          ? speechSupported
            ? 'Read the highlighted phrase aloud'
            : 'Speech recognition is unavailable'
          : hasRecording
            ? 'Retake phrases'
            : phraseReadyNext
              ? 'Phrase complete. Continue when ready.'
              : 'Tap to start voice training'}
      </p>
    </div>
  );
}
