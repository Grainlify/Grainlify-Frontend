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
  whatsapp: '1234567890',
  twitter: '@johndoe',
  discord: 'johndoe',
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
        expect.objectContaining({ first_name: 'Jane' })
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
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile. Please try again.')
    })
  })

  it('shows error messages for fields exceeding max length', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'a'.repeat(51))
    await user.tab()

    expect(await screen.findByText(/First name must be 50 characters or less/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('shows a dedicated avatar-upload pending state without affecting the form Save button', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    // Keep the avatar upload in flight so we can observe the pending state.
    let resolveAvatar: () => void = () => {}
    mockUpdateAvatar.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAvatar = resolve
        })
    )

    const { container } = renderWithTheme(<ProfileTab />)
    await waitFor(() => expect(screen.getByDisplayValue('John')).toBeInTheDocument())

    // Upload a file; the FileReader produces a base64 data URL distinct from the
    // GitHub avatar, which reveals the "Save Picture" button.
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    await user.upload(fileInput, file)

    const savePicture = await screen.findByRole('button', { name: /save picture/i })
    await user.click(savePicture)

    // The avatar control shows its own pending state...
    const uploading = await screen.findByRole('button', { name: /uploading/i })
    expect(uploading).toHaveAttribute('aria-busy', 'true')
    expect(uploading).toBeDisabled()

    // ...while the form Save button still reflects only form-save progress.
    const formSave = screen.getByRole('button', { name: /^save$/i })
    expect(formSave).toHaveTextContent(/^Save$/)
    expect(formSave).not.toHaveAttribute('aria-busy', 'true')

    resolveAvatar()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('opens the GitHub settings page with noopener,noreferrer', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => expect(screen.getByDisplayValue('John')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    expect(openSpy).toHaveBeenCalledWith(
      'https://github.com/settings/profile',
      '_blank',
      'noopener,noreferrer'
    )

    openSpy.mockRestore()
  })

  it('shows toast.error for invalid file type instead of alert()', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    const { container } = renderWithTheme(<ProfileTab />)

    await waitFor(() => expect(screen.getByDisplayValue('John')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    // Use fireEvent.change to ensure the file type is set correctly
    const { fireEvent } = await import('@testing-library/react')
    const invalidFile = new File(['not-an-image'], 'test.bin', { type: 'application/octet-stream' })
    await fireEvent.change(fileInput, { target: { files: [invalidFile] } })

    expect(toast.error).toHaveBeenCalledWith(
      'Please select a valid image file (SVG, PNG, JPG, or GIF)'
    )
  })

  it('shows toast.error for oversized file instead of alert()', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    const { container } = renderWithTheme(<ProfileTab />)

    await waitFor(() => expect(screen.getByDisplayValue('John')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    // Create a file larger than 5MB
    const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    })
    await user.upload(fileInput, oversizedFile)

    expect(toast.error).toHaveBeenCalledWith('File size must be less than 5MB')
  })

  it('resets file input value after validation failure so the same file can be re-selected', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    const { container } = renderWithTheme(<ProfileTab />)

    await waitFor(() => expect(screen.getByDisplayValue('John')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    // Upload an invalid file type
    const invalidFile = new File(['bad'], 'test.txt', { type: 'text/plain' })
    await user.upload(fileInput, invalidFile)

    // After rejection, the input value should be reset so the same file can be re-selected
    expect(fileInput.value).toBe('')
  })

  it('does not call window.alert for any validation error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    const { container } = renderWithTheme(<ProfileTab />)

    await waitFor(() => expect(screen.getByDisplayValue('John')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    // Test invalid file type
    const invalidFile = new File(['bad'], 'test.txt', { type: 'text/plain' })
    await user.upload(fileInput, invalidFile)
    expect(alertSpy).not.toHaveBeenCalled()

    // Test oversized file
    const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    })
    await user.upload(fileInput, oversizedFile)
    expect(alertSpy).not.toHaveBeenCalled()

    alertSpy.mockRestore()
  })
})
