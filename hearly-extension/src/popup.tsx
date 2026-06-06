import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/popup.css';
import { useEnrollmentStore } from '@/store/enrollmentStore';
import { useSettings } from '@/hooks/useSettings';
import { HistoryTab } from '@/features/history/HistoryTab';
import { SettingsTab } from '@/features/settings/SettingsTab';
import { EnrollmentFlow } from '@/features/enrollment/EnrollmentFlow';
import { EnrolledHomePanel } from '@/features/home/EnrolledHomePanel';
import { HearlyToggle } from '@/features/home/HearlyToggle';
import { TranscriptToggle } from '@/features/home/TranscriptToggle';
import { UnenrolledHero } from '@/features/home/UnenrolledHero';
import { PopupLayout } from '@/ui/layouts/PopupLayout';
import type { PopupTabId } from '@/ui/navigation/popupTabId';
import { useFilterStore } from '@/store/filterStore';
import { useTranscriptStore } from '@/store/transcriptStore';
import { RoadmapModal } from '@/features/home/RoadmapModal';
import { loadEnrollmentState, loadFilterState, loadTranscriptState, loadVoiceProfile, clearEnrollmentState, saveEnrollmentState, saveFilterState, saveTranscriptState, saveVoiceProfile, loadTranscriptEntries } from '@/services/storageService';

type AudioStatus = {
  capturing: boolean;
  platform: string | null;
  error: string | null;
  voiceScore: number | null;
  voiceMatched: boolean | null;
  speechActive: boolean | null;
  speechConfidence: number | null;
};

function safeRuntimeMessage(message: Record<string, unknown>) {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError;
  });
}

function safeTabMessage(tabId: number, message: Record<string, unknown>) {
  if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) return;
  chrome.tabs.sendMessage(tabId, message, () => {
    void chrome.runtime.lastError;
  });
}

