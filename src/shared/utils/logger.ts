/* eslint-disable no-console */
/**
 * Guarded logger utility for the Grainlify application.
 *
 * @remarks
 * - `debug` and `info` are silenced (no-op) in production environments (`import.meta.env.PROD` is true).
 * - `warn` and `error` are forwarded to the console even in production so that genuine runtime
 *   failures remain visible in the browser console and capturable by future telemetry.
 * - CRITICAL SECURITY RULE: Under no circumstances should this logger be used to print sensitive
 *   personally identifiable information (PII), credentials, full user profiles, or JSON Web Tokens (JWTs).
 *   Only log non-sensitive metadata, booleans, or IDs when debugging is required.
 *   This rule applies equally to `warn` and `error` in production — callers must never pass tokens,
 *   passwords, or full profile objects to any log level.
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
   * Logs a warning message to the console.
   * Active in both development and production for observability.
   *
   * @remarks
   * PII-safety: do NOT pass tokens, passwords, or full user objects.
   *
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  warn(message?: any, ...optionalParams: any[]): void {
    console.warn(message, ...optionalParams);
  },

  /**
   * Logs an error message to the console.
   * Active in both development and production for observability.
   *
   * @remarks
   * PII-safety: do NOT pass tokens, passwords, or full user objects.
   *
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  error(message?: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }
};
