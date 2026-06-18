import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from './RoleGuard';

// ─── mock dependencies ────────────────────────────────────────────────────────

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

import { useAuth } from '../contexts/AuthContext';

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

// ─── helpers ──────────────────────────────────────────────────────────────────

function setRole(role: string | null) {
  mockUseAuth.mockReturnValue({ userRole: role });
}

const ProtectedContent = () => <div>protected content</div>;

// ─── tests ────────────────────────────────────────────────────────────────────

describe('RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('allowed role', () => {
    it('renders children when userRole matches a single allowed role', () => {
      setRole('admin');
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('protected content')).toBeInTheDocument();
    });

    it('renders children when userRole is one of multiple allowed roles', () => {
      setRole('maintainer');
      render(
        <RoleGuard allow={['admin', 'maintainer']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('protected content')).toBeInTheDocument();
    });
  });

  describe('disallowed role', () => {
    it('renders unauthorized state when role is not in allow list', () => {
      setRole('contributor');
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.queryByText('protected content')).not.toBeInTheDocument();
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    it('renders unauthorized state when role is maintainer and only admin is allowed', () => {
      setRole('maintainer');
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
  });

  describe('null role', () => {
    it('renders unauthorized state when userRole is null', () => {
      setRole(null);
      render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.queryByText('protected content')).not.toBeInTheDocument();
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback instead of default unauthorized state when access is denied', () => {
      setRole('contributor');
      render(
        <RoleGuard allow={['admin']} fallback={<div>custom fallback</div>}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('custom fallback')).toBeInTheDocument();
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
    });

    it('does not render custom fallback when role is allowed', () => {
      setRole('admin');
      render(
        <RoleGuard allow={['admin']} fallback={<div>custom fallback</div>}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('protected content')).toBeInTheDocument();
      expect(screen.queryByText('custom fallback')).not.toBeInTheDocument();
    });
  });

  describe('role switch updates', () => {
    it('re-renders correctly when userRole changes from disallowed to allowed', () => {
      mockUseAuth.mockReturnValue({ userRole: 'contributor' });
      const { rerender } = render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.queryByText('protected content')).not.toBeInTheDocument();

      mockUseAuth.mockReturnValue({ userRole: 'admin' });
      rerender(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('protected content')).toBeInTheDocument();
    });

    it('re-renders correctly when userRole changes from allowed to disallowed', () => {
      mockUseAuth.mockReturnValue({ userRole: 'admin' });
      const { rerender } = render(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('protected content')).toBeInTheDocument();

      mockUseAuth.mockReturnValue({ userRole: 'contributor' });
      rerender(
        <RoleGuard allow={['admin']}>
          <ProtectedContent />
        </RoleGuard>,
      );
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
  });
});
