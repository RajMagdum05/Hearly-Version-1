import { HearlyLogoMark } from '@/ui/shared/HearlyLogoMark';

const LINKEDIN = 'https://www.linkedin.com/';
const INSTAGRAM = 'https://www.instagram.com/';

function LinkedInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 23.5h4V7.98h-4V23.5zM8.98 7.98h3.84v2.17h.05c.53-1 1.84-2.17 3.79-2.17 4.05 0 4.8 2.67 4.8 6.14V23.5h-4v-6.67c0-1.59-.03-3.63-2.21-3.63-2.21 0-2.55 1.73-2.55 3.52V23.5h-4V7.98z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 4.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm6.5-.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
    </svg>
  );
}

export function AppFooter() {
  return (
    <footer className="pt-1 text-center" aria-label="App information">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
        <div className="flex justify-center">
          <HearlyLogoMark size="sm" glow animated={false} />
        </div>
        <p className="mt-3 text-[15px] font-semibold leading-none tracking-[-0.03em] text-white">
          Hearly
        </p>
        <p className="mt-1.5 text-[11px] font-medium text-hearly-secondary">
          Version 1
        </p>
        <p className="mt-2 text-[12px] font-semibold tracking-[-0.01em] text-hearly-secondary">
          Cut the Noise, <span className="text-hearly-accent">Keep the Talk.</span>
        </p>
        <p className="mt-3 text-[10px] text-hearly-tertiary">
          © All rights reserved
        </p>
      </div>

      <div className="mt-3 flex justify-center gap-2.5">
        <a
          href={LINKEDIN}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-hearly-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] active:scale-[0.99]"
          aria-label="LinkedIn"
        >
          <LinkedInIcon />
        </a>
        <a
          href={INSTAGRAM}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-hearly-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] active:scale-[0.99]"
          aria-label="Instagram"
        >
          <InstagramIcon />
        </a>
      </div>
    </footer>
  );
}
