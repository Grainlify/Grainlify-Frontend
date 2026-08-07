import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { TermsTab } from './TermsTab'

describe('TermsTab', () => {
  it('renders without crashing and shows real terms content from the source', () => {
    renderWithProviders(<TermsTab />)
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument()
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    expect(screen.getByText('Data Collection')).toBeInTheDocument()
    expect(screen.getByText('User Responsibilities')).toBeInTheDocument()
    expect(
      screen.getByText(/By using Grainlify, you agree to abide by our terms of service/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
  })

  it('renders without crashing in dark theme', () => {
    renderWithProviders(<TermsTab />, { theme: 'dark' })
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument()
  })
})
