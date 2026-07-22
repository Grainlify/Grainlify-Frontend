// @vitest-environment jsdom
import { waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeaderboardHero } from './LeaderboardHero'
import { renderWithTheme } from '../../../test/renderWithTheme'

function makeMediaQuery(matches: boolean) {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

function mockMatchMedia(matches: boolean) {
  const mql = makeMediaQuery(matches)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  })
  return mql as unknown as MediaQueryList
}

function getChild() {
  return <div data-testid="hero-child">Child content</div>
}

describe('LeaderboardHero', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('keeps decorative animation classes when reduced motion is not preferred', () => {
    renderWithTheme(
      <LeaderboardHero leaderboardType="contributors" isLoaded={true}>
        {getChild()}
      </LeaderboardHero>
    )

    expect(document.querySelector('.animate-twinkle-slow')).toBeInTheDocument()
    expect(document.querySelector('.animate-glow-pulse')).toBeInTheDocument()
    expect(document.querySelector('.animate-glow-pulse-delayed')).toBeInTheDocument()
    expect(document.querySelector('.animate-float')).toBeInTheDocument()
    expect(document.querySelector('.animate-float-delayed')).toBeInTheDocument()
    expect(document.querySelector('.animate-float-slow')).toBeInTheDocument()
    expect(document.querySelector('.animate-shimmer')).toBeInTheDocument()
    expect(document.querySelector('.animate-bounce-slow')).toBeInTheDocument()
    expect(document.querySelector('.animate-wiggle')).toBeInTheDocument()
    expect(document.querySelector('.animate-wiggle-delayed')).toBeInTheDocument()
    expect(document.querySelector('.animate-pulse-slow')).toBeInTheDocument()
  })

  it('removes decorative animation classes when reduced motion is preferred', () => {
    mockMatchMedia(true)
    renderWithTheme(
      <LeaderboardHero leaderboardType="contributors" isLoaded={true}>
        {getChild()}
      </LeaderboardHero>
    )

    expect(document.querySelector('.animate-twinkle-slow')).toBeNull()
    expect(document.querySelector('.animate-glow-pulse')).toBeNull()
    expect(document.querySelector('.animate-glow-pulse-delayed')).toBeNull()
    expect(document.querySelector('.animate-float')).toBeNull()
    expect(document.querySelector('.animate-float-delayed')).toBeNull()
    expect(document.querySelector('.animate-float-slow')).toBeNull()
    expect(document.querySelector('.animate-shimmer')).toBeNull()
    expect(document.querySelector('.animate-bounce-slow')).toBeNull()
    expect(document.querySelector('.animate-wiggle')).toBeNull()
    expect(document.querySelector('.animate-wiggle-delayed')).toBeNull()
    expect(document.querySelector('.animate-pulse-slow')).toBeNull()
  })

  it('uses opacity-only reveal when reduced motion is enabled', () => {
    mockMatchMedia(true)
    renderWithTheme(
      <LeaderboardHero leaderboardType="contributors" isLoaded={true}>
        {getChild()}
      </LeaderboardHero>
    )

    const outer = document.querySelector('.min-h-\\[450px\\]')
    expect(outer).toBeInTheDocument()
    expect(outer!.className).toContain('opacity-100')
    expect(outer!.className).not.toMatch(/translate/)
    expect(outer!.className).not.toMatch(/scale/)

    const titleSection = document.querySelector('.text-center.mb-10')
    expect(titleSection).toBeInTheDocument()
    expect(titleSection!.className).toContain('opacity-100')
    expect(titleSection!.className).not.toMatch(/translate/)

    const podiumSection = document.querySelector('.backdrop-blur-\\[40px\\]')
    expect(podiumSection).toBeInTheDocument()
    expect(podiumSection!.className).toContain('opacity-100')
    expect(podiumSection!.className).not.toMatch(/scale/)
  })

  it('shows content with opacity fade when isLoaded transitions under reduced motion', async () => {
    mockMatchMedia(true)
    const { rerender } = renderWithTheme(
      <LeaderboardHero leaderboardType="contributors" isLoaded={false}>
        {getChild()}
      </LeaderboardHero>
    )

    const outer = document.querySelector('.min-h-\\[450px\\]')
    expect(outer!.className).toContain('opacity-0')

    rerender(
      <LeaderboardHero leaderboardType="contributors" isLoaded={true}>
        {getChild()}
      </LeaderboardHero>
    )

    await waitFor(() => {
      expect(outer!.className).toContain('opacity-100')
    })
    expect(outer!.className).not.toMatch(/translate/)
    expect(outer!.className).not.toMatch(/scale/)
  })
})
