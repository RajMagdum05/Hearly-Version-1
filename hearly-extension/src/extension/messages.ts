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
  | 'MIC_PERMISSION_GRANTED'
  | 'MIC_PERMISSION_DENIED'
  | 'REQUEST_MIC_PERMISSION'

export interface HearlyMessage {
  type: MessageType
  payload?: Record<string, unknown>
  streamId?: string
  platform?: string
  error?: string
}

export type Platform = 'meet' | 'zoom' | 'teams' | 'unknown'

export interface MeetingStatus {
  isInMeeting: boolean
  platform: Platform
  isActive: boolean
}
