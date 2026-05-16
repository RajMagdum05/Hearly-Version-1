import { HearlyMessage } from './messages';

const message: HearlyMessage = {
  type: 'MEETING_DETECTED',
  payload: { platform: 'zoom' }
};

chrome.runtime.sendMessage(message);
console.log('Hearly: Zoom detected');
