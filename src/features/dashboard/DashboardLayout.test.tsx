import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { expect, test, describe } from 'vitest'
import '@testing-library/jest-dom'
import { DashboardLayout } from './DashboardLayout'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter })
}

describe('DashboardLayout Accessibility and Layout', () => {
  test('renders exactly one main landmark role for assistive technologies', () => {
    renderWithRouter(<DashboardLayout />)

    const mainLandmark = screen.getByRole('main')
    expect(mainLandmark).toBeInTheDocument()
    expect(mainLandmark).toHaveAttribute('id', 'main-content')
  })

  test('contains a functional skip-to-content link that references the main container', () => {
    renderWithRouter(<DashboardLayout />)

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  test('main container is programmatically focusable', () => {
    renderWithRouter(<DashboardLayout />)

    const mainLandmark = screen.getByRole('main')
    expect(mainLandmark).toHaveAttribute('tabIndex', '-1')
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
