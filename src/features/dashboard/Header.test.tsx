// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'
import { renderWithTheme } from '../../test/renderWithTheme'

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {}
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

describe('Header notification bell keyboard accessibility', () => {
  function setup() {
    return userEvent.setup({ pointerEventsCheck: 0 })
  }

  it('notification bell is focusable via Tab and has an accessible name', async () => {
    const user = setup()
    renderWithTheme(<Header />)

    // Press Tab to focus the first focusable element (the bell)
    await user.tab()

    const bellButton = screen.getByRole('button', { name: /notifications/i })
    expect(bellButton).toHaveFocus()
    expect(bellButton).toBeInTheDocument()
  })

  it('Enter opens the dropdown and Escape closes it, returning focus to the bell', async () => {
    const user = setup()
    renderWithTheme(<Header />)

    const bellButton = screen.getByRole('button', { name: /notifications/i })

    // Focus the bell
    bellButton.focus()
    expect(bellButton).toHaveFocus()

    // Press Enter to open
    await user.keyboard('{Enter}')
    const menu = await screen.findByRole('menu')
    expect(menu).toBeInTheDocument()

    // Press Escape to close
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    // Focus should return to the bell
    await waitFor(() => {
      expect(bellButton).toHaveFocus()
    })
  })

  it('Space opens the dropdown and Escape closes it', async () => {
    const user = setup()
    renderWithTheme(<Header />)

    const bellButton = screen.getByRole('button', { name: /notifications/i })

    // Focus the bell
    bellButton.focus()

    // Press Space to open
    await user.keyboard(' ')
    const menu = await screen.findByRole('menu')
    expect(menu).toBeInTheDocument()

    // Press Escape to close
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    // Focus should return to the bell
    await waitFor(() => {
      expect(bellButton).toHaveFocus()
    })
  })
})
