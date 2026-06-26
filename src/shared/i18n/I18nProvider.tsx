import { useEffect, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { DEFAULT_LOCALE, resolveMessages, type Locale } from './messages'
import { handleIntlError } from './errors'

/** Props for {@link I18nProvider}. */
export interface I18nProviderProps {
  /** Active locale. Defaults to {@link DEFAULT_LOCALE} (`en`). */
  locale?: Locale
  /**
   * Pre-resolved message map override. Intended for tests; production callers
   * should rely on the default, which layers `locale` over the English base
   * via {@link resolveMessages}.
   */
  messages?: Record<string, string>
  children: ReactNode
}

/**
 * Application i18n provider. Wraps react-intl's {@link IntlProvider} with the
 * project's message catalog, guaranteed English fallback, and error policy
 * ({@link handleIntlError}).
 *
 * It also keeps `<html lang>` synchronized with the active locale so assistive
 * technologies and translation tools can interpret every route correctly.
 *
 * Mounted once at the very top of the tree - above the router - in
 * `src/app/App.tsx`, so every route can call `useTranslation()` or render
 * `<FormattedMessage>`.
 *
 * @example
 * <I18nProvider>
 *   <BrowserRouter>...</BrowserRouter>
 * </I18nProvider>
 */
export function I18nProvider({ locale = DEFAULT_LOCALE, messages, children }: I18nProviderProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    document.documentElement.lang = locale
  }, [locale])

  return (
    <IntlProvider
      locale={locale}
      defaultLocale={DEFAULT_LOCALE}
      messages={messages ?? resolveMessages(locale)}
      onError={handleIntlError}
    >
      {children}
    </IntlProvider>
  )
}
