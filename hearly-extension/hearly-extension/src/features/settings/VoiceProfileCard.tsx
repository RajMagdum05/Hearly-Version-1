import { IconMic, IconRefresh, IconTrash } from '@/ui/shared/icons';

export interface VoiceProfileCardProps {
  userName: string;
  onRetrain: () => void;
  onRemoveRequest: () => void;
}

export function VoiceProfileCard({
  userName,
  onRetrain,
  onRemoveRequest,
}: VoiceProfileCardProps) {
  const hasProfile = userName !== '-';

  return (
    <section className="space-y-3" aria-labelledby="voice-profile-title">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/[0.11] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              id="voice-profile-title"
              className="text-[14px] font-semibold leading-none tracking-[-0.025em] text-white"
            >
              Voice Profile
            </p>
            <p className="mt-1.5 text-[11px] leading-snug tracking-[-0.01em] text-hearly-secondary">
              Enrolled user voice identity
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${
              hasProfile
                ? 'border-hearly-accent/25 bg-hearly-accent/[0.07] text-hearly-accent'
                : 'border-white/[0.08] bg-white/[0.035] text-hearly-tertiary'
            }`}
          >
            {hasProfile ? 'Active' : 'Empty'}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-hearly-tertiary">
            Enrolled as
          </p>
          <p className="mt-1 truncate text-[17px] font-semibold leading-snug tracking-[-0.03em] text-white">
            {hasProfile ? userName : 'Not enrolled'}
          </p>
        </div>
      </div>

      <div aria-labelledby="voice-management-title">
        <p
          id="voice-management-title"
          className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-hearly-secondary"
        >
          Voice Management
        </p>
        {hasProfile ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRetrain}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[12px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:border-hearly-accent/25 hover:bg-hearly-accent/[0.07] hover:text-hearly-accent hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] active:scale-[0.99]"
            >
              <IconRefresh width={14} height={14} aria-hidden />
              Re-train Voice
            </button>
            <button
              type="button"
              onClick={onRemoveRequest}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/[0.035] px-3 py-2.5 text-[12px] font-semibold tracking-[-0.01em] text-[#ff8a8a] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:border-[#ff8a8a]/35 hover:bg-[#ff6b6b]/[0.07] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] active:scale-[0.99]"
            >
              <IconTrash width={14} height={14} aria-hidden />
              Remove Voice
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRetrain}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-hearly-accent/25 bg-hearly-accent/[0.06] px-3 py-3 text-[12px] font-semibold tracking-[-0.01em] text-hearly-accent shadow-[0_0_22px_rgba(181,240,61,0.09),inset_0_1px_0_rgba(255,255,255,0.055)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:border-hearly-accent/45 hover:bg-hearly-accent/[0.1] hover:text-white hover:shadow-[0_0_28px_rgba(181,240,61,0.14),inset_0_1px_0_rgba(255,255,255,0.065)] active:scale-[0.99]"
          >
            <IconMic width={15} height={15} aria-hidden />
            Train Your Voice
          </button>
        )}
      </div>
    </section>
  );
}
