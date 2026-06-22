import { useIntl } from 'react-intl'
import type { Locale, MessageId } from './messages'

/**
 * Values interpolated into a message placeholder.
 *
 * Deliberately restricted to primitives: react-intl renders interpolated
 * values as React text nodes, so untrusted input can only ever become inert
 * text — never markup. Rich-text/HTML interpolation is intentionally NOT
 * supported here. See the i18n README section and the anti-injection test in
 * `i18n.test.tsx`.
 */
export type TranslationValues = Record<string, string | number | boolean | null | undefined>

/**
 * Return value of {@link useTranslation}.
 */
export interface UseTranslation {
  /**
   * Resolves a {@link MessageId} to its localized string.
   *
   * @param id - A catalog key. Unknown ids are a compile-time error.
   * @param values - Optional placeholder values (primitives only).
   * @returns The localized, interpolated string.
   */
  t: (id: MessageId, values?: TranslationValues) => string
  /** The active locale code (e.g. for wiring `Intl.*` formatters). */
  locale: Locale
}

/**
 * Strongly-typed translation helper built on react-intl's {@link useIntl}.
 *
 * Prefer this hook for translating string values (props, array data, etc.)
 * because `id` is constrained to {@link MessageId}; use `<FormattedMessage>`
 * for inline JSX. Must be called within an
 * {@link import('./I18nProvider').I18nProvider}.
 *
 * @example
 * const { t } = useTranslation();
 * const label = t('dashboardNav.discover'); // 'Discover'
 */
export function useTranslation(): UseTranslation {
  const intl = useIntl()

  const t = (id: MessageId, values?: TranslationValues): string =>
    intl.formatMessage({ id }, values)

  return { t, locale: intl.locale as Locale }
}
