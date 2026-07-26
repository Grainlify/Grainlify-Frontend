import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LOCALE_STORAGE_KEY,
  LocaleProvider,
  readStoredLocale,
  useLocale,
} from './LocaleProvider'
import { DEFAULT_LOCALE, type Locale } from './messages'

describe('readStoredLocale', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns DEFAULT_LOCALE when no value is stored', () => {
    expect(readStoredLocale()).toBe(DEFAULT_LOCALE)
  })

  it('returns a supported stored locale as-is', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'es')

    expect(readStoredLocale()).toBe('es')
  })

  it('falls back to DEFAULT_LOCALE for an unsupported stored value', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')

    expect(readStoredLocale()).toBe(DEFAULT_LOCALE)
  })

  it('falls back to DEFAULT_LOCALE when localStorage.getItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(readStoredLocale()).toBe(DEFAULT_LOCALE)
  })

  it('falls back to DEFAULT_LOCALE when rendered without window', () => {
    vi.stubGlobal('window', undefined)

    try {
      expect(readStoredLocale()).toBe(DEFAULT_LOCALE)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('LocaleProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createWrapper(initialLocale?: Locale) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    }
  }

  it('prefers initialLocale over a different persisted locale', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem')

    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper('en'),
    })

    expect(result.current.locale).toBe('en')
    expect(getItemSpy).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('persists a changed locale and updates document.documentElement.lang', () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper('en'),
    })

    act(() => {
      result.current.setLocale('es')
    })

    expect(result.current.locale).toBe('es')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('falls back to DEFAULT_LOCALE for an unsupported runtime locale', () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper('es'),
    })

    act(() => {
      result.current.setLocale('fr' as unknown as Locale)
    })

    expect(result.current.locale).toBe(DEFAULT_LOCALE)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(DEFAULT_LOCALE)
    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE)
  })

  it('keeps the in-memory locale when localStorage.setItem throws', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper('en'),
    })

    act(() => {
      result.current.setLocale('es')
    })

    expect(result.current.locale).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    expect(setItemSpy).toHaveBeenLastCalledWith(LOCALE_STORAGE_KEY, 'es')
  })

  it('persists the latest locale after consecutive changes', () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper('en'),
    })

    act(() => {
      result.current.setLocale('es')
    })
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')

    act(() => {
      result.current.setLocale('en')
    })

    expect(result.current.locale).toBe('en')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('throws a clear error when useLocale is called outside LocaleProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useLocale())).toThrow(
      'useLocale must be used within a LocaleProvider'
    )

    consoleError.mockRestore()
  })
})
