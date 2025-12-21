/**
 * Logger utility for production-safe logging
 * In production, errors are logged but other logs are suppressed
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log warnings (always logged)
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Log errors (always logged)
   * In production, you could send these to an error tracking service
   */
  error: (...args: unknown[]) => {
    console.error(...args);

    // TODO: In production, send to error tracking service like Sentry
    // if (!isDev) {
    //   Sentry.captureException(args[0]);
    // }
  },

  /**
   * Log info (only in development)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};
