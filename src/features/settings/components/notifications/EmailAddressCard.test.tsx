import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { EmailAddressCard } from './EmailAddressCard'

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockRemove = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getStoredEmail: (...a: unknown[]) => mockGet(...a),
  updateStoredEmail: (...a: unknown[]) => mockUpdate(...a),
  removeStoredEmail: (...a: unknown[]) => mockRemove(...a),
}))

const HELD = { address: 'ada@example.com', captured_at: '2026-09-29T16:01:00Z', enabled: true, declined: false }

describe('EmailAddressCard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGet.mockResolvedValue(HELD)
  })

  it('shows the address itself, not a description of it', async () => {
    renderWithProviders(<EmailAddressCard />)
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
  })

  it('says what the address is for and what it is not used for', async () => {
    renderWithProviders(<EmailAddressCard />)
    const blurb = await screen.findByText(/never shown to maintainers/i)
    expect(blurb).toHaveTextContent(/notifications you have turned on/i)
    expect(blurb).toHaveTextContent(/never used to market anything/i)
  })

  it('asks before removing, and does nothing if you keep it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmailAddressCard />)

    await user.click(await screen.findByRole('button', { name: /remove this address/i }))
    await user.click(await screen.findByRole('button', { name: /keep it/i }))

    expect(mockRemove).not.toHaveBeenCalled()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('removes the address when confirmed', async () => {
    const user = userEvent.setup()
    mockRemove.mockResolvedValue({ address: '', captured_at: '', enabled: true, declined: true })
    renderWithProviders(<EmailAddressCard />)

    await user.click(await screen.findByRole('button', { name: /remove this address/i }))
    await user.click(await screen.findByRole('button', { name: /^remove it$/i }))

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1))
    // And it says the removal sticks, which is the thing somebody is really
    // asking when they press the button.
    expect(await screen.findByText(/signing in again will not bring it back/i)).toBeInTheDocument()
  })

  it('offers a way back after a removal', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ address: '', captured_at: '', enabled: true, declined: true })
    mockUpdate.mockResolvedValue({ address: '', captured_at: '', enabled: true, declined: false })
    renderWithProviders(<EmailAddressCard />)

    await user.click(await screen.findByRole('button', { name: /store it again/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ allow: true }))
  })

  it('the master switch says in-app keeps working', async () => {
    renderWithProviders(<EmailAddressCard />)
    expect(await screen.findByText(/no email at all/i)).toHaveTextContent(/keep arriving in the app/i)
  })

  it('turning the master switch off sends enabled:false', async () => {
    const user = userEvent.setup()
    mockUpdate.mockResolvedValue({ ...HELD, enabled: false })
    const { container } = renderWithProviders(<EmailAddressCard />)
    await waitFor(() => expect(mockGet).toHaveBeenCalled())

    const toggle = container.querySelector('button.rounded-full') as HTMLButtonElement
    await user.click(toggle)

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ enabled: false }))
  })

  it('tells somebody with no address what will happen at their next sign-in', async () => {
    mockGet.mockResolvedValue({ address: '', captured_at: '', enabled: true, declined: false })
    renderWithProviders(<EmailAddressCard />)
    expect(await screen.findByText(/next time you sign in with GitHub/i)).toBeInTheDocument()
  })

  it('does not crash when the address cannot be loaded', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    const { container } = renderWithProviders(<EmailAddressCard />)
    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    expect(container).toBeTruthy()
  })
})
