import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTranslation } from './useTranslation'
import { I18nProvider } from './I18nProvider'
import type { MessageId } from './messages'

describe('useTranslation', () => {
  it('resolves a known message key correctly (including "nested" dot-separated keys)', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    })

    // Testing known key resolution
    expect(result.current.t('landingNav.features')).toBe('Features')
  })

  it('handles empty params gracefully', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    })

    // Edge case: empty params object
    expect(result.current.t('landingNav.features', {})).toBe('Features')
  })

  it('interpolates values for parameterized messages', () => {
    const customMessages = {
      'test.greeting': 'Hello {name}!',
    }

    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider messages={customMessages}>{children}</I18nProvider>,
    })

    // Testing value interpolation
    expect(result.current.t('test.greeting' as MessageId, { name: 'Alice' })).toBe('Hello Alice!')
  })

  it('validates security assumptions: interpolated values are not rendered as raw HTML', () => {
    const customMessages = {
      'test.xss': 'Welcome {payload}',
    }

    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider messages={customMessages}>{children}</I18nProvider>,
    })

    const maliciousPayload = '<script>alert(1)</script>'
    const translated = result.current.t('test.xss' as MessageId, { payload: maliciousPayload })

    // Assert that the raw string is preserved.
    // react-intl's formatMessage returns strings (not React elements) when interpolating primitives.
    // This confirms the hook is not parsing or returning raw HTML objects, so when React renders
    // this string, it will be safely escaped as a text node, neutralizing XSS vectors.
    expect(translated).toBe('Welcome <script>alert(1)</script>')
  })

  it('falls back gracefully when a key is missing without crashing', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    })

    // Edge case: missing key fallback
    const missingKey = 'missing.unknown.key' as MessageId

    expect(() => result.current.t(missingKey)).not.toThrow()
    // By default, react-intl returns the ID if the message is missing
    expect(result.current.t(missingKey)).toBe('missing.unknown.key')
  })

  it('exposes the active locale for locale switching', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider>,
    })

    expect(result.current.locale).toBe('en')
  })
})
