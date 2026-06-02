import type { TranscriptEntry } from '../../utils/types';

let subtitleRoot: HTMLDivElement | null = null;
let hideTimer: number | null = null;

function subtitleDurationMs(text: string) {
  return Math.min(9000, Math.max(5000, 5000 + text.length * 45));
}

function languageLabel(language: TranscriptEntry['language']) {
  return language.toUpperCase();
}

function ensureSubtitleRoot() {
  if (subtitleRoot && document.body.contains(subtitleRoot)) {
    return subtitleRoot;
  }

  subtitleRoot = document.createElement('div');
  subtitleRoot.id = 'hearly-live-subtitle';
  subtitleRoot.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 88px;
    z-index: 2147483647;
    transform: translate(-50%, 12px);
    max-width: min(760px, calc(100vw - 32px));
    min-width: min(360px, calc(100vw - 32px));
    padding: 12px 16px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(8,8,8,0.82);
    color: #f7f7f7;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.35;
    text-align: center;
    letter-spacing: 0;
    box-shadow: 0 18px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease, transform 220ms ease;
    word-break: break-word;
  `;

  document.body.appendChild(subtitleRoot);
  return subtitleRoot;
}

export function showHearlySubtitle(entry: TranscriptEntry) {
  const text = entry.text.trim();
  if (!text) return;

  const root = ensureSubtitleRoot();
  const speakerLabel = entry.speaker === 'you' ? 'MIC' : 'CALL';
  root.replaceChildren();

  const badgeRow = document.createElement('div');
  badgeRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;';

  const languageBadge = document.createElement('span');
  languageBadge.style.cssText = 'border:1px solid rgba(181,240,61,0.35);background:rgba(181,240,61,0.1);color:#B5F03D;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800;letter-spacing:0.08em;';
  languageBadge.textContent = languageLabel(entry.language);

  const speakerBadge = document.createElement('span');
  speakerBadge.style.cssText = 'border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:#bdbdbd;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:750;letter-spacing:0.08em;';
  speakerBadge.textContent = speakerLabel;

  const textLine = document.createElement('div');
  textLine.textContent = text;

  badgeRow.append(languageBadge, speakerBadge);
  root.append(badgeRow, textLine);

  window.requestAnimationFrame(() => {
    if (!subtitleRoot) return;
    subtitleRoot.style.opacity = '1';
    subtitleRoot.style.transform = 'translate(-50%, 0)';
  });

  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
  }

  hideTimer = window.setTimeout(() => {
    if (!subtitleRoot) return;
    subtitleRoot.style.opacity = '0';
    subtitleRoot.style.transform = 'translate(-50%, 12px)';
  }, subtitleDurationMs(text));
}
