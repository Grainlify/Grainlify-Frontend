import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { RedeemPage } from './RedeemPage'

const mockGetPointsBalance = vi.fn()
const mockGetMyRedemptions = vi.fn()
const mockCreateRedemption = vi.fn()

vi.mock('../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/api/client')>('../../../shared/api/client')
  return {
    ...actual,
    getPointsBalance: (...args: unknown[]) => mockGetPointsBalance(...args),
    getMyRedemptions: (...args: unknown[]) => mockGetMyRedemptions(...args),
    createRedemption: (...args: unknown[]) => mockCreateRedemption(...args),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const BASE_BALANCE = { balance: 600, usdc_per_point: 0.01, min_redemption_points: 100 }
// A real, well-formed Stellar Ed25519 public key shape (G + 55 base32 chars)
// so the client-side format check passes without needing real strkey checksum
// validation, which only the backend performs.
const VALID_WALLET = 'G' + 'A'.repeat(55)

async function fillValidForm(user: ReturnType<typeof userEvent.setup>, points = '300') {
  await user.type(screen.getByLabelText('Points to redeem'), points)
  await user.type(screen.getByLabelText('Stellar wallet address'), VALID_WALLET)
}

describe('RedeemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPointsBalance.mockResolvedValue(BASE_BALANCE)
    mockGetMyRedemptions.mockResolvedValue({ redemptions: [] })
    mockCreateRedemption.mockResolvedValue({ id: 'redemption-1', usdc_amount: 3 })
  })

  it('loads and displays the current balance', async () => {
    renderWithProviders(<RedeemPage />)
    expect(await screen.findByText('600', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows the USDC equivalent updating live as points are entered', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    await screen.findByLabelText('Points to redeem')

    await user.type(screen.getByLabelText('Points to redeem'), '250')

    expect(await screen.findByText('2.50')).toBeInTheDocument()
  })

  it('only accepts digits in the points field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    const input = await screen.findByLabelText('Points to redeem')

    await user.type(input, '12a3b')

    expect(input).toHaveValue('123')
  })

  it('Max fills the input with the full balance', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    await screen.findByLabelText('Points to redeem')

    await user.click(screen.getByRole('button', { name: 'Max' }))

    expect(screen.getByLabelText('Points to redeem')).toHaveValue('600')
  })

  it('the CTA walks through each validation state in priority order', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    const pointsInput = await screen.findByLabelText('Points to redeem')
    const walletInput = screen.getByLabelText('Stellar wallet address')

    // 1. no amount yet
    expect(screen.getByRole('button', { name: 'Enter an amount' })).toBeDisabled()

    // 2. below the minimum
    await user.type(pointsInput, '50')
    expect(screen.getByRole('button', { name: /Minimum 100 points/ })).toBeDisabled()

    // 3. above the balance
    await user.clear(pointsInput)
    await user.type(pointsInput, '9999')
    expect(screen.getByRole('button', { name: 'Insufficient points' })).toBeDisabled()

    // 4. valid amount, no wallet yet
    await user.clear(pointsInput)
    await user.type(pointsInput, '300')
    expect(screen.getByRole('button', { name: /Enter your Stellar wallet address/ })).toBeDisabled()

    // 5. malformed wallet
    await user.type(walletInput, 'not-a-wallet')
    expect(screen.getByRole('button', { name: /Enter a valid Stellar address/ })).toBeDisabled()

    // 6. fully valid
    await user.clear(walletInput)
    await user.type(walletInput, VALID_WALLET)
    expect(screen.getByRole('button', { name: 'Redeem' })).toBeEnabled()
  })

  it('submitting a valid redemption calls createRedemption and refreshes the balance', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    await screen.findByLabelText('Points to redeem')

    await fillValidForm(user)
    mockGetPointsBalance.mockResolvedValue({ ...BASE_BALANCE, balance: 300 })
    await user.click(screen.getByRole('button', { name: 'Redeem' }))

    await waitFor(() => expect(mockCreateRedemption).toHaveBeenCalledWith(300, VALID_WALLET))
    // Inputs clear and the balance card reflects the post-redemption total.
    await waitFor(() => expect(screen.getByLabelText('Points to redeem')).toHaveValue(''))
    expect(await screen.findByText('300', { selector: 'span' })).toBeInTheDocument()
  })

  it('renders redemption history with the right status badge per entry', async () => {
    mockGetMyRedemptions.mockResolvedValue({
      redemptions: [
        { id: 'r1', points_spent: 100, usdc_amount: '1.00', stellar_wallet_address: VALID_WALLET, status: 'paid', created_at: '2026-01-01T00:00:00Z' },
        { id: 'r2', points_spent: 200, usdc_amount: '2.00', stellar_wallet_address: VALID_WALLET, status: 'pending', created_at: '2026-01-02T00:00:00Z' },
        { id: 'r3', points_spent: 150, usdc_amount: '1.50', stellar_wallet_address: VALID_WALLET, status: 'rejected', created_at: '2026-01-03T00:00:00Z' },
      ],
    })
    renderWithProviders(<RedeemPage />)

    expect(await screen.findByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText(/100 pts → \$1\.00 USDC/)).toBeInTheDocument()
  })

  it('shows a toast and does not crash when the redemption request fails', async () => {
    const { toast } = await import('sonner')
    mockCreateRedemption.mockRejectedValue(new Error('wallet address rejected'))
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    await screen.findByLabelText('Points to redeem')

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Redeem' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('wallet address rejected'))
    // Amount is preserved so the user can retry rather than re-typing everything.
    expect(screen.getByLabelText('Points to redeem')).toHaveValue('300')
  })
})
