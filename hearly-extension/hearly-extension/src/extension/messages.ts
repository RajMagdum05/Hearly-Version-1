export type MessageType =
  | 'HEARLY_TOGGLE'
  | 'MEETING_DETECTED'
  | 'MEETING_ENDED'
  | 'GET_STATUS'
  | 'STATUS_RESPONSE'
  | 'OPEN_POPUP'
  | 'ACTIVATE_HEARLY'
  | 'POPUP_TOGGLE_AUDIO_ON'
  | 'POPUP_TOGGLE_AUDIO_OFF'
  | 'HEARLY_START_AUDIO'
  | 'HEARLY_STOP_AUDIO'
  | 'HEARLY_AUDIO_STARTED'
  | 'HEARLY_AUDIO_STOPPED'
  | 'HEARLY_AUDIO_ERROR'
  | 'HEARLY_VOICE_MATCH'
  | 'HEARLY_VOICE_ACTIVITY'
  | 'HEARLY_MIC_PROCESSING_STARTED'
  | 'HEARLY_MIC_PROCESSING_STOPPED'
  | 'HEARLY_MIC_PROCESSING_ERROR'
  | 'MIC_PERMISSION_GRANTED'
  | 'MIC_PERMISSION_DENIED'
  | 'REQUEST_MIC_PERMISSION'
  | 'HEARLY_TRANSCRIBE_CHUNK'
  | 'HEARLY_VERIFY_VOICE_WINDOW'
  | 'HEARLY_MODEL_UNAVAILABLE'
  | 'HEARLY_NEW_TRANSCRIPT_ENTRY'
  | 'HEARLY_TRANSCRIPT_STATE_CHANGED'

export interface HearlyMessage {
  type: MessageType
  payload?: Record<string, unknown>
  streamId?: string
  platform?: string
  error?: string
  score?: number
  matched?: boolean
  isSpeech?: boolean
  confidence?: number
  rms?: number
  noiseFloor?: number
  samples?: number[]
  sampleRate?: number
  threshold?: number
  vadConfidence?: number
  unavailable?: boolean
}

export type Platform = 'meet' | 'zoom' | 'teams' | 'unknown'

export interface MeetingStatus {
  isInMeeting: boolean
  platform: Platform
  isActive: boolean
}
