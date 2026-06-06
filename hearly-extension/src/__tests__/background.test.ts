import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';

// 1. Mock internal imports used by background.ts to avoid executing heavy models/services
vi.mock('@/ai/localSpeakerModel', () => ({
  compareSpeakerEmbeddings: vi.fn(),
  embedPcmWindowWithOnnx: vi.fn(),
}));

vi.mock('@/ai/localSttModel', () => ({
  transcribePcmWithOnnx: vi.fn(() => Promise.resolve({ unavailable: true, text: '' })),
}));

vi.mock('@/services/storageService', () => ({
  loadTranscriptEntries: vi.fn(() => Promise.resolve([])),
  saveTranscriptEntries: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/services/cloudService', () => ({
  isCloudConfigured: vi.fn(() => false),
  transcribeAudioInCloud: vi.fn(),
}));

// 2. Setup Chrome global mocks
let messageListener: any = null;
const chromeMock = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: {
      addListener: (fn: any) => {
        messageListener = fn;
      }
    },
    sendMessage: vi.fn(),
  },
  tabs: {
    onRemoved: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    query: vi.fn(),
  },
  action: {
    openPopup: vi.fn(() => Promise.resolve()),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    }
  }
};

globalThis.chrome = chromeMock as any;

// 3. Import the background script so it runs and registers its listeners
beforeAll(async () => {
  await import('../extension/background');
});

describe('Background Script Message Routing', () => {
  beforeEach(() => {
    (chrome.runtime.sendMessage as any).mockClear();
    (chrome.tabs.sendMessage as any).mockClear();
    // Reset status to meeting-ended state first by sending a MEETING_ENDED message
    if (messageListener) {
      messageListener({ type: 'MEETING_ENDED' }, {}, () => {});
    }
  });

  it('should register listeners on load', () => {
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(messageListener).toBeDefined();
  });

  it('should update status on MEETING_DETECTED', async () => {
    // Send meeting detected message
    messageListener({ type: 'MEETING_DETECTED', payload: { platform: 'meet' } }, {}, () => {});

    // Request status
    let responseStatus: any = null;
    messageListener({ type: 'GET_STATUS' }, {}, (status: any) => {
      responseStatus = status;
    });

    expect(responseStatus).toEqual({
      isInMeeting: true,
      platform: 'meet',
      isActive: false,
    });
  });

  it('should reset status on MEETING_ENDED', async () => {
    // Detect first
    messageListener({ type: 'MEETING_DETECTED', payload: { platform: 'zoom' } }, {}, () => {});
    
    // End meeting
    messageListener({ type: 'MEETING_ENDED' }, {}, () => {});

    // Request status
    let responseStatus: any = null;
    messageListener({ type: 'GET_STATUS' }, {}, (status: any) => {
      responseStatus = status;
    });

    expect(responseStatus).toEqual({
      isInMeeting: false,
      platform: 'unknown',
      isActive: false,
    });
  });

  it('should toggle meeting activity on HEARLY_TOGGLE', async () => {
    // Trigger toggle twice
    messageListener({ type: 'HEARLY_TOGGLE' }, {}, () => {});

    let responseStatus: any = null;
    messageListener({ type: 'GET_STATUS' }, {}, (status: any) => {
      responseStatus = status;
    });
    expect(responseStatus.isActive).toBe(true);

    messageListener({ type: 'HEARLY_TOGGLE' }, {}, () => {});
    messageListener({ type: 'GET_STATUS' }, {}, (status: any) => {
      responseStatus = status;
    });
    expect(responseStatus.isActive).toBe(false);
  });
});
