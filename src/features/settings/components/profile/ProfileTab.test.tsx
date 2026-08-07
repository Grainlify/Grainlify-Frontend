import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
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

vi.mock('lucide-react', () => ({
  Github: () => null,
  User: () => null,
  Upload: () => null,
  Link: () => null,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const BASE_USER = {
  id: 'user-1',
  role: 'contributor',
  first_name: 'Jane',
  last_name: 'Doe',
  location: 'NYC',
  website: 'https://jane.dev',
  bio: 'Building things',
  avatar_url: 'https://cdn.example/jane.png',
  telegram: 'janetg',
  linkedin: 'janeli',
  whatsapp: 'janewa',
  twitter: 'janetw',
  discord: 'janedi',
  github: {
    login: 'janedoe',
    avatar_url: 'https://gh.example/janedoe.png',
    email: 'jane@example.com',
  },
}

describe('ProfileTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetCurrentUser.mockResolvedValue(BASE_USER)
    mockUpdateProfile.mockResolvedValue({ message: 'ok' })
  })

  it('loads current user data on mount into the form fields', async () => {
    renderWithProviders(<ProfileTab />)
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1))

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('NYC')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://jane.dev')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Building things')).toBeInTheDocument()
    expect(screen.getByDisplayValue('janetg')).toBeInTheDocument()
    expect(screen.getByDisplayValue('janeli')).toBeInTheDocument()
    expect(screen.getByDisplayValue('janewa')).toBeInTheDocument()
    expect(screen.getByDisplayValue('janetw')).toBeInTheDocument()
    expect(screen.getByDisplayValue('janedi')).toBeInTheDocument()
    expect(screen.getByText('janedoe / jane@example.com')).toBeInTheDocument()
  })

  it('Save is disabled until a field actually changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProfileTab />)
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalled())

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    const firstNameInput = await screen.findByPlaceholderText('Enter your first name')
    await waitFor(() => expect(firstNameInput).toHaveValue('Jane'))

    await user.type(firstNameInput, 'X')
    expect(saveButton).toBeEnabled()
  })

  it('Save sends the edited fields to updateProfile and shows a success toast', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProfileTab />)
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalled())

    const firstNameInput = await screen.findByPlaceholderText('Enter your first name')
    await waitFor(() => expect(firstNameInput).toHaveValue('Jane'))
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Janet')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1))
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Janet',
        last_name: 'Doe',
        location: 'NYC',
        website: 'https://jane.dev',
        bio: 'Building things',
        telegram: 'janetg',
        linkedin: 'janeli',
        whatsapp: 'janewa',
        twitter: 'janetw',
        discord: 'janedi',
      })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('a failed save shows an error toast and does not lose the edits', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('network error'))
    const user = userEvent.setup()
    renderWithProviders(<ProfileTab />)
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalled())

    const firstNameInput = await screen.findByPlaceholderText('Enter your first name')
    await waitFor(() => expect(firstNameInput).toHaveValue('Jane'))
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Janet')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(firstNameInput).toHaveValue('Janet')
  })

  it('Resync calls resyncGitHubProfile and shows a success toast', async () => {
    mockResyncGitHubProfile.mockResolvedValue({
      github: {
        login: 'janedoe',
        avatar_url: 'https://gh.example/janedoe2.png',
        email: 'jane2@example.com',
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<ProfileTab />)
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalled())
    await screen.findByText('janedoe / jane@example.com')

    await user.click(screen.getByRole('button', { name: 'Resync' }))

    await waitFor(() => expect(mockResyncGitHubProfile).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('shows an error toast and does not crash when the initial fetch fails', async () => {
    mockGetCurrentUser.mockReset()
    mockGetCurrentUser.mockRejectedValueOnce(new Error('network error'))
    renderWithProviders(<ProfileTab />)
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalled())
    await waitFor(() => expect(toast.error).toHaveBeenCalled())

    expect(await screen.findByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Not connected / Not connected')).toBeInTheDocument()
  })
})
