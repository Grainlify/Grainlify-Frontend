/* eslint-disable no-console */
/**
 * Guarded logger utility for the Grainlify application.
 * 
 * @remarks
 * - All log statements are silenced (no-op) in production environments (`import.meta.env.PROD` is true).
 * - CRITICAL SECURITY RULE: Under no circumstances should this logger be used to print sensitive
 *   personally identifiable information (PII), credentials, full user profiles, or JSON Web Tokens (JWTs).
 *   Only log non-sensitive metadata, booleans, or IDs when debugging is required.
 */
export const logger = {
  /**
   * Logs a debug message to the console. Silenced in production.
   * 
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  debug(message?: any, ...optionalParams: any[]): void {
    if (!import.meta.env.PROD) {
      console.debug(message, ...optionalParams);
    }
  },

  /**
   * Logs an info message to the console. Silenced in production.
   * 
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  info(message?: any, ...optionalParams: any[]): void {
    if (!import.meta.env.PROD) {
      console.info(message, ...optionalParams);
    }
  },

  /**
   * Logs a warning message to the console. Silenced in production.
   * 
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  warn(message?: any, ...optionalParams: any[]): void {
    if (!import.meta.env.PROD) {
      console.warn(message, ...optionalParams);
    }
  },

  /**
   * Logs an error message to the console. Silenced in production.
   * 
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  error(message?: any, ...optionalParams: any[]): void {
    if (!import.meta.env.PROD) {
      console.error(message, ...optionalParams);
    }
  }
};
