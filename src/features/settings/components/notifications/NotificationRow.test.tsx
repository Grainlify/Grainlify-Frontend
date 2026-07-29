// @vitest-pool=single
// src/features/settings/components/notifications/NotificationRow.test.tsx
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationRow } from './NotificationRow'
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext'
import { vi } from 'vitest'
import { toast } from 'sonner'

// Note: localStorage (used by ThemeProvider) is already mocked globally in
// src/test/setup.ts. A prior local override here replaced it with a
// partial stub (no `clear`) via a non-configurable `Object.defineProperty`,
// which permanently broke the shared afterEach cleanup for the rest of this
// file's test run.
vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

describe('NotificationRow optimistic mark-as-read', () => {
  const ThemeWrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  )

  const baseProps = {
    title: 'Test Notification',
    description: 'Description',
    emailEnabled: false,
    weeklyEnabled: false,
    onEmailChange: vi.fn(),
    onWeeklyChange: vi.fn(),
    read: false,
    showBorder: false,
  }

  test('optimistically updates UI on click', async () => {
    const onMarkAsRead = vi.fn(() => Promise.resolve()) // resolves immediately
    render(
      <ThemeWrapper>
        <NotificationRow {...baseProps} onMarkAsRead={onMarkAsRead} />
      </ThemeWrapper>
    )

    const button = screen.getByRole('button', { name: /mark as read/i })
    expect(button).toBeInTheDocument()
    await userEvent.click(button)
    // Row should have opacity-50 class
    const row = screen.getByTestId('notification-row')
    expect(row).toHaveClass('opacity-50')
    expect(onMarkAsRead).toHaveBeenCalledTimes(1)
  })

  test('rolls back UI and shows error on API failure', async () => {
    let rejectRequest!: (reason?: unknown) => void
    const onMarkAsRead = vi.fn<() => Promise<void>>(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        })
    )
    render(
      <ThemeWrapper>
        <NotificationRow {...baseProps} onMarkAsRead={onMarkAsRead} />
      </ThemeWrapper>
    )

    const button = screen.getByRole('button', { name: /mark as read/i })
    await userEvent.click(button)
    const row = screen.getByTestId('notification-row')
    expect(row).toHaveClass('opacity-50')

    await act(async () => {
      rejectRequest(new Error('API error'))
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to mark notification as read.')
    })
    expect(row).not.toHaveClass('opacity-50')
    expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument()
  })

  test('prevents duplicate API calls on rapid double-click', async () => {
    // Use a pending promise to keep the button disabled during the async update
    const onMarkAsRead = vi.fn<() => Promise<void>>(() => new Promise(() => {})) // pending
    render(
      <ThemeWrapper>
        <NotificationRow {...baseProps} onMarkAsRead={onMarkAsRead} />
      </ThemeWrapper>
    )

    const button = screen.getByRole('button', { name: /mark as read/i })
    // Click twice quickly
    fireEvent.click(button)
    fireEvent.click(button)
    // Button should become disabled after first click
    await waitFor(() => expect(button).toBeDisabled())
    expect(onMarkAsRead).toHaveBeenCalledTimes(1)
  })
})
