import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('DashboardLayout icon-only controls accessibility', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  describe('Sidebar toggle button', () => {
    it('has accessible name in expanded state', () => {
      renderLayout()
      const toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' })
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('has accessible name in collapsed state', async () => {
      const user = userEvent.setup()
      renderLayout()

      const collapseButton = screen.getByRole('button', { name: 'Collapse sidebar' })
      await user.click(collapseButton)

      const expandButton = screen.getByRole('button', { name: 'Expand sidebar' })
      expect(expandButton).toBeInTheDocument()
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Navigation items in collapsed state', () => {
    it('each nav item has an accessible name when sidebar is collapsed', async () => {
      const user = userEvent.setup()
      renderLayout()

      // Collapse sidebar
      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

      // Check all contributor nav items have accessible names
      const expectedLabels = [
        'Discover',
        'Browse',
        'Open-Source Week',
        'Ecosystems',
        'Contributors',
        'Leaderboard',
        'Grainlify Blog',
      ]

      expectedLabels.forEach((label) => {
        const navLink = screen.getByRole('link', { name: label })
        expect(navLink).toBeInTheDocument()
        expect(navLink).toHaveAttribute('aria-label', label)
      })
    })

    it('nav items have no aria-label in expanded state (text visible)', () => {
      renderLayout()

      // Find all nav links by their visible text
      const discoverLink = screen.getByRole('link', { name: 'Discover' })
      expect(discoverLink).toBeInTheDocument()
      expect(discoverLink).not.toHaveAttribute('aria-label')
    })

    it('admin-only nav items have accessible names when collapsed', async () => {
      sessionStorage.setItem('admin_authenticated', 'true')
      const user = userEvent.setup()
      renderLayout()

      // Switch to admin role
      await user.click(screen.getByText('set-admin'))

      // Collapse sidebar
      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

      // Check admin-only items
      expect(screen.getByRole('link', { name: 'Maintainers' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Data' })).toBeInTheDocument()
    })

    it('icons are marked as decorative with aria-hidden in nav items', () => {
      renderLayout()

      // Icons should be marked aria-hidden since the link text provides the accessible name
      const links = screen.getAllByRole('link')
      const navLinks = links.filter((link) => 
        link.getAttribute('href')?.startsWith('/dashboard/')
      )

      // At least one nav link should exist with an icon marked aria-hidden
      expect(navLinks.length).toBeGreaterThan(0)
      navLinks.forEach((link) => {
        const icon = link.querySelector('svg')
        if (icon) {
          expect(icon).toHaveAttribute('aria-hidden', 'true')
        }
      })
    })
  })

  describe('Search link', () => {
    it('has accessible name for screen readers', () => {
      renderLayout()
      const searchLink = screen.getByRole('link', { name: 'Search projects, issues, and contributors' })
      expect(searchLink).toBeInTheDocument()
      expect(searchLink).toHaveAttribute('href', '/dashboard/search')
    })
  })

  describe('Theme toggle button', () => {
    it('has accessible name for light mode', () => {
      renderLayout()
      const themeToggle = screen.getByRole('button', { name: 'Switch to dark mode' })
      expect(themeToggle).toBeInTheDocument()
    })
  })

  describe('Mobile menu button', () => {
    it('has accessible name when menu is closed', () => {
      renderLayout()
      const menuButton = screen.getByRole('button', { name: 'Open navigation menu' })
      expect(menuButton).toBeInTheDocument()
      expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('has accessible name when menu is open', async () => {
      const user = userEvent.setup()
      renderLayout()

      const openButton = screen.getByRole('button', { name: 'Open navigation menu' })
      await user.click(openButton)

      const closeButton = screen.getByRole('button', { name: 'Close navigation menu' })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Complete accessibility coverage - all states', () => {
    it('ensures all icon-only controls have accessible names in collapsed state', async () => {
      const user = userEvent.setup()
      renderLayout()

      // Collapse sidebar to enable icon-only state
      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

      // Get all interactive elements (buttons and links)
      const buttons = screen.getAllByRole('button')
      const links = screen.getAllByRole('link')

      // Every button should have an accessible name
      buttons.forEach((button) => {
        const accessibleName = button.getAttribute('aria-label') || button.textContent?.trim()
        expect(accessibleName).toBeTruthy()
      })

      // Every link should have an accessible name
      links.forEach((link) => {
        const accessibleName = 
          link.getAttribute('aria-label') || 
          link.textContent?.trim() ||
          link.querySelector('img')?.getAttribute('alt')
        expect(accessibleName).toBeTruthy()
      })
    })

    it('ensures all icon-only controls have accessible names in expanded state', () => {
      renderLayout()

      // Get all interactive elements
      const buttons = screen.getAllByRole('button')
      const links = screen.getAllByRole('link')

      // Every button should have an accessible name
      buttons.forEach((button) => {
        const accessibleName = button.getAttribute('aria-label') || button.textContent?.trim()
        expect(accessibleName).toBeTruthy()
      })

      // Every link should have an accessible name
      links.forEach((link) => {
        const accessibleName = 
          link.getAttribute('aria-label') || 
          link.textContent?.trim() ||
          link.querySelector('img')?.getAttribute('alt')
        expect(accessibleName).toBeTruthy()
      })
    })
  })

  describe('DashboardLayout responsive sidebar collapse and drawer', () => {
    let originalInnerWidth: number

    beforeEach(() => {
      originalInnerWidth = window.innerWidth
    })

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      })
    })

    function setWidthAndResize(width: number) {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      })
      window.dispatchEvent(new Event('resize'))
    }

    it('collapses/hides sidebar labels at narrow viewport widths', () => {
      // Set width below 768px breakpoint before rendering
      setWidthAndResize(500)
      const { container } = renderLayout()

      // Assert that the sidebar collapses
      // The sidebar toggle button should be in collapsed state ("Expand sidebar")
      const expandButton = screen.getByRole('button', { name: 'Expand sidebar' })
      expect(expandButton).toBeInTheDocument()
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')

      // Sidebar aside element should have collapsed width class (w-[65px])
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('w-[65px]')
    })

    it('keeps the main content area visible and usable in collapsed state', () => {
      setWidthAndResize(500)
      renderLayout()

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).not.toHaveClass('hidden')
      // Should have collapsed layout margin class
      expect(main).toHaveClass('ml-[81px]')
    })

    it('provides a keyboard-operable mobile menu toggle and manages focus sensibly', async () => {
      const user = userEvent.setup()
      // Small device width (below 1024px) to show the mobile toggle button
      setWidthAndResize(800)
      renderLayout()

      // Find the toggle (open menu button)
      const openBtn = screen.getByRole('button', { name: 'Open navigation menu' })
      expect(openBtn).toBeInTheDocument()

      // Ensure it is keyboard operable - focus and press Enter/Space
      openBtn.focus()
      expect(document.activeElement).toBe(openBtn)

      await user.keyboard('{Enter}')

      // The mobile menu close button should now be focused (our sensible focus management)
      const closeBtn = screen.getByRole('button', { name: 'Close navigation menu' })
      expect(closeBtn).toBeInTheDocument()
      expect(document.activeElement).toBe(closeBtn)

      // Press Space or Enter to close it
      await user.keyboard(' ')

      // Focus should be returned to the open button (sensible focus restoration)
      expect(document.activeElement).toBe(openBtn)
    })
  })
})
