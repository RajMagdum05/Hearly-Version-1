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
import { loadEnrollmentState, loadFilterState, loadTranscriptState, clearEnrollmentState, saveEnrollmentState, saveFilterState, saveTranscriptState } from '@/services/storageService';
function PopupApp() {
  const [tab, setTab] = useState<PopupTabId>('home');
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);

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
  }, [setEnrolled, setPhase, setFilterActive, setTranscriptEnabled]);

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
        onComplete={(name) => {
          enrollmentActions.setProfile({
            id: crypto.randomUUID(),
            userName: name,
            embedding: new Float32Array(192),
            enrolledAt: Date.now(),
            isActive: true,
          });
          enrollmentActions.setPhase('done');
          setEnrollmentOpen(false);
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
                />
                <div className="flex shrink-0 flex-col">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                    <HearlyToggle
                      embedded
                      checked={filterActive}
                      onCheckedChange={(v) => {
                        filterActions.setActive(v);
                        saveFilterState(v);

                        if (!v) {
                          // Toggle OFF — tell background to stop audio
                          chrome.runtime.sendMessage({ type: 'POPUP_TOGGLE_AUDIO_OFF' });
                          return;
                        }

                        // Toggle ON — get the active meeting tab first
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          const tab = tabs[0];
                          if (!tab?.id) {
                            console.warn('[Hearly] No active tab found');
                            return;
                          }

                          const url = tab.url ?? '';
                          const isMeetingTab =
                            url.includes('meet.google.com') ||
                            url.includes('zoom.us') ||
                            url.includes('teams.microsoft.com') ||
                            url.includes('teams.live.com');

                          if (!isMeetingTab) {
                            console.warn('[Hearly] Not a meeting tab:', url);
                            return;
                          }

                          // tabCapture MUST be called from popup (user gesture context)
                          chrome.tabCapture.getMediaStreamId(
                            { consumerTabId: tab.id },
                            (streamId: string) => {
                              if (chrome.runtime.lastError || !streamId) {
                                console.warn('[Hearly] tabCapture failed:', chrome.runtime.lastError?.message);
                                return;
                              }
                              console.log('[Hearly] Got streamId from popup, forwarding...');
                              // Forward streamId to content script via background
                              chrome.runtime.sendMessage({
                                type: 'POPUP_TOGGLE_AUDIO_ON',
                                streamId,
                                tabId: tab.id
                              });
                            }
                          );
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
                      }}
                      latestEntry={latestEntry}
                    />
                  </div>
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
