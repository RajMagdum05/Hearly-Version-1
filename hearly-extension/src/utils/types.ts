export interface VoiceProfile {
  id: string;
  userName: string;
  email?: string;
  embedding: Float32Array;
  enrolledAt: number;
  isActive: boolean;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'you' | 'others';
  text: string;
  language: 'en' | 'hi' | 'mr';
  category?: string;
  timestamp: number;
  sessionId: string;
}

export type AppLanguage = 'en' | 'hi' | 'mr';

export type EnrollmentPhase = 'intro' | 'record' | 'done';

export interface AppSettings {
  language: AppLanguage;
  notifyNewVersions: boolean;
  notifyEmails: boolean;
  hearlyActive: boolean;
  transcriptEnabled: boolean;
}
