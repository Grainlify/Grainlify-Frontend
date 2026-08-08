import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { RewardsTab } from './RewardsTab'

const mockGetPointsBalance = vi.fn()
const mockGetSocialFollowStatus = vi.fn()
const mockSubmitSocialFollowProof = vi.fn()

vi.mock('../../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../../shared/api/client')>('../../../../shared/api/client')
  return {
    ...actual,
    getPointsBalance: (...args: unknown[]) => mockGetPointsBalance(...args),
    getSocialFollowStatus: (...args: unknown[]) => mockGetSocialFollowStatus(...args),
    submitSocialFollowProof: (...args: unknown[]) => mockSubmitSocialFollowProof(...args),
  }
})

const BASE_BALANCE = { balance: 600, usdc_per_point: 0.01, min_redemption_points: 100 }
const BASE_SOCIAL_FOLLOW = {
  platforms: [
    { platform: 'github', status: 'approved' },
    { platform: 'telegram', status: 'pending' },
    { platform: 'linkedin', status: null },
  ],
  completed: false,
  points_awarded: 0,
  points_reward: 500,
}

describe('RewardsTab', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPointsBalance.mockResolvedValue(BASE_BALANCE)
    mockGetSocialFollowStatus.mockResolvedValue(BASE_SOCIAL_FOLLOW)
    mockSubmitSocialFollowProof.mockResolvedValue({ ok: true })
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('loads and displays the points balance with its USDC equivalent', async () => {
    renderWithProviders(<RewardsTab />)
    expect(await screen.findByText('600 points')).toBeInTheDocument()
    expect(screen.getByText(/\$6\.00 USDC available/)).toBeInTheDocument()
  })

  it('the Redeem for USDC button navigates to the dedicated redeem page', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('600 points')

    await user.click(screen.getByRole('button', { name: /Redeem for USDC/i }))

    expect(window.location.href).toBe('/dashboard?tab=redeem')
  })

  it('shows per-platform social-follow status', async () => {
    renderWithProviders(<RewardsTab />)
    await waitFor(() => expect(mockGetSocialFollowStatus).toHaveBeenCalled())
    expect(await screen.findByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
  })

  it('shows the completed banner once the social-follow program is done', async () => {
    mockGetSocialFollowStatus.mockResolvedValue({ ...BASE_SOCIAL_FOLLOW, completed: true, points_awarded: 500 })
    renderWithProviders(<RewardsTab />)
    expect(await screen.findByText(/Completed - you earned 500 points/)).toBeInTheDocument()
  })

  it('uploading a screenshot submits it as a data URL for that platform', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('600 points')

    const file = new File(['fake-image-bytes'], 'proof.png', { type: 'image/png' })
    // Platforms render in SOCIAL_FOLLOW_PLATFORMS order (github, telegram,
    // linkedin); only non-approved platforms get an upload input, so with
    // github already approved the first input belongs to telegram.
    const inputs = document.querySelectorAll('input[type="file"]')
    expect(inputs.length).toBe(2)
    await user.upload(inputs[0] as HTMLInputElement, file)

    await waitFor(() => expect(mockSubmitSocialFollowProof).toHaveBeenCalledTimes(1))
    const [platform, screenshot] = mockSubmitSocialFollowProof.mock.calls[0]
    expect(platform).toBe('telegram')
    expect(screenshot).toMatch(/^data:/)
  })

  it('rejects a non-image file before calling the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('600 points')

    const badFile = new File(['not an image'], 'notes.txt', { type: 'text/plain' })
    const inputs = document.querySelectorAll('input[type="file"]')
    await user.upload(inputs[0] as HTMLInputElement, badFile)

    expect(mockSubmitSocialFollowProof).not.toHaveBeenCalled()
  })

  it('shows an error state and does not crash when loading fails', async () => {
    mockGetPointsBalance.mockRejectedValueOnce(new Error('network error'))
    renderWithProviders(<RewardsTab />)
    await waitFor(() => expect(mockGetPointsBalance).toHaveBeenCalled())
    expect(await screen.findByText(/Couldn't load your rewards info/)).toBeInTheDocument()
  })
})
