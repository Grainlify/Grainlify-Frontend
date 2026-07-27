// @vitest-pool=single
// src/features/settings/components/notifications/NotificationRow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationRow } from './NotificationRow'
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext'
import { vi } from 'vitest'
import { toast } from 'sonner'

// Mock localStorage for ThemeProvider in test environment
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
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
    const onMarkAsRead = vi.fn<[], Promise<void>>(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('API error')), 10))
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
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to mark notification as read.')
    })
    expect(row).not.toHaveClass('opacity-50')
    expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument()
  })

  test('prevents duplicate API calls on rapid double-click', async () => {
    // Use a pending promise to keep the button disabled during the async update
    const onMarkAsRead = vi.fn<[], Promise<void>>(() => new Promise(() => {})) // pending
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
