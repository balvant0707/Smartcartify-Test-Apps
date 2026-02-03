/**
 * Conditional logging utility for server-side code.
 * Logs are only output in non-production environments.
 * Error logging is always enabled for critical issues.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  /**
   * Debug log - only shown in development
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Warning log - only shown in development
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Error log - always shown (critical for production debugging)
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Info log - only shown in development
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

export default logger;
