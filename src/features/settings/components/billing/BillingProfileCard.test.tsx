import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { BillingProfileCard } from './BillingProfileCard'
import type { BillingProfile } from '../../types'

const baseProfile: BillingProfile = {
  id: 1,
  name: 'Acme Inc',
  type: 'organization',
  status: 'verified',
}

describe('BillingProfileCard', () => {
  it('renders the profile and triggers onClick when not processing', () => {
    const onClick = vi.fn()
    const { container } = renderWithTheme(
      <BillingProfileCard profile={baseProfile} onClick={onClick} />
    )

    expect(screen.getByText('Acme Inc')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument() // organization -> Company
    expect(screen.getByText('Verified')).toBeInTheDocument()

    const card = container.querySelector('[aria-busy]') as HTMLElement
    expect(card).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows a spinner, marks aria-busy and prevents duplicate activation while processing', () => {
    const onClick = vi.fn()
    const { container } = renderWithTheme(
      <BillingProfileCard profile={baseProfile} onClick={onClick} isProcessing />
    )

    const card = container.querySelector('[aria-busy]') as HTMLElement
    expect(card).toHaveAttribute('aria-busy', 'true')

    const spinner = screen.getByRole('status', { name: 'Processing' })
    expect(spinner).toBeInTheDocument()

    // Clicking while processing must not re-trigger the action.
    fireEvent.click(card)
    fireEvent.click(card)
    expect(onClick).not.toHaveBeenCalled()

    // The colorblind-safe status badge stays intact.
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('restores the interactive state when processing completes', () => {
    const onClick = vi.fn()
    const { container, rerender } = renderWithTheme(
      <BillingProfileCard profile={baseProfile} onClick={onClick} isProcessing />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(<BillingProfileCard profile={baseProfile} onClick={onClick} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    const card = container.querySelector('[aria-busy]') as HTMLElement
    expect(card).toHaveAttribute('aria-busy', 'false')

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the missing-verification status badge', () => {
    renderWithTheme(
      <BillingProfileCard
        profile={{ ...baseProfile, status: 'missing-verification' }}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('Missing Verification')).toBeInTheDocument()
  })

  it('renders the limit-reached status badge', () => {
    renderWithTheme(
      <BillingProfileCard profile={{ ...baseProfile, status: 'limit-reached' }} onClick={vi.fn()} />
    )
    expect(screen.getByText('Individual Limit Reached')).toBeInTheDocument()
  })

  it('formats non-organization type labels', () => {
    renderWithTheme(
      <BillingProfileCard profile={{ ...baseProfile, type: 'self-employed' }} onClick={vi.fn()} />
    )
    expect(screen.getByText('self employed')).toBeInTheDocument()
  })

  it('supports the dark theme without losing the status badge', () => {
    renderWithTheme(<BillingProfileCard profile={baseProfile} onClick={vi.fn()} />, {
      theme: 'dark',
    })
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })
})
