import { ReactIntlErrorCode, type IntlConfig } from 'react-intl'

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
