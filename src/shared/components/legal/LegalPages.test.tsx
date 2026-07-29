import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { I18nProvider, en } from '../../i18n'
import { TermsPage, PrivacyPage } from './LegalPages'

function renderTermsPage(theme: 'light' | 'dark' = 'light') {
  localStorage.setItem('theme', theme)
  return render(
    <I18nProvider messages={en}>
      <MemoryRouter>
        <ThemeProvider>
          <TermsPage />
        </ThemeProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

function renderPrivacyPage(theme: 'light' | 'dark' = 'light') {
  localStorage.setItem('theme', theme)
  return render(
    <I18nProvider messages={en}>
      <MemoryRouter>
        <ThemeProvider>
          <PrivacyPage />
        </ThemeProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('TermsPage', () => {
  it('renders the Terms of Service heading', () => {
    renderTermsPage()
    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument()
  })

  it('renders content sections', () => {
    renderTermsPage()
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument()
    expect(screen.getByText('2. Description of Service')).toBeInTheDocument()
    expect(screen.getByText('3. User Accounts')).toBeInTheDocument()
    expect(screen.getByText('7. Changes to Terms')).toBeInTheDocument()
  })

  it('renders the back-to-signup link', () => {
    renderTermsPage()
    const backLink = screen.getByRole('link', { name: /back to sign up/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/signup')
  })

  it('renders with dark theme variant', () => {
    const { container } = renderTermsPage('dark')
    expect(container.firstElementChild?.className).toContain('from-[#1a1512]')
  })
})

describe('PrivacyPage', () => {
  it('renders the Privacy Policy heading', () => {
    renderPrivacyPage()
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument()
  })

  it('renders content sections', () => {
    renderPrivacyPage()
    expect(screen.getByText('1. Information We Collect')).toBeInTheDocument()
    expect(screen.getByText('2. How We Use Your Information')).toBeInTheDocument()
    expect(screen.getByText('7. Changes to This Policy')).toBeInTheDocument()
  })

  it('renders the back-to-signup link', () => {
    renderPrivacyPage()
    const backLink = screen.getByRole('link', { name: /back to sign up/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/signup')
  })

  it('renders with dark theme variant', () => {
    const { container } = renderPrivacyPage('dark')
    expect(container.firstElementChild?.className).toContain('from-[#1a1512]')
  })
})