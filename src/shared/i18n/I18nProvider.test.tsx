import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormattedMessage, ReactIntlErrorCode } from 'react-intl'

import { I18nProvider, en, type MessageId } from './index'

const mockHandleIntlError = vi.hoisted(() => vi.fn())

vi.mock('./errors', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./errors')>()
  return { ...mod, handleIntlError: mockHandleIntlError }
})

describe('I18nProvider', () => {
  it('uses DEFAULT_LOCALE ("en") when locale is omitted', () => {
    render(
      <I18nProvider>
        <FormattedMessage id={'dashboardNav.discover' as MessageId} />
      </I18nProvider>
    )
    expect(screen.getByText('Discover')).toBeInTheDocument()
  })

  it('renders translated strings for a non-default locale', () => {
    render(
      <I18nProvider locale="es">
        <FormattedMessage id={'dashboardNav.discover' as MessageId} />
      </I18nProvider>
    )
    expect(screen.getByText('Descubrir')).toBeInTheDocument()
  })

  it('falls back to English for a key not present in the active locale', () => {
    render(
      <I18nProvider locale="es">
        <FormattedMessage id={'dashboardNav.openSourceWeek' as MessageId} />
      </I18nProvider>
    )
    // 'dashboardNav.openSourceWeek' is not in the Spanish catalog, so it falls back to English
    expect(screen.getByText('Open-Source Week')).toBeInTheDocument()
  })

  it('uses explicit messages prop override instead of resolveMessages', () => {
    const customMessages: Record<string, string> = {
      'dashboardNav.discover': 'Override value',
    }
    render(
      <I18nProvider messages={customMessages}>
        <FormattedMessage id={'dashboardNav.discover' as MessageId} />
      </I18nProvider>
    )
    expect(screen.getByText('Override value')).toBeInTheDocument()
  })

  it('wires onError to handleIntlError so unknown message ids do not throw', () => {
    render(
      <I18nProvider>
        <FormattedMessage
          id={'totally.unknown.key' as MessageId}
          defaultMessage="Fallback text"
        />
      </I18nProvider>
    )
    expect(screen.getByText('Fallback text')).toBeInTheDocument()
  })
})

describe('I18nProvider onError wiring', () => {
  beforeEach(() => {
    mockHandleIntlError.mockClear()
  })

  it('calls handleIntlError when a missing message id is rendered without a defaultMessage', () => {
    render(
      <I18nProvider>
        <FormattedMessage id={'nonexistent.test.key' as MessageId} />
      </I18nProvider>
    )

    expect(mockHandleIntlError).toHaveBeenCalledTimes(1)
    expect(mockHandleIntlError).toHaveBeenCalledWith(
      expect.objectContaining({ code: ReactIntlErrorCode.MISSING_TRANSLATION })
    )
  })
})