import type { ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { ReactIntlErrorCode } from 'react-intl'

import {
  handleIntlError,
  getErrorCodeMessage,
  useErrorCodeMessage,
  ERROR_CODE_TAXONOMY,
  I18nProvider,
  en,
  type Locale,
  type Messages,
} from './index'

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('getErrorCodeMessage', () => {
  it('renders correct localized message for a known error code in supported locales', () => {
    // English default locale
    expect(getErrorCodeMessage('UNAUTHORIZED', 'en')).toBe(en['errors.code.UNAUTHORIZED'])
    expect(getErrorCodeMessage('FORBIDDEN', 'en')).toBe(en['errors.code.FORBIDDEN'])
    expect(getErrorCodeMessage('NOT_FOUND', 'en')).toBe(en['errors.code.NOT_FOUND'])
    expect(getErrorCodeMessage('RATE_LIMITED', 'en')).toBe(en['errors.code.RATE_LIMITED'])

    // Spanish active locale
    expect(getErrorCodeMessage('UNAUTHORIZED', 'es')).toBe(
      'Su sesión ha expirado. Por favor, inicie sesión de nuevo.'
    )
    expect(getErrorCodeMessage('FORBIDDEN', 'es')).toBe(
      'No tiene permiso para realizar esta acción.'
    )
    expect(getErrorCodeMessage('NOT_FOUND', 'es')).toBe(
      'El recurso solicitado no se pudo encontrar.'
    )
  })

  it('falls back to default (English) locale when translation is missing in active locale', () => {
    // 'RATE_LIMITED' is omitted from the Spanish catalog; it must fall back to English
    const spanishResult = getErrorCodeMessage('RATE_LIMITED', 'es')

    expect(spanishResult).toBe(en['errors.code.RATE_LIMITED'])
    expect(spanishResult).not.toBe('errors.code.RATE_LIMITED')
    expect(spanishResult).not.toBeUndefined()

    // Test with a custom partial registry where 'FORBIDDEN' is missing
    const customRegistry: Record<string, Partial<Messages>> = {
      es: {
        'errors.generic': 'Error genérico',
        // 'errors.code.FORBIDDEN' is intentionally missing
      },
    }

    const fallbackResult = getErrorCodeMessage('FORBIDDEN', 'es' as Locale, customRegistry)
    expect(fallbackResult).toBe(en['errors.code.FORBIDDEN'])
    expect(fallbackResult).not.toContain('errors.code')
  })

  it('renders a safe generic fallback message for completely unknown error codes', () => {
    const unknownEn = getErrorCodeMessage('COMPLETELY_UNKNOWN_CODE', 'en')
    expect(unknownEn).toBe('An unexpected error occurred. Please try again.')
    expect(unknownEn).not.toBe('COMPLETELY_UNKNOWN_CODE')
    expect(unknownEn).not.toBe('errors.generic')
    expect(unknownEn).not.toBeUndefined()

    const unknownEs = getErrorCodeMessage('INVALID_TAXONOMY_123', 'es')
    expect(unknownEs).toBe('Ocurrió un error inesperado. Por favor, inténtelo de nuevo.')
    expect(unknownEs).not.toBe('INVALID_TAXONOMY_123')
    expect(unknownEs).not.toBeUndefined()
  })

  it('handles null, undefined, and non-string error code inputs gracefully', () => {
    expect(getErrorCodeMessage(null, 'en')).toBe('An unexpected error occurred. Please try again.')
    expect(getErrorCodeMessage(undefined, 'en')).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(getErrorCodeMessage('' as string, 'en')).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(getErrorCodeMessage(123 as unknown as string, 'en')).toBe(
      'An unexpected error occurred. Please try again.'
    )
  })

  it('falls back to default English catalog when active locale itself is unsupported', () => {
    const result = getErrorCodeMessage('UNAUTHORIZED', 'fr' as Locale)
    expect(result).toBe(en['errors.code.UNAUTHORIZED'])
  })

  it('falls back to hardcoded string when catalog has no generic error message', () => {
    const emptyRegistry: Record<string, Partial<Messages>> = {
      en: {},
      es: {},
    }
    const result = getErrorCodeMessage('UNKNOWN_ERROR_CODE', 'es' as Locale, emptyRegistry)
    expect(result).toBe('An unexpected error occurred. Please try again.')
  })

  it('covers all mapped error codes in ERROR_CODE_TAXONOMY against default catalog', () => {
    Object.keys(ERROR_CODE_TAXONOMY).forEach((code) => {
      const msg = getErrorCodeMessage(code, 'en')
      expect(msg).toBeTruthy()
      expect(msg).not.toBe('errors.generic')
      expect(msg).not.toContain('errors.code.')
    })
  })
})

describe('useErrorCodeMessage hook', () => {
  it('resolves error messages using the active provider locale', () => {
    const { result } = renderHook(() => useErrorCodeMessage(), { wrapper })

    expect(result.current.locale).toBe('en')
    expect(result.current.getErrorMessage('UNAUTHORIZED')).toBe(en['errors.code.UNAUTHORIZED'])
    expect(result.current.getErrorMessage('UNKNOWN_CODE')).toBe(
      'An unexpected error occurred. Please try again.'
    )
    expect(result.current.getErrorMessage()).toBe(
      'An unexpected error occurred. Please try again.'
    )
  })
})

describe('handleIntlError', () => {
  it('swallows non-fatal missing-translation and missing-data errors', () => {
    expect(() =>
      handleIntlError({ code: ReactIntlErrorCode.MISSING_TRANSLATION } as never)
    ).not.toThrow()
    expect(() => handleIntlError({ code: ReactIntlErrorCode.MISSING_DATA } as never)).not.toThrow()
  })

  it('re-throws unexpected error codes', () => {
    expect(() =>
      handleIntlError({
        code: ReactIntlErrorCode.FORMAT_ERROR,
        message: 'Formatting error',
      } as never)
    ).toThrow()
  })
})
