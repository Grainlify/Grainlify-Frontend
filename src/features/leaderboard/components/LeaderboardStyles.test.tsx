import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LeaderboardStyles } from './LeaderboardStyles'

describe('LeaderboardStyles', () => {
  it('renders a <style> tag containing the @keyframes glow-pulse definition', () => {
    const { container } = render(<LeaderboardStyles />)

    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('@keyframes glow-pulse')
  })

  it('renders a <style> tag containing the @keyframes float definition', () => {
    const { container } = render(<LeaderboardStyles />)

    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('@keyframes float')
  })

  it('renders a <style> tag containing the @keyframes twinkle-slow definition', () => {
    const { container } = render(<LeaderboardStyles />)

    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('@keyframes twinkle-slow')
  })
})
