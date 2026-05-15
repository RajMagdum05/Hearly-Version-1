import { Toggle } from '@/ui/shared';

export interface NotificationsCardProps {
  notifyVersions: boolean;
  notifyEmails: boolean;
  onNotifyVersions: (v: boolean) => void;
  onNotifyEmails: (v: boolean) => void;
}

interface PreferenceRowProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id: string;
}

function PreferenceRow({
  title,
  description,
  checked,
  onCheckedChange,
  id,
}: PreferenceRowProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/[0.11] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="min-w-0 flex-1">
        <p
          id={titleId}
          className="text-[13px] font-semibold leading-snug tracking-[-0.02em] text-white"
        >
          {title}
        </p>
        <p
          id={descriptionId}
          className="mt-1 text-[11px] leading-snug tracking-[-0.01em] text-hearly-tertiary"
        >
          {description}
        </p>
      </div>
      <Toggle
        appearance="premium"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      />
    </div>
  );
}

export function NotificationsCard({
  notifyVersions,
  notifyEmails,
  onNotifyVersions,
  onNotifyEmails,
}: NotificationsCardProps) {
  return (
    <section aria-labelledby="preferences-title">
      <p
        id="preferences-title"
        className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-hearly-secondary"
      >
        Preferences
      </p>
      <div className="space-y-2.5">
        <PreferenceRow
          id="new-version-notifications"
          title="New version alerts"
          description="Notify when Hearly releases new features"
          checked={notifyVersions}
          onCheckedChange={onNotifyVersions}
        />
        <PreferenceRow
          id="product-update-emails"
          title="Product update emails"
          description="Receive occasional updates and news by email"
          checked={notifyEmails}
          onCheckedChange={onNotifyEmails}
        />
      </div>
    </section>
  );
}
