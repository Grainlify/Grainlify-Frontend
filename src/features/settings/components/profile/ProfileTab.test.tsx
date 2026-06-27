// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { ProfileTab } from './ProfileTab'

const mockGetCurrentUser = vi.fn()
const mockUpdateProfile = vi.fn()
const mockUpdateAvatar = vi.fn()
const mockResyncGitHubProfile = vi.fn()

vi.mock('../../../../shared/api/client', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  updateAvatar: (...args: unknown[]) => mockUpdateAvatar(...args),
  resyncGitHubProfile: (...args: unknown[]) => mockResyncGitHubProfile(...args),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockUser = {
  id: 'user-1',
  role: 'developer',
  first_name: 'John',
  last_name: 'Doe',
  location: 'San Francisco',
  website: 'https://example.com',
  bio: 'A developer',
  avatar_url: null,
  telegram: '@johndoe',
  linkedin: 'johndoe',
  whatsapp: '+1234567890',
  twitter: '@johndoe',
  discord: 'johndoe#1234',
  github: {
    login: 'johndoe',
    avatar_url: 'https://avatars.githubusercontent.com/u/1',
    name: 'John Doe',
    email: 'john@example.com',
    location: 'San Francisco',
    bio: 'A developer',
    website: 'https://example.com',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('ProfileTab', () => {
  it('renders heading and loads data', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    expect(screen.getByText('Profile')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
  })

  it('shows website validation error on blur', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
    })

    const websiteInput = screen.getByDisplayValue('https://example.com')
    await user.clear(websiteInput)
    await user.type(websiteInput, 'not-a-url')
    await user.tab()

    expect(await screen.findByText(/valid URL/i)).toBeInTheDocument()
  })

  it('disables submit button when form is not dirty', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('disables submit button when form is invalid', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
    })

    const websiteInput = screen.getByDisplayValue('https://example.com')
    await user.clear(websiteInput)
    await user.type(websiteInput, 'bad-url')
    await user.tab()

    expect(await screen.findByText(/valid URL/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('calls updateProfile and shows success toast on valid submit', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockUpdateProfile.mockResolvedValue(undefined)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Jane' }),
      )
    })
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!')
  })

  it('shows error toast when updateProfile fails', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockUpdateProfile.mockRejectedValue(new Error('API error'))
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to update profile. Please try again.',
      )
    })
  })

  it('keeps form save idle while the avatar upload is pending', async () => {
    const avatarSave = deferred<void>()
    mockGetCurrentUser.mockResolvedValue({
      ...mockUser,
      avatar_url: 'data:image/png;base64,new-avatar',
    })
    mockUpdateAvatar.mockReturnValue(avatarSave.promise)

    renderWithTheme(<ProfileTab />)

    const savePicture = await screen.findByRole('button', { name: 'Save Picture' })
    await userEvent.click(savePicture)

    expect(mockUpdateAvatar).toHaveBeenCalledWith('data:image/png;base64,new-avatar')
    expect(screen.getByRole('button', { name: /saving picture/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /saving picture/i })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^save$/i })).toHaveTextContent('Save')
    expect(screen.queryByRole('button', { name: /^saving\.\.\.$/i })).not.toBeInTheDocument()

    avatarSave.resolve()
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile picture updated successfully!')
    })
  })

  it('keeps avatar controls idle while the profile form save is pending', async () => {
    const user = userEvent.setup()
    const profileSave = deferred<void>()
    mockGetCurrentUser.mockResolvedValue({
      ...mockUser,
      avatar_url: 'data:image/png;base64,new-avatar',
    })
    mockUpdateProfile.mockReturnValue(profileSave.promise)

    renderWithTheme(<ProfileTab />)

    const firstNameInput = await screen.findByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(screen.getByRole('button', { name: /^saving\.\.\.$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save Picture' })).not.toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Update' })).not.toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.queryByRole('button', { name: /saving picture/i })).not.toBeInTheDocument()

    profileSave.resolve()
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!')
    })
  })
})
