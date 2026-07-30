import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_LOCALE, isLocale, type Locale } from './messages'
import { I18nProvider } from './I18nProvider'

/** localStorage key under which the user's chosen locale is persisted. */
export const LOCALE_STORAGE_KEY = 'locale'

/**
 * Reads and validates the persisted locale from `localStorage`. Any unknown or
 * missing value (including a SSR/no-`window` environment) resolves to
 * {@link DEFAULT_LOCALE}, so a tampered or stale entry can never apply an
 * unsupported locale.
 */
export function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    // localStorage can throw (private mode / disabled storage) — fall back.
    return DEFAULT_LOCALE
  }
}

/** Value exposed by {@link useLocale}. */
export interface LocaleContextValue {
  /** The active locale code. */
  locale: Locale
  /** Switches the active locale and persists the choice. */
  setLocale: (next: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/** Props for {@link LocaleProvider}. */
export interface LocaleProviderProps {
  /** Initial locale override (mainly for tests); defaults to the stored value. */
  initialLocale?: Locale
  children: ReactNode
}

/**
 * Owns the active locale, persists changes to `localStorage`, rehydrates the
 * stored choice on load, and feeds the resolved locale into {@link I18nProvider}
 * so the whole tree re-renders in the selected language.
 *
 * Mount once near the top of the app (above the router) in
 * `src/app/App.tsx`.
 */
export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale())

  const setLocale = useCallback((next: Locale) => {
    // Guard at runtime too: never store/apply an unsupported locale.
    const safe = isLocale(next) ? next : DEFAULT_LOCALE
    setLocaleState(safe)
  }, [])

  // Persist + reflect the active locale on the document for a11y/SEO.
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Ignore storage failures (private mode / disabled storage).
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale])

  return (
    <LocaleContext.Provider value={value}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </LocaleContext.Provider>
  )
}

/**
 * Accesses the active locale and a setter to change it. Must be called within
 * a {@link LocaleProvider}.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return ctx
}
