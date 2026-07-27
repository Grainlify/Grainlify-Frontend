import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../../../shared/i18n'

// ─── mock dependencies ──────────────────────────────────────────────────────
vi.mock('react-theme-switch-animation', () => ({
  useModeAnimation: () => ({ ref: { current: null }, toggleSwitchTheme: vi.fn() }),
}))
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setThemeFromAnimation: vi.fn() }),
}))
vi.mock('../../../shared/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../../../shared/contexts/AuthContext'
import { Navbar } from './Navbar'

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>

function renderNavbar() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <Navbar />
      </I18nProvider>
    </MemoryRouter>
  )
}

const SECTION_LINKS = ['Features', 'How it Works', 'Why Choose Us', 'Testimonials']

describe('Navbar i18n strings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the extracted section links from the catalog (English)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() })
    renderNavbar()
    SECTION_LINKS.forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    })
  })

  it('renders the "Get Started" CTA for unauthenticated visitors', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() })
    renderNavbar()
    expect(screen.getAllByText('Get Started').length).toBeGreaterThan(0)
  })

  it('renders the authenticated CTAs (Dashboard / Sign Out)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: vi.fn() })
    renderNavbar()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sign Out').length).toBeGreaterThan(0)
  })

  it('renders the section links inside the mobile menu when opened', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() })
    renderNavbar()

    await user.click(screen.getByLabelText('Open menu'))

    // Desktop + mobile copies are now both in the DOM.
    SECTION_LINKS.forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2)
    })
    expect(screen.getAllByText('Get Started').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the authenticated CTAs inside the mobile menu when opened', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: vi.fn() })
    renderNavbar()

    await user.click(screen.getByLabelText('Open menu'))

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Sign Out').length).toBeGreaterThanOrEqual(2)
  })
})
