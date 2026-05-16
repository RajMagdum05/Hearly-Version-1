import { HearlyMessage } from './messages';

const message: HearlyMessage = {
  type: 'MEETING_DETECTED',
  payload: { platform: 'meet' }
};

chrome.runtime.sendMessage(message);
console.log('Hearly: Google Meet detected');
