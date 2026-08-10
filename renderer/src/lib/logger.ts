// Renderer logger utility
export const log = {
  error: (...args: any[]) => console.error('[Renderer ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[Renderer WARN]', ...args),
  info: (...args: any[]) => console.info('[Renderer INFO]', ...args),
  debug: (...args: any[]) => console.debug('[Renderer DEBUG]', ...args),
};
