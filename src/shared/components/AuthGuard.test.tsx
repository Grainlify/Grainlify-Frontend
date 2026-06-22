import { useEffect, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './AuthGuard';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

function SignInLocation() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

function renderGuard(child: ReactNode, initialEntry = '/dashboard/discover?tab=open') {
  const createTree = () => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard/*" element={<AuthGuard>{child}</AuthGuard>} />
        <Route path="/signin" element={<SignInLocation />} />
      </Routes>
    </MemoryRouter>
  );
  const result = render(createTree());

  return {
    ...result,
    rerenderGuard: () => result.rerender(createTree()),
  };
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not mount children until loading resolves as authenticated', () => {
    const protectedEffect = vi.fn();
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    } as ReturnType<typeof useAuth>);

    function ProtectedContent() {
      useEffect(protectedEffect, []);
      return <div>Protected dashboard</div>;
    }

    const { rerenderGuard } = renderGuard(<ProtectedContent />);

    expect(screen.getByRole('status', { name: 'Checking authentication' })).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
    expect(protectedEffect).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    } as ReturnType<typeof useAuth>);
    rerenderGuard();

    expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
    expect(protectedEffect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('redirects after loading resolves as unauthenticated without ever mounting children', () => {
    const protectedEffect = vi.fn();
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    } as ReturnType<typeof useAuth>);

    function ProtectedContent() {
      useEffect(protectedEffect, []);
      return <div>Protected dashboard</div>;
    }

    const { rerenderGuard } = renderGuard(<ProtectedContent />);

    expect(screen.getByRole('status', { name: 'Checking authentication' })).toBeInTheDocument();
    expect(protectedEffect).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    } as ReturnType<typeof useAuth>);
    rerenderGuard();

    expect(
      screen.getByText('/signin?returnTo=%2Fdashboard%2Fdiscover%3Ftab%3Dopen'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
    expect(protectedEffect).not.toHaveBeenCalled();
  });

  it('supports a reusable custom loading fallback', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <AuthGuard loadingFallback={<div>Custom loading state</div>}>
          <div>Protected dashboard</div>
        </AuthGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('Custom loading state')).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });
});
