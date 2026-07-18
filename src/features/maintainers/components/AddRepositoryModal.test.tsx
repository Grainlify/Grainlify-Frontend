// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { AddRepositoryModal } from './AddRepositoryModal'

const mockCreateProject = vi.fn()
const mockGetEcosystems = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  getEcosystems: (...args: unknown[]) => mockGetEcosystems(...args),
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetEcosystems.mockResolvedValue({
    ecosystems: [
      { name: 'Ethereum', slug: 'ethereum' },
      { name: 'Starknet', slug: 'starknet' },
    ],
  })
})

describe('AddRepositoryModal', () => {
  it('renders when isOpen is true', async () => {
    renderWithTheme(<AddRepositoryModal {...defaultProps} />)
    expect(screen.getByText('Add a Repository')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
    })
  })

  it('does not render when isOpen is false', () => {
    renderWithTheme(<AddRepositoryModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Add a Repository')).not.toBeInTheDocument()
  })

  it('shows repo name required error on mount with empty fields', async () => {
    renderWithTheme(<AddRepositoryModal {...defaultProps} />)

    expect(await screen.findByText('Repository name is required')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add repository/i })).toBeDisabled()
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('shows repo name format error for missing slash', async () => {
    const user = userEvent.setup()
    renderWithTheme(<AddRepositoryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
    })

    await user.clear(screen.getByPlaceholderText(/owner\/repo/i))
    await user.type(screen.getByPlaceholderText(/owner\/repo/i), 'invalidname')

    expect(await screen.findByText('Repository name must be in format: owner/repo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add repository/i })).toBeDisabled()
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('calls createProject on valid submit', async () => {
    mockCreateProject.mockResolvedValue({ id: '1' })
    const user = userEvent.setup()
    renderWithTheme(<AddRepositoryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/owner\/repo/i), 'facebook/react')
    await user.selectOptions(screen.getByRole('combobox'), 'Ethereum')
    await user.click(screen.getByRole('button', { name: /add repository/i }))

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        github_full_name: 'facebook/react',
        ecosystem_name: 'Ethereum',
        language: undefined,
        tags: undefined,
        category: undefined,
      })
    })
  })

  it('disables submit button while submitting', async () => {
    mockCreateProject.mockImplementation(() => new Promise(() => {})) // never resolves
    const user = userEvent.setup()
    renderWithTheme(<AddRepositoryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/owner\/repo/i), 'facebook/react')
    await user.selectOptions(screen.getByRole('combobox'), 'Ethereum')
    await user.click(screen.getByRole('button', { name: /add repository/i }))

    expect(await screen.findByText('Adding...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
  })

  it('shows success message and calls onSuccess after valid submit', async () => {
    mockCreateProject.mockResolvedValue({ id: '1' })
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderWithTheme(
      <AddRepositoryModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />,
    )
    await waitFor(() => {
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/owner\/repo/i), 'facebook/react')
    await user.selectOptions(screen.getByRole('combobox'), 'Ethereum')
    await user.click(screen.getByRole('button', { name: /add repository/i }))

    await waitFor(() => {
      expect(screen.getByText('Repository added successfully!')).toBeInTheDocument()
    })

    // After 1.5s the modal should close
    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
      },
      { timeout: 2000 },
    )
  })
})
