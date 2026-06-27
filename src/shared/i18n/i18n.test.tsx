import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { FormattedMessage, FormattedNumber, ReactIntlErrorCode } from 'react-intl'

import {
  I18nProvider,
  handleIntlError,
  useTranslation,
  getTextDirection,
  resolveMessages,
  en,
  type Locale,
  type Messages,
  type MessageId,
} from './index'

// `useLandingStats` reaches the network through the API client; stub it so the
// hook's locale-aware number formatting can be asserted in isolation.
vi.mock('../api/client', () => ({ getLandingStats: vi.fn() }))
import { getLandingStats } from '../api/client'
import { useLandingStats } from '../hooks/useLandingStats'

const mockGetLandingStats = getLandingStats as unknown as ReturnType<typeof vi.fn>

/** Wraps a hook/component under test in the real {@link I18nProvider}. */
function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('i18n catalog & fallback', () => {
  it('exposes the full English base for the default locale', () => {
    const msgs = resolveMessages('en')
    expect(msgs).toEqual(en)
    ;(Object.keys(en) as MessageId[]).forEach((key) => {
      expect(msgs[key]).toBe(en[key])
    })
  })

  it('layers a partial locale over English, falling back per missing key', () => {
    const partial: Partial<Messages> = { 'dashboardNav.discover': 'Descubrir' }
    const msgs = resolveMessages('es' as Locale, { es: partial })

    // Provided key uses the locale value…
    expect(msgs['dashboardNav.discover']).toBe('Descubrir')
    // …every other key falls back to its English value.
    expect(msgs['dashboardNav.browse']).toBe('Browse')
    expect(msgs['landingNav.features']).toBe('Features')
  })

  it('falls back entirely to English for an unknown locale', () => {
    expect(resolveMessages('zz' as Locale)).toEqual(en)
  })
})

describe('locale direction', () => {
  it('defaults English and unknown locales to ltr', () => {
    expect(getTextDirection('en')).toBe('ltr')
    expect(getTextDirection('zz' as Locale)).toBe('ltr')
  })

  it('maps RTL locales to rtl', () => {
    expect(getTextDirection('ar')).toBe('rtl')
  })

  it('sets document.documentElement.dir from the active locale', async () => {
    const { rerender } = render(
      <I18nProvider locale="en">
        <span>English</span>
      </I18nProvider>
    )

    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))

    rerender(
      <I18nProvider locale="ar">
        <span>Arabic fallback</span>
      </I18nProvider>
    )

    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
  })
})

describe('handleIntlError policy', () => {
  it('swallows non-fatal missing-translation / missing-data errors', () => {
    expect(() =>
      handleIntlError({ code: ReactIntlErrorCode.MISSING_TRANSLATION } as never)
    ).not.toThrow()
    expect(() => handleIntlError({ code: ReactIntlErrorCode.MISSING_DATA } as never)).not.toThrow()
  })

  it('re-throws unexpected error codes to surface real bugs', () => {
    expect(() =>
      handleIntlError({
        code: ReactIntlErrorCode.FORMAT_ERROR,
        message: 'bad pattern',
      } as never)
    ).toThrow()
  })
})

describe('useTranslation', () => {
  it('resolves typed keys to their English strings and exposes the locale', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    expect(result.current.t('dashboardNav.discover')).toBe('Discover')
    expect(result.current.t('landingNav.getStarted')).toBe('Get Started')
    expect(result.current.locale).toBe('en')
  })
})

describe('missing key rendering', () => {
  it('renders the English defaultMessage for an unknown id without throwing', () => {
    render(
      <I18nProvider>
        <FormattedMessage
          id={'totally.missing.key' as MessageId}
          defaultMessage="English fallback"
        />
      </I18nProvider>
    )
    expect(screen.getByText('English fallback')).toBeInTheDocument()
  })
})

describe('number formatting', () => {
  it('formats currency for the active locale via <FormattedNumber>', () => {
    render(
      <I18nProvider>
        <FormattedNumber
          value={1234567.89}
          style="currency"
          currency="USD"
          maximumFractionDigits={0}
        />
      </I18nProvider>
    )
    expect(screen.getByText('$1,234,568')).toBeInTheDocument()
  })

  it('wires the provider locale into useLandingStats number formatting', async () => {
    mockGetLandingStats.mockResolvedValue({
      active_projects: 1234,
      contributors: 56789,
      grants_distributed_usd: 9876543,
    })

    const { result } = renderHook(() => useLandingStats(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.display.activeProjects).toBe('1,234')
    expect(result.current.display.contributors).toBe('56,789')
    expect(result.current.display.grantsDistributed).toBe('$9,876,543')
  })

  it('shows placeholders and surfaces an error when stats fail to load', async () => {
    mockGetLandingStats.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useLandingStats(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.display.activeProjects).toBe('—')
    expect(result.current.display.grantsDistributed).toBe('—')
    expect(result.current.error).toBe('boom')
  })
})

describe('plural formatting', () => {
  it('selects the correct ICU plural branch', () => {
    const message = '{count, plural, one {# project} other {# projects}}'

    const { rerender } = render(
      <I18nProvider>
        <FormattedMessage
          id={'plural.demo' as MessageId}
          defaultMessage={message}
          values={{ count: 1 }}
        />
      </I18nProvider>
    )
    expect(screen.getByText('1 project')).toBeInTheDocument()

    rerender(
      <I18nProvider>
        <FormattedMessage
          id={'plural.demo' as MessageId}
          defaultMessage={message}
          values={{ count: 5 }}
        />
      </I18nProvider>
    )
    expect(screen.getByText('5 projects')).toBeInTheDocument()
  })
})

describe('security — interpolation is text-only', () => {
  it('renders interpolated untrusted markup as inert text, never as DOM', () => {
    const evil = '<img src=x onerror="window.__pwned = true">'

    const { container } = render(
      <I18nProvider>
        <FormattedMessage
          id={'greeting.demo' as MessageId}
          defaultMessage="Hello, {name}!"
          values={{ name: evil }}
        />
      </I18nProvider>
    )

    // No element was injected — the payload never became part of the DOM tree.
    expect(container.querySelector('img')).toBeNull()
    expect((window as unknown as Record<string, unknown>).__pwned).toBeUndefined()
    // The raw markup is present verbatim, as a text node.
    expect(container.textContent).toBe(`Hello, ${evil}!`)
  })
})
