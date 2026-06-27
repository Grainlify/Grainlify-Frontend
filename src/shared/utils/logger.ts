/**
 * Guarded logger utility for the Grainlify application.
 *
 * @remarks
 * - All log statements are silenced (no-op) in production environments (`import.meta.env.PROD` is true).
 * - CRITICAL SECURITY RULE: Under no circumstances should this logger be used to print sensitive
 *   personally identifiable information (PII), credentials, full user profiles, or JSON Web Tokens (JWTs).
 *   Only log non-sensitive metadata, booleans, or IDs when debugging is required.
 */
export type ErrorSinkLevel = 'warn' | 'error'

/**
 * Optional remote sink for warn/error telemetry.
 *
 * @remarks
 * Implementations must only forward PII-safe metadata. Do not send JWTs,
 * credentials, full user profiles, email addresses, or other sensitive user
 * data through this sink.
 */
export type ErrorSink = (
  level: ErrorSinkLevel,
  message: unknown,
  params: readonly unknown[]
) => void

let errorSink: ErrorSink | undefined

/**
 * Registers a remote sink for warning and error logs.
 *
 * @remarks
 * The sink is invoked in addition to the guarded console logger and is wrapped
 * in try/catch so telemetry failures cannot crash application code.
 */
export function setErrorSink(sink: ErrorSink): void {
  errorSink = sink
}

/**
 * Clears the registered remote sink.
 */
export function clearErrorSink(): void {
  errorSink = undefined
}

function notifyErrorSink(
  level: ErrorSinkLevel,
  message: unknown,
  params: readonly unknown[]
): void {
  if (!errorSink) {
    return
  }

  try {
    errorSink(level, message, params)
  } catch {
    // Sink failures are intentionally swallowed so telemetry cannot break callers.
  }
}

export const logger = {
  /**
   * Logs a debug message to the console. Silenced in production.
   *
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  debug(message?: unknown, ...optionalParams: unknown[]): void {
    if (!import.meta.env.PROD) {
      console.debug(message, ...optionalParams)
    }
  },

  /**
   * Logs an info message to the console. Silenced in production.
   *
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  info(message?: unknown, ...optionalParams: unknown[]): void {
    if (!import.meta.env.PROD) {
      console.info(message, ...optionalParams)
    }
  },

  /**
   * Logs a warning message to the console and the registered sink.
   *
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (!import.meta.env.PROD) {
      console.warn(message, ...optionalParams)
    }

    notifyErrorSink('warn', message, optionalParams)
  },

  /**
   * Logs an error message to the console and the registered sink.
   *
   * @param message - The message or data to log.
   * @param optionalParams - Additional parameters or context to log.
   */
  error(message?: unknown, ...optionalParams: unknown[]): void {
    if (!import.meta.env.PROD) {
      console.error(message, ...optionalParams)
    }

    notifyErrorSink('error', message, optionalParams)
  },
}
