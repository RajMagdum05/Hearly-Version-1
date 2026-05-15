/**
 * Whisper STT worker entry — instantiated from background/worker bundle (Phase F).
 */
export type WhisperWorkerRequest = {
  audio: Float32Array;
  language: 'en' | 'hi' | 'mr';
};

export type WhisperWorkerResponse = { text: string; confidence: number };
