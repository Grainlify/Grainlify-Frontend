import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyDrawSettings } from './BountyDrawSettings'
import { getDrawSettings, resetDrawSetting, setDrawSetting } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, getDrawSettings: vi.fn(), setDrawSetting: vi.fn(), resetDrawSetting: vi.fn() }
})

function setting(o: Record<string, unknown> = {}) {
  return {
    key: 'application_window_hours', type: 'int' as const, section: 'Window',
    description: 'How long applications stay open.', default: '6', value: '6',
    overridden: false, updatedAt: null, updatedBy: null, ...o,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getDrawSettings).mockResolvedValue({ settings: [setting()] })
})

describe('the draw settings', () => {
  it('saves a changed value and shows it as an override', async () => {
    vi.mocked(setDrawSetting).mockResolvedValue({ ok: true, settings: [setting({ value: '12', overridden: true, updatedBy: 'Jagadeeshftw' })] })
    renderWithProviders(<BountyDrawSettings />)
    const field = await screen.findByLabelText('application_window_hours')
    await userEvent.clear(field)
    await userEvent.type(field, '12')
    await userEvent.tab()
    expect(vi.mocked(setDrawSetting)).toHaveBeenCalledWith('application_window_hours', '12')
    expect(await screen.findByText(/overridden \(default 6\) by Jagadeeshftw/i)).toBeInTheDocument()
  })

  it('offers reset only on a setting that is actually overridden', async () => {
    renderWithProviders(<BountyDrawSettings />)
    await screen.findByLabelText('application_window_hours')
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('clears an override back to the coded default', async () => {
    vi.mocked(getDrawSettings).mockResolvedValue({ settings: [setting({ value: '12', overridden: true })] })
    vi.mocked(resetDrawSetting).mockResolvedValue({ ok: true, settings: [setting()] })
    renderWithProviders(<BountyDrawSettings />)
    await userEvent.click(await screen.findByRole('button', { name: 'Reset' }))
    expect(vi.mocked(resetDrawSetting)).toHaveBeenCalledWith('application_window_hours')
  })

  it('reports a refused value instead of pretending it saved', async () => {
    vi.mocked(setDrawSetting).mockRejectedValue(new Error('must be at least 1'))
    renderWithProviders(<BountyDrawSettings />)
    const field = await screen.findByLabelText('application_window_hours')
    await userEvent.clear(field)
    await userEvent.type(field, '0')
    await userEvent.tab()
    expect(await screen.findByRole('alert')).toHaveTextContent(/must be at least 1/i)
  })

  it('renders, and does not take the admin page down, when the agent answers with something unexpected', async () => {
    vi.mocked(getDrawSettings).mockResolvedValue({} as never)
    renderWithProviders(<div><p>Above</p><BountyDrawSettings /></div>)
    expect(await screen.findByText('Above')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('has no per-bounty controls: those are the maintainer\'s now', async () => {
    renderWithProviders(<BountyDrawSettings />)
    await screen.findByLabelText('application_window_hours')
    for (const name of [/run (the )?draw/i, /unassign/i, /move the deadline/i]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })
})
