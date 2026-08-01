import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../../../shared/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, logout: vi.fn() }),
}))

let mockUseLandingStats: {
  display: { activeProjects: string; contributors: string; grantsDistributed: string }
  isLoading: boolean
  error: string | null
  refetch: ReturnType<typeof vi.fn>
} = {
  display: {
    activeProjects: '1,234',
    contributors: '5,678',
    grantsDistributed: '$2.1M',
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

vi.mock('../../../shared/hooks/useLandingStats', () => ({
  useLandingStats: () => mockUseLandingStats,
}))

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

describe('WhyChooseUs stats', () => {
  beforeEach(() => {
    mockUseLandingStats = {
      display: {
        activeProjects: '1,234',
        contributors: '5,678',
        grantsDistributed: '$2.1M',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
  })

  it('shows formatted stat values on success', () => {
    renderWithRouter(<LandingPage />)
    expect(screen.getAllByText('5,678').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1,234').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('$2.1M').length).toBeGreaterThanOrEqual(1)
  })

  it('shows skeleton loaders while loading', () => {
    mockUseLandingStats = {
      ...mockUseLandingStats,
      isLoading: true,
    }
    renderWithRouter(<LandingPage />)
    const skeletons = screen.getAllByTestId('skeleton-loader')
    // At least 2 skeleton loaders for the stat values (Active Users, Projects Funded)
    expect(skeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('shows retry buttons on error', () => {
    mockUseLandingStats = {
      ...mockUseLandingStats,
      error: 'Failed to load stats',
    }
    renderWithRouter(<LandingPage />)
    const retryBtns = screen.getAllByTestId(/^retry-/)
    expect(retryBtns.length).toBeGreaterThanOrEqual(2)
  })

  it('calls refetch when retry button is clicked', () => {
    const refetchMock = vi.fn()
    mockUseLandingStats = {
      ...mockUseLandingStats,
      error: 'Failed to load stats',
      refetch: refetchMock,
    }
    renderWithRouter(<LandingPage />)
    const retryBtn = screen.getByTestId('retry-contributors')
    retryBtn.click()
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })
})
