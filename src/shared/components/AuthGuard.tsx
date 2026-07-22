import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export interface AuthGuardProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Prevents protected content from mounting until authentication is resolved.
 *
 * While authentication is loading, only the fallback is mounted. Authenticated
 * users receive the protected children, and unauthenticated users are sent to
 * sign in with their current URL preserved in the `returnTo` query parameter.
 */
export function AuthGuard({
  children,
  loadingFallback = <AuthLoadingFallback />,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/signin?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}

/** Accessible full-page fallback displayed while authentication is checked. */
export function AuthLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#1a1512]"
      role="status"
      aria-live="polite"
      aria-label="Checking authentication"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#c9983a]" />
      <span className="sr-only">Checking authentication</span>
    </div>
  );
}
