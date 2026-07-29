import { Component, ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { LocaleSwitcher } from './LocaleSwitcher'
import { LocaleProvider, useLocale } from './LocaleProvider'
import { LOCALES } from './messages'

function renderSwitcher(ui: ReactNode, initialLocale?: 'en' | 'es') {
  return render(<LocaleProvider initialLocale={initialLocale}>{ui}</LocaleProvider>)
}

class TestErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <span data-testid="locale-switcher-error">{this.state.error.message}</span>
    }
    return this.props.children
  }
}

function LocaleSwitcherOutsideProvider() {
  useLocale()
  return null
}

describe('LocaleSwitcher', () => {
  it('renders the default "Language" label', () => {
    const { getByText } = renderSwitcher(<LocaleSwitcher />)
    expect(getByText('Language')).toBeInTheDocument()
  })

  it('renders a custom label when provided', () => {
    const { getByText, queryByText } = renderSwitcher(<LocaleSwitcher label="Idioma" />)
    expect(getByText('Idioma')).toBeInTheDocument()
    expect(queryByText('Language')).not.toBeInTheDocument()
  })

  it('applies the className prop to the wrapping element', () => {
    const { container } = renderSwitcher(<LocaleSwitcher className="my-extra-class" />)
    expect(container.querySelector('.my-extra-class')).not.toBeNull()
  })

  it('renders every LOCALES entry as an option with the correct value and text', () => {
    const { getByRole } = renderSwitcher(<LocaleSwitcher />)
    const select = getByRole('combobox') as HTMLSelectElement
    const options = Array.from(select.options)

    expect(options).toHaveLength(LOCALES.length)
    LOCALES.forEach(({ code, label }, i) => {
      expect(options[i].value).toBe(code)
      expect(options[i].textContent).toBe(label)
    })
  })

  it("associates the label with the select via useId, and the select's value matches the active locale", () => {
    const { getByLabelText } = renderSwitcher(<LocaleSwitcher />, 'es')
    const select = getByLabelText('Language') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select.value).toBe('es')
  })

  it('calls setLocale with the new code when a different option is selected', () => {
    const { getByRole } = renderSwitcher(<LocaleSwitcher />, 'en')
    const select = getByRole('combobox') as HTMLSelectElement

    fireEvent.change(select, { target: { value: 'es' } })

    expect(select.value).toBe('es')
  })

  it('still fires a locale change when re-selecting the currently active locale', () => {
    const { getByRole } = renderSwitcher(<LocaleSwitcher />, 'en')
    const select = getByRole('combobox') as HTMLSelectElement

    fireEvent.change(select, { target: { value: 'en' } })

    expect(select.value).toBe('en')
  })

  it('throws when rendered outside a LocaleProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message === 'useLocale must be used within a LocaleProvider') {
        event.preventDefault()
      }
    }

    try {
      window.addEventListener('error', preventExpectedError)

      const { getByTestId } = render(
        <TestErrorBoundary>
          <LocaleSwitcherOutsideProvider />
        </TestErrorBoundary>
      )

      expect(getByTestId('locale-switcher-error').textContent).toBe(
        'useLocale must be used within a LocaleProvider'
      )
    } finally {
      window.removeEventListener('error', preventExpectedError)
      consoleError.mockRestore()
    }
  })
})
