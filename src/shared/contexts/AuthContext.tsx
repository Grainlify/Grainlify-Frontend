import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getCurrentUser, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';
import { logger } from '../utils/logger';

/**
 * Public routes that should never trigger a redirect-to-signin on 401.
 * Matches exact pathnames to prevent false positives (e.g. `/signup-confirm`
 * should not be listed here even though it starts with `/signup`).
 */
const PUBLIC_ROUTES = new Set(['/', '/signin', '/signup', '/auth/callback']);

export type UserRole = 'contributor' | 'maintainer' | 'admin' | null;

export interface User {
  id: string;
  role: string;
  github?: {
    login: string;
    avatar_url: string;
    name?: string;
    email?: string;
    location?: string;
    bio?: string;
    website?: string;
  };
}

interface AuthContextType {
  userRole: UserRole;
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * Guards against concurrent 401 events triggering multiple simultaneous
   * navigations. The ref is reset after the redirect completes.
   */
  const isRedirectingRef = useRef(false);

  const checkAuth = async () => {
    const token = getAuthToken();
    logger.debug('AuthContext - Checking authentication on mount');
    logger.debug('AuthContext - Token found:', token ? 'Yes' : 'No');

    if (token) {
      try {
        logger.debug('AuthContext - Fetching user profile...');
        const userData = await getCurrentUser();
        logger.debug('AuthContext - User profile received for ID:', userData.id);
        setUser(userData);
        setUserRole(userData.role as UserRole);
        setUserId(userData.id);
        logger.info('AuthContext - User authenticated', {
          role: userData.role,
          id: userData.id
        });
      } catch (error) {
        // Token is invalid, remove it
        logger.error('AuthContext - Auth check failed:', error instanceof Error ? error.message : error);
        removeAuthToken();
        setUser(null);
        setUserRole(null);
        setUserId(null);
      }
    } else {
      logger.debug('AuthContext - No token found, user not authenticated');
      setUser(null);
      setUserRole(null);
      setUserId(null);
    }
    setIsLoading(false);
    logger.debug('AuthContext - Loading complete');
  };

  // Check for existing token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Keep auth state in sync when token changes (logout in same tab, 401s, etc).
  useEffect(() => {
    const onTokenEvent = (e: Event) => {
      const ce = e as CustomEvent<{ token: string | null }>;
      const token = ce.detail?.token ?? null;
      if (!token) {
        setUser(null);
        setUserRole(null);
        setUserId(null);
        return;
      }
      // Token was set/changed: refresh user.
      checkAuth();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'patchwork_jwt') return;
      if (!e.newValue) {
        setUser(null);
        setUserRole(null);
        setUserId(null);
        return;
      }
      checkAuth();
    };

    window.addEventListener('patchwork-auth-token', onTokenEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('patchwork-auth-token', onTokenEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  /**
   * Centralized 401 redirect handler.
   *
   * Listens for the `patchwork-auth-401` CustomEvent emitted by `client.ts`
   * whenever an API response returns HTTP 401. On receipt it:
   *   1. Skips redirect when the user is already on a public route.
   *   2. Prevents redirect loops by tracking in-flight redirects via a ref.
   *   3. Navigates to `/signin?returnTo=<current-relative-path>`, where
   *      `returnTo` is validated to be a same-origin relative path so that
   *      open-redirect attacks are not possible.
   *
   * The handler is deliberately kept separate from the token-event listener so
   * that the redirect is only triggered by genuine 401 API responses, not by
   * programmatic token removal (e.g. logout).
   */
  useEffect(() => {
    const on401 = () => {
      const pathname = window.location.pathname;

      // Do not redirect from public routes.
      if (PUBLIC_ROUTES.has(pathname)) {
        logger.debug('AuthContext - 401 on public route, skipping redirect:', pathname);
        return;
      }

      // Prevent redirect loops when multiple concurrent 401s fire.
      if (isRedirectingRef.current) {
        logger.debug('AuthContext - 401 redirect already in progress, skipping duplicate');
        return;
      }

      isRedirectingRef.current = true;
      logger.info('AuthContext - 401 detected on protected route, redirecting to signin', { pathname });

      // Build a safe same-origin returnTo value (pathname + search only).
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/signin?returnTo=${returnTo}`;

      // Reset guard after a short delay so a hard navigation on the same page
      // does not permanently block future redirects (SSR / test environments).
      setTimeout(() => {
        isRedirectingRef.current = false;
      }, 5000);
    };

    window.addEventListener('patchwork-auth-401', on401);
    return () => {
      window.removeEventListener('patchwork-auth-401', on401);
    };
  }, []);

  const login = async (token: string) => {
    logger.debug('AuthContext - login() called');
    setAuthToken(token);
    logger.debug('AuthContext - Token saved to localStorage');

    try {
      logger.debug('AuthContext - Fetching user profile after login...');
      const userData = await getCurrentUser();
      logger.debug('AuthContext - User profile received for ID:', userData.id);
      setUser(userData);
      setUserRole(userData.role as UserRole);
      setUserId(userData.id);
      logger.info('AuthContext - Login successful for ID:', userData.id);
    } catch (error) {
      logger.error('AuthContext - Login failed:', error instanceof Error ? error.message : error);
      removeAuthToken();
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setUserRole(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userRole,
        userId,
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
