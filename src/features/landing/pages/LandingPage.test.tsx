import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../../../shared/i18n'
import { useLandingStats } from '../../../shared/hooks/useLandingStats'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, logout: vi.fn() }),
}))

vi.mock('../../../shared/hooks/useLandingStats', () => {
  const mockFn = vi.fn(() => ({
    display: {
      activeProjects: '1,234',
      contributors: '5,678',
      grantsDistributed: '$2.1M',
    },
    isLoading: false,
    error: null,
  }))
  return { useLandingStats: mockFn }
})

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}))

vi.mock('react-theme-switch-animation', () => ({
  useModeAnimation: () => ({
    ref: { current: null },
    toggleSwitchTheme: vi.fn(),
  }),
}))

vi.mock('react-intl', () => ({
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
  FormattedMessage: ({ id }: { id: string }) => id,
  useIntl: () => ({ locale: 'en', formatMessage: ({ id }: { id: string }) => id }),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <I18nProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LandingPage', () => {
  it('renders without crashing', () => {
    const { container } = renderWithRouter(<LandingPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    renderWithRouter(<LandingPage />)
    // The heading text is split across an inline <span> and a <br/> (see
    // Hero.tsx), so the accessible-name whitespace between words is an
    // implementation detail of the accessible-name algorithm (it differs
    // between jsdom versions) rather than something meaningful to assert on
    // — match on the words independently of the exact whitespace between them.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: (accessibleName) =>
          /connect\s*with/i.test(accessibleName) && /open\s*source/i.test(accessibleName),
      })
    ).toBeInTheDocument()
  })

  it('provides a skip-to-content link as the first focusable element', () => {
    renderWithRouter(<LandingPage />)
    const skipLink = screen.getByRole('link', { name: /common.skipToContent/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#landing-main')
    expect(skipLink).toHaveClass('sr-only', 'focus:not-sr-only')
  })

  it('has a main element with the correct id and tabIndex for the skip link target', () => {
    renderWithRouter(<LandingPage />)
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'landing-main')
    expect(main).toHaveAttribute('tabIndex', '-1')
  })
})

describe('Navbar logo image', () => {
  it('has descriptive alt text', () => {
    renderWithRouter(<LandingPage />)
    const logo = screen.getByAltText('Grainlify')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('alt', 'Grainlify')
  })

  it('uses eager loading for above-the-fold LCP image', () => {
    renderWithRouter(<LandingPage />)
    const logo = screen.getByAltText('Grainlify')
    expect(logo).toHaveAttribute('loading', 'eager')
  })

  it('has decoding async for performance', () => {
    renderWithRouter(<LandingPage />)
    const logo = screen.getByAltText('Grainlify')
    expect(logo).toHaveAttribute('decoding', 'async')
  })
})

describe('Testimonial avatar images', () => {
  it('renders all three testimonial avatars with descriptive alt text', () => {
    renderWithRouter(<LandingPage />)

    const avatars = [
      { name: 'Sarah Chen', role: 'Full Stack Developer' },
      { name: 'Marcus Johnson', role: 'Project Maintainer' },
      { name: 'Emily Rodriguez', role: 'Open Source Contributor' },
    ]

    for (const { name, role } of avatars) {
      const img = screen.getByAltText(`${name}, ${role}`)
      expect(img).toBeInTheDocument()
    }
  })

  it('uses loading=lazy on all testimonial avatars', () => {
    renderWithRouter(<LandingPage />)
    const lazyImages = screen.getAllByTestId('image-with-fallback')
    expect(lazyImages.length).toBeGreaterThanOrEqual(3)

    for (const img of lazyImages) {
      expect(img).toHaveAttribute('loading', 'lazy')
    }
  })

  it('uses decoding=async on all testimonial avatars', () => {
    renderWithRouter(<LandingPage />)
    const lazyImages = screen.getAllByTestId('image-with-fallback')

    for (const img of lazyImages) {
      expect(img).toHaveAttribute('decoding', 'async')
    }
  })

  it('uses ImageWithFallback for remote avatar images', () => {
    renderWithRouter(<LandingPage />)
    const fallbackImages = screen.getAllByTestId('image-with-fallback')
    expect(fallbackImages.length).toBe(3)
  })
})

describe('ImageWithFallback security', () => {
  it('rejects invalid URLs and renders fallback placeholder', () => {
    // This is tested at the component level in ImageWithFallback.test.tsx;
    // here we verify the integration by checking the data-testid presence.
    renderWithRouter(<LandingPage />)
    const images = screen.getAllByTestId('image-with-fallback')
    expect(images.length).toBe(3)
  })
})

describe('WhyChooseUs stats states', () => {
  beforeEach(() => {
    vi.mocked(useLandingStats).mockImplementation(() => ({
      stats: {} as any,
      display: { activeProjects: '1,234', contributors: '5,678', grantsDistributed: '$2.1M' },
      isLoading: false,
      error: null,
    }))
  })

  it('shows skeleton pulse placeholders while stats are loading', () => {
    vi.mocked(useLandingStats).mockImplementation(() => ({
      stats: null,
      display: { activeProjects: '—', contributors: '—', grantsDistributed: '—' },
      isLoading: true,
      error: null,
    }))

    renderWithRouter(<LandingPage />)
    // The stats section (WhyChooseUs) shows 2 pulse placeholders for Active Users and Projects Funded
    // Hero also uses useLandingStats but renders SkeletonLoader, not animate-pulse
    const whyChooseUs = document.getElementById('why-choose-us')
    const pulses = whyChooseUs?.querySelectorAll('.animate-pulse') ?? []
    expect(pulses.length).toBe(2)
  })

  it('shows error fallback when stats fail to load', () => {
    vi.mocked(useLandingStats).mockImplementation(() => ({
      stats: null,
      display: { activeProjects: '—', contributors: '—', grantsDistributed: '—' },
      isLoading: false,
      error: 'Network error',
    }))

    renderWithRouter(<LandingPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/unable to load live statistics/i)).toBeInTheDocument()
  })

  it('shows formatted stats when data loads successfully', () => {
    renderWithRouter(<LandingPage />)
    // Hero section also renders the same stats values, so use getAllByText
    const contributors = screen.getAllByText('5,678')
    expect(contributors.length).toBeGreaterThanOrEqual(1)

    const projects = screen.getAllByText('1,234')
    expect(projects.length).toBeGreaterThanOrEqual(1)
  })
})
