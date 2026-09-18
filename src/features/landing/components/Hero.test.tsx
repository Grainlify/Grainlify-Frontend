import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { Hero } from './Hero'
import { getLandingStats } from '../../../shared/api/client'

// Hero calls useLandingStats() for the stat grid; nothing else here fetches.
vi.mock('../../../shared/api/client', () => ({
  getLandingStats: vi.fn(),
}))

const mockedGetLandingStats = vi.mocked(getLandingStats)

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('Hero', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedGetLandingStats.mockResolvedValue({
      active_projects: 468,
      contributors: 2165,
      grants_distributed_usd: 0,
    })
  })

  // The heading has been narrowed once (5ebdd2ef) and rewritten once since.
  // Both times the thing that mattered was the same: "Funded issues" scopes
  // the claim, and "them" refers back to it. Separated or dropped, the line
  // becomes the unscoped assertion that the whole platform runs a weighted
  // draw, when the draw is GrainHack-only. These assertions fail if that
  // happens, which a comment asking people not to would not.
  describe('the scoped claim in the heading', () => {
    it('names what the claim is about before making it', () => {
      renderWithProviders(<Hero />)
      const heading = norm(screen.getByRole('heading', { level: 1 }).textContent ?? '')

      expect(heading).toContain('Funded issues')
      expect(heading).toContain('them')

      // Scope first: the subject has to appear before the mechanism, so a
      // reader who stops at the first line has still been told the truth.
      expect(heading.indexOf('Funded issues')).toBeLessThan(heading.indexOf('weighted draw'))
    })

    it('does not lead with the unscoped draw claim', () => {
      renderWithProviders(<Hero />)
      const heading = norm(screen.getByRole('heading', { level: 1 }).textContent ?? '')

      // The exact shape 5ebdd2ef removed, and anything that opens on the
      // mechanism with no subject attached.
      expect(heading).not.toMatch(/^A weighted draw/i)
      expect(heading).not.toMatch(/^Assignment by weighted draw/i)
    })

    it('keeps both halves in one heading, split by an authored break', () => {
      renderWithProviders(<Hero />)
      const h1 = screen.getByRole('heading', { level: 1 })

      // The break is authored rather than left to the container. As a wrap it
      // would move with the font or the width, and the two halves of the
      // scoped claim would stop being a fixed pair.
      expect(h1.querySelectorAll('br')).toHaveLength(1)

      const strip = (html: string) => norm(html.replace(/<[^>]+>/g, ''))
      const [before, after] = h1.innerHTML.split(/<br\s*\/?>/i)
      expect(strip(before)).toBe("Funded issues aren't first-come")
      expect(strip(after)).toBe('A weighted draw assigns them')
    })
  })

  it('makes no claim that anything has been paid', async () => {
    renderWithProviders(<Hero />)
    await waitFor(() => expect(mockedGetLandingStats).toHaveBeenCalled())

    const body = norm(document.body.textContent ?? '')
    // "in advance" is the approved construction: it speaks to predictability,
    // not to money having moved.
    expect(body).toContain('nobody can compute a payout in advance')
    for (const claimed of [/rewards? (have been |were )?paid/i, /payouts? (have been |were )?(made|sent)/i, /already (paid|distributed)/i]) {
      expect(body).not.toMatch(claimed)
    }
  })

  it('shows the live distributed figure rather than hiding a zero', async () => {
    renderWithProviders(<Hero />)
    await waitFor(() => expect(screen.getByText('$0')).toBeInTheDocument())
    expect(screen.getByText('Grants Distributed')).toBeInTheDocument()
  })
})
