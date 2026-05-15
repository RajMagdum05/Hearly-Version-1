import { useState } from 'react';
import { Button, Modal } from '@/ui/shared';
import { AppFooter } from './AppFooter';
import { NotificationsCard } from './NotificationsCard';
import { VoiceProfileCard } from './VoiceProfileCard';

export interface SettingsTabProps {
  userName: string;
  notifyVersions: boolean;
  notifyEmails: boolean;
  onNotifyVersions: (v: boolean) => void;
  onNotifyEmails: (v: boolean) => void;
  onRetrain: () => void;
  onRemoveConfirmed: () => void;
}

export function SettingsTab({
  userName,
  notifyVersions,
  notifyEmails,
  onNotifyVersions,
  onNotifyEmails,
  onRetrain,
  onRemoveConfirmed,
}: SettingsTabProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="pb-1">
      <header className="mb-5 px-0.5">
        <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.03em] text-white">
          Settings
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-hearly-secondary">
          Manage your voice profile and app preferences
        </p>
      </header>

      <div className="space-y-5">
        <VoiceProfileCard
          userName={userName}
          onRetrain={onRetrain}
          onRemoveRequest={() => setConfirmOpen(true)}
        />

        <NotificationsCard
          notifyVersions={notifyVersions}
          notifyEmails={notifyEmails}
          onNotifyVersions={onNotifyVersions}
          onNotifyEmails={onNotifyEmails}
        />

        <AppFooter />
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="text-center">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-hearly-text">
            Remove voice profile?
          </p>
          <p className="mx-auto mt-2 max-w-[250px] text-[12px] leading-relaxed text-hearly-secondary">
            This will delete your enrolled voice profile from Hearly.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              setConfirmOpen(false);
              onRemoveConfirmed();
            }}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
