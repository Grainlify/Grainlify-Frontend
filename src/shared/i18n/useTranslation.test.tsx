import type { ReactNode } from 'react'
import { render, renderHook, screen } from '@testing-library/react'
import { I18nProvider } from './I18nProvider'
import { useTranslation } from './useTranslation'
import type { MessageId } from './messages'

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

function esWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider locale="es">{children}</I18nProvider>
}

describe('useTranslation', () => {
  it('resolves an existing key to its English string', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    expect(result.current.t('dashboardNav.discover')).toBe('Discover')
  })

  it('interpolates multiple placeholder values into a message', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    const output = result.current.t('terms.status.acceptedVersion', {
      version: 3,
      date: '2026-01-01',
    })
    expect(output).toBe('✓ Accepted version 3 on 2026-01-01')
  })

  it('exposes the locale matching the active I18nProvider', () => {
    const { result: enResult } = renderHook(() => useTranslation(), { wrapper })
    expect(enResult.current.locale).toBe('en')

    const { result: esResult } = renderHook(() => useTranslation(), { wrapper: esWrapper })
    expect(esResult.current.locale).toBe('es')
  })

  it('does not throw when values contains null/undefined entries', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    expect(() =>
      result.current.t('terms.status.acceptedVersion', {
        version: null,
        date: undefined,
      })
    ).not.toThrow()
  })

  it('reflects a locale prop change on the wrapping I18nProvider', () => {
    function Probe() {
      const { locale } = useTranslation()
      return <span data-testid="locale">{locale}</span>
    }

    const { rerender } = render(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('en')

    rerender(
      <I18nProvider locale="es">
        <Probe />
      </I18nProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('es')
  })
})

describe('useTranslation — anti-injection', () => {
  function Probe({ name }: { name: string }) {
    const { t } = useTranslation()
    return <div data-testid="out">{t('greeting.demo' as MessageId, { name })}</div>
  }

  it('renders markup-like interpolated values as literal text, never as an element', () => {
    const evil = '<img src=x onerror="window.__pwned2 = true">'

    const { container } = render(
      <I18nProvider messages={{ 'greeting.demo': 'Hello, {name}!' }}>
        <Probe name={evil} />
      </I18nProvider>
    )

    expect(container.querySelector('img')).toBeNull()
    expect((window as unknown as Record<string, unknown>).__pwned2).toBeUndefined()
    expect(screen.getByTestId('out').textContent).toBe(`Hello, ${evil}!`)
  })
})
