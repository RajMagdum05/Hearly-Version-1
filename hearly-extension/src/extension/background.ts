import { HearlyMessage, MeetingStatus, Platform } from './messages';

let meetingStatus: MeetingStatus = {
  isInMeeting: false,
  platform: 'unknown',
  isActive: false
};

function handleInstalled() {
  console.log('Hearly background ready');
}

function handleMessage(message: HearlyMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
  if (message.type === 'MEETING_DETECTED') {
    meetingStatus.isInMeeting = true;
    meetingStatus.platform = message.payload?.platform as Platform;
    console.log('Meeting detected:', meetingStatus.platform);
  }
  
  if (message.type === 'MEETING_ENDED') {
    meetingStatus = { isInMeeting: false, platform: 'unknown', isActive: false };
  }
  
  if (message.type === 'HEARLY_TOGGLE') {
    meetingStatus.isActive = !meetingStatus.isActive;
    console.log('Hearly isActive:', meetingStatus.isActive);
  }
  
  if (message.type === 'GET_STATUS') {
    sendResponse(meetingStatus);
    return true;
  }

  if (message.type === 'ACTIVATE_HEARLY') {
    meetingStatus.isActive = true
    console.log('Hearly activated from meeting page')
    chrome.action.openPopup().catch(() => {
      // openPopup may fail if not triggered by user gesture in some Chrome versions
      console.log('Hearly: popup open attempted')
    })
  }

  if (message.type === 'OPEN_POPUP') {
    chrome.action.openPopup().catch(() => {
      console.log('Hearly: could not open popup automatically')
    })
  }

  if (message.type === 'REQUEST_MIC_PERMISSION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => {
                stream.getTracks().forEach(t => t.stop())
                chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' })
              })
              .catch(() => {
                chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_DENIED' })
              })
          }
        })
      }
    })
  }

  if (message.type === 'POPUP_TOGGLE_AUDIO_ON') {
    // streamId and tabId are now provided directly by the popup
    // (tabCapture must be called from popup — user gesture context)
    const streamId = (message as any).streamId
    const tabId = (message as any).tabId

    if (!streamId || !tabId) {
      console.warn('[Hearly] POPUP_TOGGLE_AUDIO_ON missing streamId or tabId')
      return
    }

    console.log('[Hearly] Forwarding streamId to content script on tab:', tabId)

    chrome.tabs.sendMessage(tabId, {
      type: 'HEARLY_START_AUDIO',
      streamId
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[Hearly] Could not reach content script:', chrome.runtime.lastError.message)
      } else {
        console.log('[Hearly] streamId delivered to content script successfully')
      }
    })
  }

  if (message.type === 'POPUP_TOGGLE_AUDIO_OFF') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'HEARLY_STOP_AUDIO' })
      }
    })
  }
}

function handleTabRemoved() {
  meetingStatus = { isInMeeting: false, platform: 'unknown', isActive: false };
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
