import { initPlatform } from './shared';

const PLATFORM = 'meet';

function detectMeeting(): boolean {
  const path = window.location.pathname;
  // Google Meet room URLs follow pattern: /abc-defg-hij (3 segments with dashes)
  const meetingRoomPattern = /^\/[a-z]+-[a-z]+-[a-z]+$/;
  return meetingRoomPattern.test(path);
}

function getObserveTarget(): HTMLElement | null {
  return (document.querySelector('title') || document.documentElement) as HTMLElement | null;
}

initPlatform(PLATFORM, detectMeeting, getObserveTarget);
