import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../contexts/AuthContext';
import { getUserInitials, UserAvatar } from './UserAvatar';
import { UserProfileDropdown } from './UserProfileDropdown';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../../app/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.mocked(useAuth);

function mockAuthenticatedUser(github: { login: string; avatar_url: string; name?: string }) {
  mockUseAuth.mockReturnValue({
    user: { id: '123456789', role: 'contributor', github },
    userRole: 'contributor',
    logout: vi.fn(),
    userId: '123456789',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
  });
}

describe('UserProfileDropdown avatar fallback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives initials from a display name before the GitHub login', () => {
    expect(getUserInitials('Ada Lovelace', 'octocat')).toBe('AL');
    expect(getUserInitials('  Grace Brewster Murray Hopper  ', 'grace')).toBe('GB');
  });

  it('derives initials from the login when a display name is absent', () => {
    expect(getUserInitials(undefined, 'octocat')).toBe('OC');
    expect(getUserInitials('', 'octo-cat')).toBe('OC');
  });

  it('replaces a broken avatar image with high-contrast name initials', () => {
    mockAuthenticatedUser({
      login: 'ada-dev',
      name: 'Ada Lovelace',
      avatar_url: 'https://example.test/broken-avatar.png',
    });
    render(<UserProfileDropdown showMobileNav />);

    fireEvent.error(screen.getAllByRole('img', { name: 'Ada Lovelace avatar' })[0]);

    const fallback = screen.getByLabelText('Ada Lovelace avatar fallback');
    expect(fallback).toHaveTextContent('AL');
    expect(fallback).toHaveClass('bg-[#2d2820]', 'text-white');
    expect(screen.getAllByRole('img', { name: 'Ada Lovelace avatar' })).toHaveLength(1);
  });

  it('uses login initials when the image is missing and no name is available', () => {
    mockAuthenticatedUser({ login: 'octocat', avatar_url: '' });
    render(<UserProfileDropdown showMobileNav />);

    const fallbacks = screen.getAllByLabelText('octocat avatar fallback');
    expect(fallbacks).toHaveLength(2);
    expect(fallbacks[0]).toHaveTextContent('OC');
  });

  it('uses a neutral fallback when no user identity is available', () => {
    render(<UserAvatar size="large" />);

    expect(screen.getByLabelText('User avatar fallback')).toHaveTextContent('?');
  });
});
