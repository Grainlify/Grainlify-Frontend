import { createElement, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LocaleProvider, useIntlFormatters, useLocale, type Locale } from './index'

const DATE = new Date('2024-01-15T12:00:00Z')
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}

const localeCases = [
  {
    locale: 'en',
    date: 'January 15, 2024',
    numbers: [
      { label: 'zero', value: 0, expected: '0' },
      { label: 'negative', value: -12_345.67, expected: '-12,345.67' },
      {
        label: 'very large',
        value: 9_876_543_210_123.45,
        expected: '9,876,543,210,123.45',
      },
    ],
  },
  {
    locale: 'es',
    date: '15 de enero de 2024',
    numbers: [
      { label: 'zero', value: 0, expected: '0' },
      { label: 'negative', value: -12_345.67, expected: '-12.345,67' },
      {
        label: 'very large',
        value: 9_876_543_210_123.45,
        expected: '9.876.543.210.123,45',
      },
    ],
  },
] satisfies Array<{
  locale: Locale
  date: string
  numbers: Array<{ label: string; value: number; expected: string }>
}>

function createLocaleWrapper(locale: Locale) {
  return function LocaleTestWrapper({ children }: { children: ReactNode }) {
    return createElement(LocaleProvider, { initialLocale: locale, children })
  }
}

function renderFormatters(locale: Locale) {
  return renderHook(() => useIntlFormatters(), {
    wrapper: createLocaleWrapper(locale),
  })
}

describe.each(localeCases)('useIntlFormatters ($locale)', ({ locale, date, numbers }) => {
  it.each(numbers)('formats $label numbers', ({ value, expected }) => {
    const { result } = renderFormatters(locale)

    expect(result.current.formatNumber(value)).toBe(expected)
  })

  it('formats dates for the active locale', () => {
    const { result } = renderFormatters(locale)

    expect(result.current.formatDate(DATE, DATE_OPTIONS)).toBe(date)
  })

  it('returns a defined fallback for Invalid Date without throwing', () => {
    const { result } = renderFormatters(locale)
    const invalidDate = new Date(Number.NaN)

    expect(() => result.current.formatDate(invalidDate)).not.toThrow()
    expect(result.current.formatDate(invalidDate)).toBe('—')
  })
})

it('produces different number and date output for en and es', () => {
  const { result: en } = renderFormatters('en')
  const { result: es } = renderFormatters('es')

  expect(en.current.formatNumber(1_234_567.89)).not.toBe(es.current.formatNumber(1_234_567.89))
  expect(en.current.formatDate(DATE, DATE_OPTIONS)).not.toBe(
    es.current.formatDate(DATE, DATE_OPTIONS)
  )
})

it('updates formatted output when the active locale changes', () => {
  const { result } = renderHook(
    () => ({ formatters: useIntlFormatters(), localeState: useLocale() }),
    { wrapper: createLocaleWrapper('en') }
  )
  const englishNumber = result.current.formatters.formatNumber(1_234_567.89)
  const englishDate = result.current.formatters.formatDate(DATE, DATE_OPTIONS)

  act(() => {
    result.current.localeState.setLocale('es')
  })

  expect(result.current.localeState.locale).toBe('es')
  expect(result.current.formatters.formatNumber(1_234_567.89)).not.toBe(englishNumber)
  expect(result.current.formatters.formatDate(DATE, DATE_OPTIONS)).not.toBe(englishDate)
})
