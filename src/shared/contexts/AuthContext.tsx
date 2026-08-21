import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';

export type UserRole = 'contributor' | 'maintainer' | 'admin' | null;

export interface User {
  id: string;
  role: string;
  github?: {
    login: string;
    avatar_url: string;
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

  const checkAuth = async () => {
    const token = getAuthToken();

    if (token) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setUserRole(userData.role as UserRole);
        setUserId(userData.id);
      } catch (error) {
        // Token is invalid, remove it
        console.error('AuthContext - Auth check failed:', error);
        removeAuthToken();
        setUser(null);
        setUserRole(null);
        setUserId(null);
      }
    } else {
      setUser(null);
      setUserRole(null);
      setUserId(null);
    }
    setIsLoading(false);
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

  const login = async (token: string) => {
    setAuthToken(token);

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setUserRole(userData.role as UserRole);
      setUserId(userData.id);
    } catch (error) {
      console.error('AuthContext - Login failed:', error);
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
        isAuthenticated: !!user && !!getAuthToken(),
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
