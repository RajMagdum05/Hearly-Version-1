import { initPlatform } from './shared';

const PLATFORM = 'zoom';

function detectMeeting(): boolean {
  const path = window.location.pathname;
  const host = window.location.hostname;
  // Covers zoom.us/wc/ and app.zoom.us/wc/
  return host.includes('zoom.us') && path.includes('/wc/');
}

function getObserveTarget(): HTMLElement | null {
  return document.body;
}

initPlatform(PLATFORM, detectMeeting, getObserveTarget);
