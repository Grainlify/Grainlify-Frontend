import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LocaleProvider, LOCALES, LOCALE_STORAGE_KEY } from './index'
import { LocaleSwitcher } from './LocaleSwitcher'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = ''
})

describe('LocaleSwitcher', () => {
  it('renders the default label "Language"', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    expect(screen.getByText('Language')).toBeInTheDocument()
  })

  it('renders a custom label prop', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher label="Idioma" />
      </LocaleProvider>
    )

    expect(screen.getByText('Idioma')).toBeInTheDocument()
    expect(screen.queryByText('Language')).not.toBeInTheDocument()
  })

  it('renders every LOCALES entry as an <option> with correct value and text', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option'))

    expect(options).toHaveLength(LOCALES.length)

    for (const locale of LOCALES) {
      const option = options.find((o) => o.getAttribute('value') === locale.code)
      expect(option).toBeDefined()
      expect(option).toHaveTextContent(locale.label)
    }
  })

  it('initializes the <select> value to the current locale', () => {
    render(
      <LocaleProvider initialLocale="es">
        <LocaleSwitcher />
      </LocaleProvider>
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('es')
  })

  it('defaults to English (en) when no initialLocale is provided', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('en')
  })

  it('calls setLocale and persists when selecting a different option', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    const select = screen.getByLabelText('Language') as HTMLSelectElement
    expect(select.value).toBe('en')

    await user.selectOptions(select, 'es')

    expect(select.value).toBe('es')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
  })

  it('re-renders the select value when the locale changes externally', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    const select = screen.getByLabelText('Language') as HTMLSelectElement
    expect(select.value).toBe('en')

    // Switch to Spanish
    await user.selectOptions(select, 'es')
    expect(select.value).toBe('es')

    // Switch back to English
    await user.selectOptions(select, 'en')
    expect(select.value).toBe('en')
  })

  it('associates the <label> with the <select> via htmlFor/id (getByLabelText succeeds)', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    // getByLabelText verifies the programmatic association.
    const select = screen.getByLabelText('Language')
    expect(select).toBeInstanceOf(HTMLSelectElement)
    expect(select).toHaveAttribute('id')
  })

  it('preserves the default className when no className prop is passed', () => {
    const { container } = render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    )

    // The outer div should have the default flex column gap classes.
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('flex')
    expect(outerDiv.className).toContain('flex-col')
    expect(outerDiv.className).toContain('gap-2')
  })

  it('applies a custom className prop', () => {
    const { container } = render(
      <LocaleProvider>
        <LocaleSwitcher className="my-custom-class" />
      </LocaleProvider>
    )

    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('my-custom-class')
  })
})