import { useTranslation } from './useTranslation'

/**
 * Options accepted by {@link UseIntlFormatters.formatDate}.
 * A subset of `Intl.DateTimeFormatOptions` for the most common use cases.
 */
export type FormatDateOptions = Intl.DateTimeFormatOptions

/**
 * Options accepted by {@link UseIntlFormatters.formatNumber}.
 * A subset of `Intl.NumberFormatOptions`.
 */
export type FormatNumberOptions = Intl.NumberFormatOptions

/**
 * Options accepted by {@link UseIntlFormatters.formatCurrency}.
 * The `currency` field is required; other options are optional.
 */
export interface FormatCurrencyOptions extends Omit<Intl.NumberFormatOptions, 'style' | 'currency'> {
  /** ISO 4217 currency code, e.g. `"USD"`. */
  currency: string
}

/**
 * Return value of {@link useIntlFormatters}.
 */
export interface UseIntlFormatters {
  /**
   * Formats a date/time value using the active locale.
   *
   * @param value - Date instance, timestamp (ms), or ISO-8601 string.
   * @param options - `Intl.DateTimeFormatOptions` (e.g. `{ month: 'short', day: 'numeric', year: 'numeric' }`).
   * @returns Locale-aware date string.
   *
   * @example
   * formatDate(new Date('2024-01-15'), { month: 'short', day: 'numeric', year: 'numeric' })
   * // → "Jan 15, 2024" for en
   */
  formatDate: (value: Date | number | string, options?: FormatDateOptions) => string

  /**
   * Formats a plain number using the active locale.
   *
   * @param value - Numeric value to format.
   * @param options - `Intl.NumberFormatOptions`.
   * @returns Locale-aware number string.
   *
   * @example
   * formatNumber(1234567.89)
   * // → "1,234,567.89" for en
   */
  formatNumber: (value: number, options?: FormatNumberOptions) => string

  /**
   * Formats a monetary amount using the active locale and a required currency code.
   *
   * @param value - Amount to format.
   * @param options - Must include `currency` (ISO 4217); other `Intl.NumberFormatOptions` are optional.
   * @returns Locale-aware currency string.
   *
   * @example
   * formatCurrency(49.99, { currency: 'USD' })
   * // → "$49.99" for en
   */
  formatCurrency: (value: number, options: FormatCurrencyOptions) => string
}

/**
 * Returns locale-aware date, number, and currency formatters bound to the
 * active i18n locale exposed by {@link useTranslation}.
 *
 * Replaces ad-hoc `toLocaleDateString('en-US', …)` and
 * `Intl.NumberFormat('en-US', …)` calls scattered across the app, ensuring
 * that formatting automatically follows the active locale when additional
 * locales are introduced.
 *
 * Must be called inside an {@link import('./I18nProvider').I18nProvider}.
 *
 * @example
 * const { formatDate, formatCurrency } = useIntlFormatters();
 * formatDate(invoice.date, { month: 'short', day: 'numeric', year: 'numeric' });
 * formatCurrency(invoice.amount, { currency: invoice.currency });
 */
export function useIntlFormatters(): UseIntlFormatters {
  const { locale } = useTranslation()

  const formatDate = (value: Date | number | string, options?: FormatDateOptions): string => {
    const date = value instanceof Date ? value : new Date(value)
    return new Intl.DateTimeFormat(locale, options).format(date)
  }

  const formatNumber = (value: number, options?: FormatNumberOptions): string => {
    return new Intl.NumberFormat(locale, options).format(value)
  }

  const formatCurrency = (value: number, { currency, ...rest }: FormatCurrencyOptions): string => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, ...rest }).format(value)
  }

  return { formatDate, formatNumber, formatCurrency }
}
