import type { ReactNode } from 'react';
import { HearlyBranding } from '@/ui/branding/HearlyBranding';
import { TopNavBar } from '@/ui/navigation/TopNavBar';
import type { PopupTabId } from '@/ui/navigation/popupTabId';

export type { PopupTabId } from '@/ui/navigation/popupTabId';

export interface PopupLayoutProps {
  activeTab: PopupTabId;
  onTabChange: (tab: PopupTabId) => void;
  children: ReactNode;
  versionAction?: ReactNode;
}

/**
 * Root popup shell — top nav, centered branding, fixed body (380×600).
 * Tab panels manage their own scroll where content can overflow (History, Settings).
 */
export function PopupLayout({
  activeTab,
  onTabChange,
  children,
  versionAction,
}: PopupLayoutProps) {
  return (
    <div className="box-border flex h-[600px] w-[380px] flex-col overflow-hidden bg-hearly-bg text-hearly-text">
      <TopNavBar activeTab={activeTab} onTabChange={onTabChange} />

      <HearlyBranding cornerAction={versionAction} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5 pt-1">
        {children}
      </div>
    </div>
  );
}
