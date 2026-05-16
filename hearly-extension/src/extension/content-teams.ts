import { HearlyMessage } from './messages';

const message: HearlyMessage = {
  type: 'MEETING_DETECTED',
  payload: { platform: 'teams' }
};

chrome.runtime.sendMessage(message);
console.log('Hearly: Microsoft Teams detected');
