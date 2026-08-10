// Minimal logger for PiDash main process
const log = {
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  info: (...args: any[]) => console.info('[INFO]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

export default log;
