import { initPlatform, injectHearlyBanner } from './shared';

const PLATFORM = 'teams';

function isTeamsDomain(): boolean {
  const url = window.location.href;
  return url.includes('teams.microsoft.com') || url.includes('teams.live.com');
}

function detectMeeting(): boolean {
  const indicators = [
    '[data-tid="calling-screen"]',
    '[data-tid="meeting-composite"]',
    '[data-tid="prejoin-screen"]',
    '.ts-calling-screen',
    '[class*="calling"]',
    '[class*="meeting"]',
  ];
  return indicators.some(selector => !!document.querySelector(selector));
}

function getObserveTarget(): HTMLElement | null {
  return document.body;
}

if (isTeamsDomain()) {
  console.log('[Hearly] Teams domain detected — watching for meeting...');
  initPlatform(PLATFORM, detectMeeting, getObserveTarget);

  // Watch URL changes for Teams SPA routing
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[Hearly] Teams URL changed:', lastUrl);
      injectHearlyBanner();
    }
  }, 1000);
}