function PopupApp() {
  const [tab, setTab] = useState<PopupTabId>('home');
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    capturing: false,
    platform: null,
    error: null,
    voiceScore: null,
    voiceMatched: null,
    speechActive: null,
    speechConfidence: null,
  });

  const isEnrolled = useEnrollmentStore((s) => s.isEnrolled);
  const userName = useEnrollmentStore((s) => s.userName);
  const enrollmentActions = useEnrollmentStore((s) => s.actions);

  const filterActive = useFilterStore((s) => s.isActive);
  const filterActions = useFilterStore((s) => s.actions);

  const transcriptEnabled = useTranscriptStore((s) => s.isEnabled);
  const transcriptActions = useTranscriptStore((s) => s.actions);
  const entries = useTranscriptStore((s) => s.entries);
  const latestEntry = entries.at(-1);

  const { settings, ready, update } = useSettings();
  const { setEnrolled, setPhase } = useEnrollmentStore((s) => s.actions);
  const setFilterActive = useFilterStore((s) => s.actions.setActive);
  const setTranscriptEnabled = useTranscriptStore((s) => s.actions.setEnabled);

  useEffect(() => {
    // Restore enrollment
    loadEnrollmentState().then((saved) => {
      if (saved?.isEnrolled) {
        setEnrolled(true, saved.userName ?? '');
        setPhase('done');
      }
    });

    loadVoiceProfile().then((profile) => {
      if (profile) {
        enrollmentActions.setProfile(profile);
        setPhase('done');
      }
    });

    // Restore filter toggle
    loadFilterState().then((saved) => {
      if (saved !== null) {
        setFilterActive(saved.isActive);
      }
    });

    // Restore transcript toggle
    loadTranscriptState().then((saved) => {
      if (saved !== null) {
        setTranscriptEnabled(saved.isEnabled);
      }
    });

    // Restore transcript entries
    loadTranscriptEntries().then((savedEntries) => {
      if (savedEntries && savedEntries.length > 0) {
        transcriptActions.setEntries(savedEntries);
      }
    });
  }, [enrollmentActions, setEnrolled, setPhase, setFilterActive, setTranscriptEnabled, transcriptActions]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handleAudioMessage = (message: {
      type?: string;
      platform?: string;
      error?: string;
      score?: number;
      matched?: boolean;
      isSpeech?: boolean;
      confidence?: number;
      entry?: any;
    }) => {
      if (message.type === 'HEARLY_AUDIO_STARTED') {
        setAudioStatus({
          capturing: true,
          platform: message.platform ?? null,
          error: null,
          voiceScore: null,
          voiceMatched: null,
          speechActive: null,
          speechConfidence: null,
        });
      }

      if (message.type === 'HEARLY_AUDIO_STOPPED') {
        setAudioStatus((current) => ({
          capturing: false,
          platform: message.platform ?? current.platform,
          error: null,
          voiceScore: current.voiceScore,
          voiceMatched: current.voiceMatched,
          speechActive: current.speechActive,
          speechConfidence: current.speechConfidence,
        }));
      }

      if (message.type === 'HEARLY_AUDIO_ERROR') {
        setAudioStatus({
          capturing: false,
          platform: null,
          error: message.error ?? 'Could not start meeting audio.',
          voiceScore: null,
          voiceMatched: null,
          speechActive: null,
          speechConfidence: null,
        });
        filterActions.setActive(false);
        saveFilterState(false);
      }

      if (message.type === 'HEARLY_MIC_PROCESSING_STARTED') {
        setAudioStatus({
          capturing: true,
          platform: message.platform ?? null,
          error: null,
          voiceScore: null,
          voiceMatched: null,
          speechActive: null,
          speechConfidence: null,
        });
      }

      if (message.type === 'HEARLY_MIC_PROCESSING_STOPPED') {
        setAudioStatus((current) => ({
          capturing: false,
          platform: message.platform ?? current.platform,
          error: null,
          voiceScore: current.voiceScore,
          voiceMatched: current.voiceMatched,
          speechActive: current.speechActive,
          speechConfidence: current.speechConfidence,
        }));
      }

      if (message.type === 'HEARLY_MIC_PROCESSING_ERROR') {
        setAudioStatus({
          capturing: false,
          platform: message.platform ?? null,
          error: message.error ?? 'Could not process microphone audio.',
          voiceScore: null,
          voiceMatched: null,
          speechActive: null,
          speechConfidence: null,
        });
      }

      if (message.type === 'HEARLY_VOICE_MATCH') {
        setAudioStatus((current) => ({
          ...current,
          platform: message.platform ?? current.platform,
          voiceScore: message.score ?? current.voiceScore,
          voiceMatched: message.matched ?? current.voiceMatched,
        }));
      }

      if (message.type === 'HEARLY_VOICE_ACTIVITY') {
        setAudioStatus((current) => ({
          ...current,
          platform: message.platform ?? current.platform,
          speechActive: message.isSpeech ?? current.speechActive,
          speechConfidence: message.confidence ?? current.speechConfidence,
        }));
      }

      if (message.type === 'HEARLY_NEW_TRANSCRIPT_ENTRY' && message.entry) {
        transcriptActions.addEntry(message.entry);
      }
    };

    chrome.runtime.onMessage.addListener(handleAudioMessage);
    return () => chrome.runtime.onMessage.removeListener(handleAudioMessage);
  }, [filterActions, transcriptActions]);

  const syncAudioCapture = (fActive: boolean, tEnabled: boolean) => {
    const needCapture = fActive || tEnabled;
    if (!needCapture) {
      setAudioStatus((current) => ({
        ...current,
        capturing: false,
        error: null,
      }));
      safeRuntimeMessage({ type: 'POPUP_TOGGLE_AUDIO_OFF' });
      return;
    }

    setAudioStatus((current) => ({
      ...current,
      error: null,
    }));

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setAudioStatus((current) => ({
          ...current,
          error: 'Open a Meet, Zoom, or Teams tab first.',
        }));
        return;
      }
      const meetingTabId = tab.id;

      const url = tab.url ?? '';
      const isMeetingTab =
        url.includes('meet.google.com') ||
        url.includes('zoom.us') ||
        url.includes('teams.microsoft.com') ||
        url.includes('teams.live.com');

      if (!isMeetingTab) {
        setAudioStatus((current) => ({
          ...current,
          error: 'Open a Meet, Zoom, or Teams tab first.',
        }));
        return;
      }

      chrome.tabCapture.getMediaStreamId(
        { consumerTabId: meetingTabId },
        (streamId: string) => {
          if (chrome.runtime.lastError || !streamId) {
            setAudioStatus((current) => ({
              ...current,
              error: chrome.runtime.lastError?.message ?? 'Could not start meeting audio.',
            }));
            return;
          }
          safeRuntimeMessage({
            type: 'POPUP_TOGGLE_AUDIO_ON',
            streamId,
            tabId: meetingTabId
          });
        }
      );
    });
  };

  const openEnrollment = () => {
    setEnrollmentOpen(true);
  };

  if (!ready) {
    return (
      <div className="box-border flex h-[600px] w-[380px] shrink-0 items-center justify-center overflow-hidden bg-hearly-bg text-hearly-secondary">
        Loading...
      </div>
    );
  }
  if (enrollmentOpen) {
    return (
      <EnrollmentFlow
        onClose={() => setEnrollmentOpen(false)}
        onComplete={(name, embedding, embeddingModel, cloudProfileId) => {
          const profile = {
            id: crypto.randomUUID(),
            cloudProfileId,
            userName: name,
            embedding,
            embeddingModel,
            enrolledAt: Date.now(),
            isActive: true,
          };
          enrollmentActions.setProfile(profile);
          enrollmentActions.setPhase('done');
          setEnrollmentOpen(false);
          saveVoiceProfile(profile);
          saveEnrollmentState({ isEnrolled: true, userName: name });
        }}
      />
    );
  }

  return (
    <>
      <PopupLayout
        activeTab={tab}
        onTabChange={setTab}
        versionAction={
          <div className="flex min-w-[72px] flex-col items-center gap-1.5">
            <span className="pointer-events-none block whitespace-nowrap text-center text-[10px] font-semibold leading-none text-white">
              Know about
            </span>
            <button
              type="button"
              className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-hearly-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:border-hearly-accent/30 hover:bg-hearly-accent/[0.07] hover:text-hearly-accent hover:shadow-[0_0_16px_rgba(181,240,61,0.1),inset_0_1px_0_rgba(255,255,255,0.065)] active:scale-[0.99]"
              onClick={() => setRoadmapOpen(true)}
            >
              V1.5
            </button>
          </div>
        }
      >
        {tab === 'home' && (
          <div
            className={`flex min-h-0 flex-1 flex-col ${isEnrolled
              ? 'scrollbar-none gap-6 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] pb-1'
              : 'gap-3'
              }`}
          >
            {!isEnrolled ? (
              <div className="flex min-h-0 flex-1 flex-col justify-center pb-1">
                <UnenrolledHero onStart={openEnrollment} />
              </div>
            ) : (
              <>
                <EnrolledHomePanel
                  userName={userName}
                  filterActive={filterActive}
                  capturing={audioStatus.capturing}
                  audioPlatform={audioStatus.platform}
                  audioError={audioStatus.error}
                  voiceScore={audioStatus.voiceScore}
                  voiceMatched={audioStatus.voiceMatched}
                  speechActive={audioStatus.speechActive}
                  speechConfidence={audioStatus.speechConfidence}
                  transcriptEnabled={transcriptEnabled}
                />
                <div className="flex shrink-0 flex-col">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                    <HearlyToggle
                      embedded
                      checked={filterActive}
                      onCheckedChange={(v) => {
                        filterActions.setActive(v);
                        saveFilterState(v);
                        syncAudioCapture(v, transcriptEnabled);

                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          const tab = tabs[0];
                          if (tab?.id) {
                            safeTabMessage(tab.id, { type: 'HEARLY_FILTER_STATE_CHANGED' });
                          }
                        });
                      }}
                    />
                    <div
                      className="my-1 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
                      aria-hidden
                    />
                    <TranscriptToggle
                      checked={transcriptEnabled}
                      onCheckedChange={(v) => {
                        transcriptActions.setEnabled(v);
                        saveTranscriptState(v);
                        syncAudioCapture(filterActive, v);

                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          const tab = tabs[0];
                          if (tab?.id) {
                            safeTabMessage(tab.id, { type: 'HEARLY_TRANSCRIPT_STATE_CHANGED' });
                          }
                        });
                      }}
                      latestEntry={latestEntry}
                    />
                  </div>

                  {transcriptEnabled && latestEntry ? (
                    <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-hearly-tertiary">
                        Latest transcript
                      </p>
                      <p className="mt-1 line-clamp-3 text-left text-[11px] font-normal leading-relaxed text-hearly-secondary">
                        {latestEntry.text}
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {/* Roadmap Entry Point */}
            <div className="mt-auto flex justify-center pb-2">
              <button
                type="button"
                className="group flex flex-col items-center gap-1.5 transition-[color,opacity] duration-300"
                onClick={() => setRoadmapOpen(true)}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-hearly-tertiary transition-colors duration-300 group-hover:text-hearly-accent">
                  Know About Version 2
                </span>
                <div className="h-[1px] w-4 bg-hearly-tertiary/20 transition-[width,background-color] duration-500 group-hover:w-14 group-hover:bg-hearly-accent/40" />
              </button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
              <HistoryTab language={settings.language} entries={entries} />
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
              <SettingsTab
                userName={isEnrolled ? userName : '-'}
                notifyVersions={settings.notifyNewVersions}
                notifyEmails={settings.notifyEmails}
                onNotifyVersions={(v) =>
                  update({ ...settings, notifyNewVersions: v })
                }
                onNotifyEmails={(v) => update({ ...settings, notifyEmails: v })}
                onRetrain={openEnrollment}
                onRemoveConfirmed={() => {
                  enrollmentActions.clearProfile();
                  clearEnrollmentState();
                  saveFilterState(false);
                  saveTranscriptState(false);
                  filterActions.setActive(false);
                  transcriptActions.setEnabled(false);
                }}
              />
            </div>
          </div>
        )}
      </PopupLayout>

      <RoadmapModal open={roadmapOpen} onClose={() => setRoadmapOpen(false)} />
    </>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <PopupApp />
    </StrictMode>,
  );
}
