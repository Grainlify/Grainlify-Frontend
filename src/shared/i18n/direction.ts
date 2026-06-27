import type { Locale } from './messages'

/** The only valid values accepted by the document `dir` attribute. */
export type TextDirection = 'ltr' | 'rtl'

const RTL_LOCALES = new Set<Locale>(['ar'])

/**
 * Maps a supported locale to its writing direction.
 *
 * Locale is constrained to the app's fixed {@link Locale} union, so callers
 * cannot inject arbitrary `dir` values into the document element.
 */
export function getTextDirection(locale: Locale): TextDirection {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}
