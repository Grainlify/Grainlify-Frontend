import { describe, it, expect, beforeEach } from 'vitest'
import { render, renderHook, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { FormattedMessage } from 'react-intl'

import {
  LocaleProvider,
  LocaleSwitcher,
  useLocale,
  readStoredLocale,
  LOCALE_STORAGE_KEY,
  isLocale,
  LOCALES,
  catalogs,
  resolveMessages,
} from './index'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = ''
})

describe('locale catalog & validation', () => {
  it('registers the Spanish stub and falls back to English for missing keys', () => {
    expect(catalogs.es).toBeDefined()
    const msgs = resolveMessages('es')
    // Translated stub key uses Spanish…
    expect(msgs['dashboardNav.discover']).toBe('Descubrir')
    // …untranslated key falls back to English.
    expect(msgs['dashboardNav.maintainers']).toBe('Maintainers')
  })

  it('isLocale accepts supported codes and rejects everything else', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('es')).toBe(true)
    expect(isLocale('zz')).toBe(false)
    expect(isLocale('')).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(42)).toBe(false)
  })

  it('exposes more than one locale', () => {
    expect(LOCALES.length).toBeGreaterThan(1)
  })
})

describe('readStoredLocale', () => {
  it('returns the persisted locale when valid', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    expect(readStoredLocale()).toBe('es')
  })

  it('falls back to en for an unknown stored value', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'zz')
    expect(readStoredLocale()).toBe('en')
  })

  it('falls back to en when nothing is stored', () => {
    expect(readStoredLocale()).toBe('en')
  })
})

describe('LocaleProvider', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <LocaleProvider>{children}</LocaleProvider>
  }

  it('rehydrates the persisted locale on load', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    const { result } = renderHook(() => useLocale(), { wrapper })
    expect(result.current.locale).toBe('es')
  })

  it('persists a changed locale and reflects it on <html lang>', () => {
    const { result } = renderHook(() => useLocale(), { wrapper })
    expect(result.current.locale).toBe('en')

    act(() => result.current.setLocale('es'))

    expect(result.current.locale).toBe('es')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('ignores an unsupported locale passed to setLocale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper })
    act(() => result.current.setLocale('zz' as never))
    expect(result.current.locale).toBe('en')
  })
})

describe('LocaleSwitcher', () => {
  it('switches the active language and re-renders translated content', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <FormattedMessage id="dashboardNav.discover" />
      </LocaleProvider>
    )

    // English by default.
    expect(screen.getByText('Discover')).toBeInTheDocument()

    const select = screen.getByLabelText('Language') as HTMLSelectElement
    await user.selectOptions(select, 'es')

    // The stubbed Spanish translation now renders.
    expect(screen.getByText('Descubrir')).toBeInTheDocument()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
  })
})
