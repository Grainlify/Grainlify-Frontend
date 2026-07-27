import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataState } from './DataState'

function renderDataState(props: Partial<React.ComponentProps<typeof DataState>> = {}) {
  return render(
    <DataState isLoading={false} isEmpty={false} hasError={false} {...props}>
      <section>Loaded content</section>
    </DataState>
  )
}

describe('DataState', () => {
  it('renders the loading branch as a status region', () => {
    const { container } = renderDataState({
      isLoading: true,
      hasError: true,
      isEmpty: true,
      error: new Error('500 internal detail'),
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(container.querySelector('.glass-loader')).toBeInTheDocument()
    expect(screen.queryByText('Loaded content')).not.toBeInTheDocument()
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument()
  })

  it('renders a friendly error message and calls retry when available', () => {
    const onRetry = vi.fn()
    renderDataState({
      hasError: true,
      error: new Error('Failed to fetch /internal/projects'),
      onRetry,
    })

    expect(
      screen.getByText(
        'Unable to connect to the server. Please check your internet connection and try again.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('/internal/projects')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('omits the retry button when an error has no retry handler', () => {
    renderDataState({
      hasError: true,
      error: new Error('Timeout'),
    })

    expect(screen.getByText('The request took too long. Please try again.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('renders the default empty message', () => {
    renderDataState({ isEmpty: true })

    expect(screen.getByText('No data available.')).toBeInTheDocument()
    expect(screen.queryByText('Loaded content')).not.toBeInTheDocument()
  })

  it('renders a custom empty message', () => {
    renderDataState({
      isEmpty: true,
      emptyMessage: 'No projects matched this filter.',
    })

    expect(screen.getByText('No projects matched this filter.')).toBeInTheDocument()
    expect(screen.queryByText('No data available.')).not.toBeInTheDocument()
  })

  it('renders children for the content branch', () => {
    renderDataState()

    expect(screen.getByText('Loaded content')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('No data available.')).not.toBeInTheDocument()
  })
})
