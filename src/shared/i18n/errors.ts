import { ReactIntlErrorCode, type IntlConfig } from 'react-intl'
import {
  resolveMessages,
  DEFAULT_LOCALE,
  type Locale,
  type MessageId,
  type Messages,
} from './messages'
import { useTranslation } from './useTranslation'

/**
 * Mapping of backend API error codes (per Go backend error taxonomy)
 * to catalog message identifiers.
 */
export const ERROR_CODE_TAXONOMY: Record<string, MessageId> = {
  UNAUTHORIZED: 'errors.code.UNAUTHORIZED',
  FORBIDDEN: 'errors.code.FORBIDDEN',
  NOT_FOUND: 'errors.code.NOT_FOUND',
  RATE_LIMITED: 'errors.code.RATE_LIMITED',
  BAD_REQUEST: 'errors.code.BAD_REQUEST',
  INTERNAL_ERROR: 'errors.code.INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'errors.code.SERVICE_UNAVAILABLE',
}

/**
 * Resolves a backend error code to a localized, user-facing error message.
 *
 * Fallback chain:
 * 1. Active locale translation for the error code (if present).
 * 2. Default (English) catalog translation for the error code (if active locale is missing key).
 * 3. Localized generic error fallback message (`errors.generic`).
 * 4. English base generic error message ("An unexpected error occurred. Please try again.").
 *
 * Guarantees a safe, user-readable string is returned, never returning a raw i18n key or 'undefined'.
 *
 * @param code - The backend error code (e.g. `'UNAUTHORIZED'`, `'NOT_FOUND'`, or an unknown string).
 * @param locale - Target locale code (defaults to English base locale).
 * @param registry - Custom catalog registry (injectable for testing).
 * @returns Localized error message string.
 */
export function getErrorCodeMessage(
  code?: string | null,
  locale: Locale = DEFAULT_LOCALE,
  registry?: Record<string, Partial<Messages>>
): string {
  const messages = resolveMessages(locale, registry)
  const defaultMessages = resolveMessages(DEFAULT_LOCALE, registry)
  const genericFallback =
    messages['errors.generic'] ??
    defaultMessages['errors.generic'] ??
    'An unexpected error occurred. Please try again.'

  if (!code || typeof code !== 'string') {
    return genericFallback
  }

  const messageId = ERROR_CODE_TAXONOMY[code]
  if (!messageId) {
    return genericFallback
  }

  return messages[messageId] ?? defaultMessages[messageId] ?? genericFallback
}

/**
 * React hook that returns a function for getting localized error code messages
 * bound to the active translation context.
 *
 * @example
 * const { getErrorMessage } = useErrorCodeMessage()
 * const message = getErrorMessage('UNAUTHORIZED')
 */
export function useErrorCodeMessage() {
  const { locale } = useTranslation()

  return {
    getErrorMessage: (code?: string | null) => getErrorCodeMessage(code, locale),
    locale,
  }
}

/**
 * react-intl error policy.
 *
 * `MISSING_TRANSLATION` / `MISSING_DATA` are non-fatal: they fire when a key is
 * absent from the active locale (it then falls back to its English value or the
 * provided `defaultMessage`). We swallow those so a missing key degrades
 * gracefully instead of crashing the tree or spamming the console. Every other
 * error code is re-thrown to surface real configuration bugs early.
 *
 * Kept in its own module (not the provider) so the provider file only exports a
 * component, and so both branches can be unit-tested directly.
 *
 * @param error - The error react-intl reports for a format/lookup operation.
 */
export const handleIntlError: NonNullable<IntlConfig['onError']> = (error) => {
  if (
    error.code === ReactIntlErrorCode.MISSING_TRANSLATION ||
    error.code === ReactIntlErrorCode.MISSING_DATA
  ) {
    return
  }
  throw error
}

