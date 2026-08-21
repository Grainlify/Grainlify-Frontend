import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { PayoutContactField } from './PayoutContactField'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getPayoutContact: (...a: unknown[]) => mockGet(...a),
  setPayoutContact: (...a: unknown[]) => mockSet(...a),
}))

beforeEach(() => vi.resetAllMocks())

describe('PayoutContactField', () => {
  // The bar you set: declining changes nothing, asserted rather than read
  // through. This lands on the screen every founding contributor is about to
  // use for the first time, and "optional" is the property that degrades
  // quietly.
  it('declining writes nothing and never asks again', async () => {
    mockGet.mockResolvedValue({ email: '' })
    renderWithProviders(<PayoutContactField />)

    await screen.findByLabelText(/How should we contact you about payouts/i)

    // Save is unavailable with nothing typed, so declining is the default state
    // rather than something that has to be dismissed.
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
    // No Remove button when there is nothing to remove - a control implying we
    // hold something we do not.
    expect(screen.queryByRole('button', { name: /Remove/i })).toBeNull()
    // And nothing was written just by looking at the screen.
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('marks itself optional in the label, not only in the prose', async () => {
    mockGet.mockResolvedValue({ email: '' })
    renderWithProviders(<PayoutContactField />)

    const label = await screen.findByText(/How should we contact you about payouts/i)
    expect(label.textContent).toMatch(/optional/i)
  })

  // The scope promise and its limit have to be on screen next to the ask. A
  // consent sentence in a policy page is not consent given here.
  it('states the use and the limit where the address is asked for', async () => {
    mockGet.mockResolvedValue({ email: '' })
    renderWithProviders(<PayoutContactField />)

    const body = await screen.findByText(/only to tell you when a payout is ready/i)
    expect(body.textContent).toMatch(/Nothing else, ever/i)
    expect(body.textContent).toMatch(/remove it at any time/i)
    expect(body.textContent).toMatch(/keeps working without it/i)
  })

  // Removal is the whole removal story for this data - there is no
  // account-deletion path behind it - so it must be present and must work.
  it('offers removal once something is stored, and clears through the same call', async () => {
    mockGet.mockResolvedValue({ email: 'someone@example.com' })
    mockSet.mockResolvedValue({ email: '' })
    renderWithProviders(<PayoutContactField />)

    const remove = await screen.findByRole('button', { name: /Remove/i })
    await userEvent.click(remove)

    expect(mockSet).toHaveBeenCalledWith('')
    // And the control disappears, because there is now nothing to remove.
    await vi.waitFor(() =>
      expect(screen.queryByRole('button', { name: /Remove/i })).toBeNull(),
    )
  })

  // A failed read is not "they declined". Showing the empty prompt would invite
  // re-entering an address we already hold, and the screen would be wrong about
  // what we have.
  it('does not present as empty when the read fails', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    renderWithProviders(<PayoutContactField />)

    expect(await screen.findByText(/Couldn't check whether we have a contact address/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save$/ })).toBeNull()
  })
})
