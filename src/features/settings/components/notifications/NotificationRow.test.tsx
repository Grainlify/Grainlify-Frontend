// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { NotificationRow } from './NotificationRow'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('NotificationRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title and description', () => {
    renderWithTheme(
      <NotificationRow
        title="Test Notification"
        description="This is a test notification"
        emailEnabled={false}
        weeklyEnabled={false}
        onEmailChange={async () => true}
        onWeeklyChange={async () => true}
      />,
    )

    expect(screen.getByText('Test Notification')).toBeInTheDocument()
    expect(screen.getByText('This is a test notification')).toBeInTheDocument()
  })

  it('calls onEmailChange and disables the toggle while pending', async () => {
    const onEmailChange = vi.fn(async () => true)
    renderWithTheme(
      <NotificationRow
        title="Test Notification"
        description="This is a test notification"
        emailEnabled={false}
        weeklyEnabled={false}
        onEmailChange={onEmailChange}
        onWeeklyChange={async () => true}
      />,
    )

    const emailToggle = screen.getByLabelText('Email notification preference for Test Notification')
    fireEvent.click(emailToggle)

    expect(emailToggle).toBeDisabled()
    await waitFor(() => {
      expect(onEmailChange).toHaveBeenCalledWith(true)
      expect(emailToggle).not.toBeDisabled()
    })
  })

  it('calls onWeeklyChange and disables the toggle while pending', async () => {
    const onWeeklyChange = vi.fn(async () => true)
    renderWithTheme(
      <NotificationRow
        title="Test Notification"
        description="This is a test notification"
        emailEnabled={false}
        weeklyEnabled={false}
        onEmailChange={async () => true}
        onWeeklyChange={onWeeklyChange}
      />,
    )

    const weeklyToggle = screen.getByLabelText('Weekly digest notification preference for Test Notification')
    fireEvent.click(weeklyToggle)

    expect(weeklyToggle).toBeDisabled()
    await waitFor(() => {
      expect(onWeeklyChange).toHaveBeenCalledWith(true)
      expect(weeklyToggle).not.toBeDisabled()
    })
  })

  it('shows an error toast on email change failure', async () => {
    const onEmailChange = vi.fn(async () => false)
    renderWithTheme(
      <NotificationRow
        title="Test Notification"
        description="This is a test notification"
        emailEnabled={false}
        weeklyEnabled={false}
        onEmailChange={onEmailChange}
        onWeeklyChange={async () => true}
      />,
    )

    const emailToggle = screen.getByLabelText('Email notification preference for Test Notification')
    fireEvent.click(emailToggle)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update Test Notification email preference.')
    })
  })

  it('shows an error toast on weekly change failure', async () => {
    const onWeeklyChange = vi.fn(async () => false)
    renderWithTheme(
      <NotificationRow
        title="Test Notification"
        description="This is a test notification"
        emailEnabled={false}
        weeklyEnabled={false}
        onEmailChange={async () => true}
        onWeeklyChange={onWeeklyChange}
      />,
    )

    const weeklyToggle = screen.getByLabelText('Weekly digest notification preference for Test Notification')
    fireEvent.click(weeklyToggle)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update Test Notification weekly preference.')
    })
  })
})
