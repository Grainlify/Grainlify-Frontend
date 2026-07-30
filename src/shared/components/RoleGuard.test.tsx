import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleGuard } from './RoleGuard'

// ─── mock dependencies ────────────────────────────────────────────────────────

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>
const mockUseNavigate = useNavigate as unknown as ReturnType<typeof vi.fn>
const mockNavigate = vi.fn()

// ─── helpers ──────────────────────────────────────────────────────────────────

function setRole(role: string | null) {
  mockUseAuth.mockReturnValue({ userRole: role })
}

const ProtectedContent = () => <div>protected content</div>

// ─── tests ────────────────────────────────────────────────────────────────────

describe('RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockReturnValue(mockNavigate)
  })

  describe('allowed role', () => {
    it('renders children when userRole matches a single allowed role', () => {
      setRole('admin')
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('protected content')).toBeInTheDocument()
    })

    it('renders children when userRole is one of multiple allowed roles', () => {
      setRole('maintainer')
      render(
        <RoleGuard allow={['admin', 'maintainer']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('protected content')).toBeInTheDocument()
    })
  })

  describe('disallowed role', () => {
    it('renders unauthorized state when role is not in allow list', () => {
      setRole('contributor')
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.queryByText('protected content')).not.toBeInTheDocument()
      expect(screen.getByText('Access Restricted')).toBeInTheDocument()
    })

    it('renders unauthorized state when role is maintainer and only admin is allowed', () => {
      setRole('maintainer')
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('Access Restricted')).toBeInTheDocument()
    })
  })

  describe('null role', () => {
    it('renders unauthorized state when userRole is null', () => {
      setRole(null)
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.queryByText('protected content')).not.toBeInTheDocument()
      expect(screen.getByText('Access Restricted')).toBeInTheDocument()
    })
  })

  describe('custom fallback', () => {
    it('renders custom fallback instead of default unauthorized state when access is denied', () => {
      setRole('contributor')
      render(
        <RoleGuard allow={['admin']} fallback={<div>custom fallback</div>}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('custom fallback')).toBeInTheDocument()
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument()
    })

    it('does not render custom fallback when role is allowed', () => {
      setRole('admin')
      render(
        <RoleGuard allow={['admin']} fallback={<div>custom fallback</div>}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('protected content')).toBeInTheDocument()
      expect(screen.queryByText('custom fallback')).not.toBeInTheDocument()
    })
  })

  describe('role switch updates', () => {
    it('re-renders correctly when userRole changes from disallowed to allowed', () => {
      mockUseAuth.mockReturnValue({ userRole: 'contributor' })
      const { rerender } = render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.queryByText('protected content')).not.toBeInTheDocument()

      mockUseAuth.mockReturnValue({ userRole: 'admin' })
      rerender(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('protected content')).toBeInTheDocument()
    })

    it('re-renders correctly when userRole changes from allowed to disallowed', () => {
      mockUseAuth.mockReturnValue({ userRole: 'admin' })
      const { rerender } = render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('protected content')).toBeInTheDocument()

      mockUseAuth.mockReturnValue({ userRole: 'contributor' })
      rerender(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )
      expect(screen.getByText('Access Restricted')).toBeInTheDocument()
    })
  })

  describe('"Go Back" button', () => {
    const originalState = window.history.state

    afterEach(() => {
      window.history.replaceState(originalState, '')
    })

    it('navigates back in-app when there is prior in-app history', () => {
      window.history.replaceState({ idx: 2 }, '')
      setRole('contributor')
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )

      screen.getByRole('button', { name: 'Go Back' }).click()

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('redirects to the home route instead of leaving the app when there is no in-app history', () => {
      window.history.replaceState({ idx: 0 }, '')
      setRole('contributor')
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )

      screen.getByRole('button', { name: 'Go Back' }).click()

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })

    it('redirects to the home route when history state has no idx (e.g. a deep link)', () => {
      window.history.replaceState(null, '')
      setRole('contributor')
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>
      )

      screen.getByRole('button', { name: 'Go Back' }).click()

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })
})
