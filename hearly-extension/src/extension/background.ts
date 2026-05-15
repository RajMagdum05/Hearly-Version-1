import type { HearlyMessage } from './messages';

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({
    hearlyInstalledAt: Date.now(),
  });
});

chrome.runtime.onMessage.addListener(
  (raw: unknown, _sender, sendResponse: (r: unknown) => void) => {
    const message = raw as HearlyMessage;
    try {
      if (message.type === 'REQUEST_STATUS') {
        void chrome.storage.local
          .get(['hearlyActive', 'voiceEnrolled'])
          .then((stored) => {
            const reply: HearlyMessage = {
              type: 'STATUS_RESPONSE',
              payload: {
                active: Boolean(stored.hearlyActive),
                enrolled: Boolean(stored.voiceEnrolled),
              },
            };
            sendResponse(reply);
          });
        return true;
      }
    } catch {
      sendResponse(undefined);
    }
    return undefined;
  },
);
