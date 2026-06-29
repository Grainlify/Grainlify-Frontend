import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from '../contexts/ThemeContext'
import { I18nProvider } from '../i18n'
import { en } from '../i18n'
import { NotFoundPage } from './NotFoundPage'

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="current-path">{location.pathname}</span>
}

function renderNotFoundPage({
  theme = 'light',
  initialEntries = ['/missing'],
  initialIndex = 0,
}: {
  theme?: 'light' | 'dark'
  initialEntries?: string[]
  initialIndex?: number
} = {}) {
  localStorage.setItem('theme', theme)

  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <ThemeProvider>
          <NotFoundPage />
          <LocationProbe />
        </ThemeProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('NotFoundPage', () => {
  // ── Catalog key integrity ────────────────────────────────────────────────

  it('catalog: errors.notFound.title is defined and non-empty', () => {
    expect(en['errors.notFound.title']).toBeTruthy()
  })

  it('catalog: errors.notFound.description is defined and non-empty', () => {
    expect(en['errors.notFound.description']).toBeTruthy()
  })

  it('catalog: errors.notFound.goBack is defined and non-empty', () => {
    expect(en['errors.notFound.goBack']).toBeTruthy()
  })

  it('catalog: errors.notFound.goToDashboard is defined and non-empty', () => {
    expect(en['errors.notFound.goToDashboard']).toBeTruthy()
  })

  it('catalog: errors.notFound.supportNote is defined and non-empty', () => {
    expect(en['errors.notFound.supportNote']).toBeTruthy()
  })

  // ── Light theme rendering ────────────────────────────────────────────────

  it('renders the light-themed 404 content and actions', () => {
    const { container } = renderNotFoundPage({ theme: 'light' })

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: en['errors.notFound.title'] })).toBeInTheDocument()
    expect(screen.getByText(en['errors.notFound.description'])).toBeInTheDocument()
    expect(screen.getByText(en['errors.notFound.supportNote'])).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(en['errors.notFound.goBack'], 'i') })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(en['errors.notFound.goToDashboard'], 'i') })
    ).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('from-[#e8dfd0]')
  })

  // ── Dark theme rendering ─────────────────────────────────────────────────

  it('renders the dark-themed 404 variant', () => {
    const { container } = renderNotFoundPage({ theme: 'dark' })

    expect(screen.getByRole('heading', { name: en['errors.notFound.title'] })).toBeInTheDocument()
    expect(screen.getByText(en['errors.notFound.description'])).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('from-[#1a1512]')
  })

  // ── Localized text matches catalog values exactly ────────────────────────

  it('renders the title string from the catalog', () => {
    renderNotFoundPage()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(en['errors.notFound.title'])
  })

  it('renders the description string from the catalog', () => {
    renderNotFoundPage()
    expect(screen.getByText(en['errors.notFound.description'])).toBeInTheDocument()
  })

  it('renders the Go Back button label from the catalog', () => {
    renderNotFoundPage()
    const btn = screen.getByRole('button', {
      name: new RegExp(en['errors.notFound.goBack'], 'i'),
    })
    expect(btn).toBeInTheDocument()
  })

  it('renders the Go to Dashboard button label from the catalog', () => {
    renderNotFoundPage()
    const btn = screen.getByRole('button', {
      name: new RegExp(en['errors.notFound.goToDashboard'], 'i'),
    })
    expect(btn).toBeInTheDocument()
  })

  it('renders the support note from the catalog', () => {
    renderNotFoundPage()
    expect(screen.getByText(en['errors.notFound.supportNote'])).toBeInTheDocument()
  })

  // ── Navigation behaviour (unchanged) ────────────────────────────────────

  it('navigates back to the previous in-app route', async () => {
    const user = userEvent.setup()
    renderNotFoundPage({
      initialEntries: ['/dashboard', '/unknown-page'],
      initialIndex: 1,
    })

    await user.click(
      screen.getByRole('button', { name: new RegExp(en['errors.notFound.goBack'], 'i') })
    )

    expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
  })

  it('navigates to the relative dashboard route without leaving the app', async () => {
    const user = userEvent.setup()
    renderNotFoundPage()

    await user.click(
      screen.getByRole('button', { name: new RegExp(en['errors.notFound.goToDashboard'], 'i') })
    )

    expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
  })

  // ── Security: static keys only ───────────────────────────────────────────

  it('security: all errors.notFound keys are static strings with no interpolation placeholders', () => {
    const notFoundKeys = Object.entries(en).filter(([key]) => key.startsWith('errors.notFound.'))
    expect(notFoundKeys.length).toBeGreaterThan(0)
    notFoundKeys.forEach(([, value]) => {
      // No {placeholder} syntax — confirms keys are safe from injection
      expect(value).not.toMatch(/\{[^}]+\}/)
    })
  })
})
