import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../../shared/i18n'

// ─── mock dependencies ──────────────────────────────────────────────────────
vi.mock('react-theme-switch-animation', () => ({
  useModeAnimation: () => ({ ref: { current: null }, toggleSwitchTheme: vi.fn() }),
}))
vi.mock('../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ userRole: 'contributor', logout: vi.fn(), login: vi.fn() }),
}))
vi.mock('../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setThemeFromAnimation: vi.fn() }),
}))
vi.mock('../../shared/components/UserProfileDropdown', () => ({
  UserProfileDropdown: () => null,
}))
vi.mock('../../shared/components/NotificationsDropdown', () => ({
  NotificationsDropdown: () => null,
}))
// Expose role-change controls so the admin/maintainer-only nav items can be
// exercised from the test (the real switcher is a Radix dropdown).
vi.mock('../../shared/components/RoleSwitcher', () => ({
  RoleSwitcher: ({ onRoleChange }: { onRoleChange: (role: string) => void }) => (
    <div>
      <button onClick={() => onRoleChange('admin')}>set-admin</button>
      <button onClick={() => onRoleChange('maintainer')}>set-maintainer</button>
    </div>
  ),
}))
vi.mock('../../shared/components/ui/Modal', () => ({
  Modal: () => null,
  ModalFooter: () => null,
  ModalButton: () => null,
  ModalInput: () => null,
}))
vi.mock('../../shared/api/client', () => ({ bootstrapAdmin: vi.fn() }))

import { DashboardLayout } from './DashboardLayout'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/discover']}>
      <I18nProvider>
        <DashboardLayout />
      </I18nProvider>
    </MemoryRouter>
  )
}

describe('DashboardLayout i18n nav labels', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('renders the contributor sidebar labels from the catalog (English)', () => {
    renderLayout()
    ;[
      'Discover',
      'Browse',
      'Open-Source Week',
      'Ecosystems',
      'Contributors',
      'Leaderboard',
      'Grainlify Blog',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('renders the admin/maintainer-only labels when the active role is admin', async () => {
    // Seed the bootstrap flag so switching to "admin" is allowed without the
    // password modal flow.
    sessionStorage.setItem('admin_authenticated', 'true')
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByText('set-admin'))

    expect(screen.getByText('Maintainers')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
  })

  it('provides a skip-to-content link as the first focusable element', () => {
    renderLayout()
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#dashboard-main')
    expect(skipLink).toHaveClass('sr-only', 'focus:not-sr-only')
  })

  it('has a main element with the correct id and tabIndex for the skip link target', () => {
    renderLayout()
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'dashboard-main')
    expect(main).toHaveAttribute('tabIndex', '-1')
  })
})
