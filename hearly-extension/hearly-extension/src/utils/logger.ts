const isDev =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[Hearly]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[Hearly]', ...args);
  },
};
