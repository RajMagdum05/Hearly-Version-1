export type CloudVoiceEnrollmentResult = {
  profileId: string;
  embedding?: number[];
};

export type CloudVoiceVerificationResult = {
  matched: boolean;
  score: number;
};

export type CloudTranscriptionResult = {
  text: string;
  language?: string;
  speaker?: 'you' | 'others';
};

const API_BASE_URL = import.meta.env.VITE_HEARLY_API_BASE_URL as string | undefined;

export function isCloudConfigured(): boolean {
  return Boolean(API_BASE_URL?.trim());
}

function getApiBaseUrl(): string {
  const base = API_BASE_URL?.trim();
  if (!base) {
    throw new Error('Hearly cloud API is not configured.');
  }
  return base.replace(/\/$/, '');
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;
  const text = await response.text().catch(() => '');
  throw new Error(text || `Hearly cloud request failed with ${response.status}`);
}

export async function enrollVoiceInCloud({
  userName,
  phraseAudio,
  localEmbedding,
}: {
  userName: string;
  phraseAudio: readonly Blob[];
  localEmbedding: Float32Array;
}): Promise<CloudVoiceEnrollmentResult | null> {
  if (!isCloudConfigured()) return null;

  const form = new FormData();
  form.set('userName', userName);
  form.set('localEmbedding', JSON.stringify(Array.from(localEmbedding)));
  phraseAudio.forEach((blob, index) => {
    form.append('phrases', blob, `phrase-${index + 1}.webm`);
  });

  const response = await fetch(`${getApiBaseUrl()}/api/voice/enroll`, {
    method: 'POST',
    body: form,
  });
  await assertOk(response);
  return response.json() as Promise<CloudVoiceEnrollmentResult>;
}

export async function verifyVoiceInCloud({
  profileId,
  audio,
}: {
  profileId: string;
  audio: Blob;
}): Promise<CloudVoiceVerificationResult | null> {
  if (!isCloudConfigured()) return null;

  const form = new FormData();
  form.set('profileId', profileId);
  form.set('audio', audio, 'sample.webm');

  const response = await fetch(`${getApiBaseUrl()}/api/voice/verify`, {
    method: 'POST',
    body: form,
  });
  await assertOk(response);
  return response.json() as Promise<CloudVoiceVerificationResult>;
}

export async function transcribeAudioInCloud({
  audio,
  language,
}: {
  audio: Blob;
  language?: string;
}): Promise<CloudTranscriptionResult | null> {
  if (!isCloudConfigured()) return null;

  const form = new FormData();
  form.set('audio', audio, 'audio.webm');
  if (language) form.set('language', language);

  const response = await fetch(`${getApiBaseUrl()}/api/transcribe`, {
    method: 'POST',
    body: form,
  });
  await assertOk(response);
  return response.json() as Promise<CloudTranscriptionResult>;
}
