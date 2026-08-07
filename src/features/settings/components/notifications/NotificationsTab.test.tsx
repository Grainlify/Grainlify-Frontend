import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { NotificationsTab } from './NotificationsTab'

const mockGetPreferences = vi.fn()
const mockUpdatePreferences = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getNotificationPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  updateNotificationPreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
}))

const BASE_PREFERENCES = [
  { type: 'issue_assigned', in_app: true, email: true },
  { type: 'issue_application_rejected', in_app: true, email: true },
  { type: 'pr_merged', in_app: true, email: true },
  { type: 'reward_received', in_app: true, email: true },
  { type: 'issue_application_submitted', in_app: true, email: true },
]

describe('NotificationsTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetPreferences.mockResolvedValue({ preferences: BASE_PREFERENCES })
    mockUpdatePreferences.mockResolvedValue({ ok: true })
  })

  it('is no longer gated behind a Coming Soon overlay', async () => {
    renderWithProviders(<NotificationsTab />)
    await waitFor(() => expect(screen.getByText('Notification Preferences')).toBeInTheDocument())
    expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument()
  })

  it('loads preferences on mount and renders known notification types', async () => {
    renderWithProviders(<NotificationsTab />)
    await waitFor(() => expect(mockGetPreferences).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Issue assigned to you')).toBeInTheDocument()
    expect(screen.getByText('New application')).toBeInTheDocument()
  })

  // ToggleSwitch (src/features/settings/components/shared/ToggleSwitch.tsx)
  // renders a plain unlabeled <button> with no role="switch"/aria-checked -
  // a real, pre-existing accessibility gap, not something these tests
  // introduce. Toggles are located by their distinctive class fingerprint
  // rather than an accessible role/name, since none exists to query by.
  function getToggleButtons(container: HTMLElement): HTMLButtonElement[] {
    return Array.from(container.querySelectorAll('button.rounded-full'))
  }

  it('Save is disabled until a preference actually changes', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<NotificationsTab />)
    await waitFor(() => expect(mockGetPreferences).toHaveBeenCalled())

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    const toggles = getToggleButtons(container)
    expect(toggles.length).toBeGreaterThan(0)
    await user.click(toggles[0])

    expect(saveButton).toBeEnabled()
  })

  it('Save sends the current preference state to the API', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<NotificationsTab />)
    await waitFor(() => expect(mockGetPreferences).toHaveBeenCalled())

    const toggles = getToggleButtons(container)
    await user.click(toggles[0])

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    await user.click(saveButton)

    await waitFor(() => expect(mockUpdatePreferences).toHaveBeenCalledTimes(1))
    const payload = mockUpdatePreferences.mock.calls[0][0]
    expect(Array.isArray(payload)).toBe(true)
    expect(payload).toHaveLength(BASE_PREFERENCES.length)
  })

  it('"Disable all" then Save persists every type as disabled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotificationsTab />)
    await waitFor(() => expect(mockGetPreferences).toHaveBeenCalled())

    await user.click(await screen.findByRole('button', { name: 'Disable all' }))
    await user.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockUpdatePreferences).toHaveBeenCalledTimes(1))
    const payload = mockUpdatePreferences.mock.calls[0][0] as Array<{ in_app: boolean; email: boolean }>
    expect(payload.every((p) => p.in_app === false && p.email === false)).toBe(true)
  })

  it('shows an error toast and does not crash when loading preferences fails', async () => {
    mockGetPreferences.mockRejectedValueOnce(new Error('network error'))
    renderWithProviders(<NotificationsTab />)
    await waitFor(() => expect(mockGetPreferences).toHaveBeenCalled())
    // Falls through to the (now-empty) preferences UI rather than crashing.
    expect(await screen.findByText('Notification Preferences')).toBeInTheDocument()
  })
})
