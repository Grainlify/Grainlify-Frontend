// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlogStatistics } from './BlogStatistics'
import { I18nProvider } from '../../../shared/i18n'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'

// Mock useLandingStats hook
const mockUseLandingStats = vi.fn()
vi.mock('../../../shared/hooks/useLandingStats', () => ({
  useLandingStats: () => mockUseLandingStats(),
}))

function renderComponent(locale: 'en' | 'es' = 'en') {
  return render(
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <BlogStatistics />
      </ThemeProvider>
    </I18nProvider>
  )
}

describe('BlogStatistics number formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats and renders large numbers (thousands, millions) correctly in default (en) locale', () => {
    mockUseLandingStats.mockReturnValue({
      stats: {
        contributors: 12345,
        active_projects: 1234567,
        grants_distributed_usd: 500000,
      },
      isLoading: false,
      error: null,
    })

    renderComponent('en')

    expect(screen.getByText('12,345')).toBeInTheDocument()
    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('Active Contributors')).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('20+')).toBeInTheDocument()
  })

  it('renders a sensible placeholder (em dash) for zero-values', () => {
    mockUseLandingStats.mockReturnValue({
      stats: {
        contributors: 0,
        active_projects: 0,
        grants_distributed_usd: 0,
      },
      isLoading: false,
      error: null,
    })

    renderComponent('en')

    // Since both contributors and active projects are 0, they should show '—'
    const placeholders = screen.getAllByText('—')
    expect(placeholders).toHaveLength(2)
  })

  it('renders a sensible placeholder (em dash) for missing/undefined/null stats', () => {
    mockUseLandingStats.mockReturnValue({
      stats: null,
      isLoading: false,
      error: null,
    })

    renderComponent('en')

    const placeholders = screen.getAllByText('—')
    expect(placeholders).toHaveLength(2)
  })

  it('renders a sensible placeholder (em dash) if specific fields are missing/undefined', () => {
    mockUseLandingStats.mockReturnValue({
      stats: {
        contributors: undefined,
        active_projects: null,
      },
      isLoading: false,
      error: null,
    })

    renderComponent('en')

    const placeholders = screen.getAllByText('—')
    expect(placeholders).toHaveLength(2)
  })

  it('confirms formatting is locale-aware by rendering in non-English locale (es)', () => {
    mockUseLandingStats.mockReturnValue({
      stats: {
        contributors: 12345,
        active_projects: 1234567,
      },
      isLoading: false,
      error: null,
    })

    renderComponent('es')

    // Spanish locale uses dot grouping separators: 12.345 and 1.234.567
    expect(screen.getByText('12.345')).toBeInTheDocument()
    expect(screen.getByText('1.234.567')).toBeInTheDocument()
  })
})
