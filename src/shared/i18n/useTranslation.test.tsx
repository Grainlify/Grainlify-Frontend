import { describe, it, expect } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { I18nProvider } from './I18nProvider'
import { useTranslation } from './useTranslation'
import type { Locale } from './messages'

/** Wraps a hook under test in {@link I18nProvider} with an optional locale. */
function createWrapper(locale?: Locale) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <I18nProvider locale={locale}>{children}</I18nProvider>
  }
}

describe('useTranslation', () => {
  it('resolves typed keys to their English strings', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: createWrapper(),
    })
    expect(result.current.t('dashboardNav.discover')).toBe('Discover')
    expect(result.current.t('landingNav.getStarted')).toBe('Get Started')
  })

  it('interpolates placeholder values correctly', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: createWrapper(),
    })
    expect(
      result.current.t('ecosystems.detail.ecosystemLabel', { name: 'Solana' })
    ).toBe('Solana Ecosystem')
    expect(
      result.current.t('terms.status.acceptedVersion', {
        version: '2.0',
        date: '2026-01-15',
      })
    ).toBe('✓ Accepted version 2.0 on 2026-01-15')
  })

  it('exposes the active locale from I18nProvider', () => {
    const { result: enResult } = renderHook(() => useTranslation(), {
      wrapper: createWrapper('en'),
    })
    expect(enResult.current.locale).toBe('en')

    const { result: esResult } = renderHook(() => useTranslation(), {
      wrapper: createWrapper('es'),
    })
    expect(esResult.current.locale).toBe('es')
  })

  it('handles null/undefined values without throwing', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: createWrapper(),
    })
    expect(() =>
      result.current.t('ecosystems.detail.ecosystemLabel', {
        name: null as unknown as string,
      })
    ).not.toThrow()
    expect(() =>
      result.current.t('ecosystems.detail.ecosystemLabel', {
        name: undefined as unknown as string,
      })
    ).not.toThrow()
  })

  it('renders interpolated values as text, never as markup (anti-injection)', () => {
    const evil = '<img src=x onerror="window.__pwned = true">'

    function TestComponent() {
      const { t } = useTranslation()
      return <div>{t('ecosystems.detail.ecosystemLabel', { name: evil })}</div>
    }

    const { container } = render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )

    // No img element was injected — the payload never became part of the DOM tree.
    expect(container.querySelector('img')).toBeNull()
    expect(
      (window as unknown as Record<string, unknown>).__pwned
    ).toBeUndefined()
    // The raw markup is present verbatim, as a text node, never parsed as HTML.
    expect(container.textContent).toContain(evil)
  })
})