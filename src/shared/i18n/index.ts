/**
 * @packageDocumentation
 * Public surface of the i18n module.
 *
 * - {@link I18nProvider} — mount once above the router in `src/app/App.tsx`.
 * - {@link useTranslation} — type-checked `t(id, values?)` + active `locale`.
 * - For inline JSX, import `<FormattedMessage>` / `<FormattedNumber>` directly
 *   from `react-intl` (this module intentionally does not re-wrap them).
 * - {@link resolveMessages} / {@link en} / {@link MessageId} — catalog + types.
 */
export { I18nProvider, type I18nProviderProps } from './I18nProvider'
export { handleIntlError } from './errors'
export { useTranslation, type TranslationValues, type UseTranslation } from './useTranslation'
export {
  en,
  catalogs,
  resolveMessages,
  DEFAULT_LOCALE,
  type Locale,
  type MessageId,
  type Messages,
} from './messages'
