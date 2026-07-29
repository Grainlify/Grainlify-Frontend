import { render, screen } from '@testing-library/react'
import { I18nProvider } from './I18nProvider'
import { useTranslation } from './useTranslation'
import type { MessageId } from './messages'

vi.mock('./errors', async () => {
  const actual = await vi.importActual<typeof import('./errors')>('./errors')
  return {
    ...actual,
    handleIntlError: vi.fn(actual.handleIntlError),
  }
})
import { handleIntlError } from './errors'

const mockHandleIntlError = vi.mocked(handleIntlError)

function Probe({ id }: { id: MessageId }) {
  const { t, locale } = useTranslation()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="value">{t(id)}</span>
    </div>
  )
}

describe('I18nProvider', () => {
  beforeEach(() => {
    mockHandleIntlError.mockClear()
  })

  it('defaults to DEFAULT_LOCALE (en) when locale is omitted', () => {
    render(
      <I18nProvider>
        <Probe id="dashboardNav.discover" />
      </I18nProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    expect(screen.getByTestId('value')).toHaveTextContent('Discover')
  })

  it('resolves the layered catalog for a non-default locale prop', () => {
    render(
      <I18nProvider locale="es">
        <Probe id="dashboardNav.discover" />
      </I18nProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('es')
    expect(screen.getByTestId('value')).toHaveTextContent('Descubrir')
  })

  it('falls back to English for a key missing from the es catalog, even under locale="es"', () => {
    render(
      <I18nProvider locale="es">
        <Probe id="terms.title" />
      </I18nProvider>
    )
    // Not present in the `es` catalog — resolveMessages layers English in.
    expect(screen.getByTestId('value')).toHaveTextContent('Terms and Conditions')
  })

  it('lets an explicit messages prop override resolveMessages entirely', () => {
    render(
      <I18nProvider locale="es" messages={{ 'dashboardNav.discover': 'Overridden' }}>
        <Probe id="dashboardNav.discover" />
      </I18nProvider>
    )
    // Not the real es catalog value ("Descubrir") — the override took precedence.
    expect(screen.getByTestId('value')).toHaveTextContent('Overridden')
  })

  it('wires onError to handleIntlError instead of throwing or using react-intl defaults', () => {
    render(
      <I18nProvider messages={{}}>
        <Probe id="dashboardNav.discover" />
      </I18nProvider>
    )
    // messages={{}} means every lookup is a MISSING_TRANSLATION -
    // handleIntlError must have been invoked to swallow it (render didn't throw).
    expect(mockHandleIntlError).toHaveBeenCalled()
  })
})
