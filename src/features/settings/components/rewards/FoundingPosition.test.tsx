import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { FoundingPosition, followShortfall, followRemedy } from './FoundingPosition'
import type { SocialFollowStatus } from '../../../../shared/api/client'

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  CheckCircle2: () => null,
  Info: () => null,
}))

const follow = (over: Partial<SocialFollowStatus> = {}): SocialFollowStatus => ({
  platforms: ['linkedin', 'x'],
  submitted: false,
  status: null,
  eligible: false,
  ...over,
})

describe('FoundingPosition', () => {
  // State 1.
  it('shows band, number and multiplier for an eligible member', () => {
    renderWithProviders(
      <FoundingPosition
        position={{ member: true, wave: 'founding', multiplier: 1.5, sequence_number: 12 }}
        follow={follow({ status: 'approved', submitted: true, eligible: true })}
        theme="light"
      />
    )
    expect(screen.getByText('Founding member')).toBeInTheDocument()
    expect(screen.getByText('#12')).toBeInTheDocument()
    expect(screen.getByText('×1.5')).toBeInTheDocument()
    expect(screen.getByText(/your follow proof is approved/i)).toBeInTheDocument()
  })

  // State 2 — the one that unwinds the 17.
  describe('a member who is not eligible', () => {
    it('says so, and says the position is not at risk', () => {
      renderWithProviders(
        <FoundingPosition
          position={{ member: true, wave: 'founding', multiplier: 1.5, sequence_number: 19 }}
          follow={follow()}
          theme="light"
        />
      )
      // The position is still shown - it is real and permanent.
      expect(screen.getByText('#19')).toBeInTheDocument()
      expect(screen.getByText('×1.5')).toBeInTheDocument()
      // The correction.
      expect(screen.getByText(/not currently eligible to receive a share/i)).toBeInTheDocument()
      // And the reassurance, without which some people read it as a threat and
      // do nothing.
      expect(screen.getByText(/permanent and won't be affected/i)).toBeInTheDocument()
    })

    // The wording must come from the stored status. "Hasn't been submitted" is
    // true of all 17 today and stops being true the moment one of them submits
    // and is rejected - at which point a hardcoded sentence would tell somebody
    // who had submitted twice that they had never submitted.
    it.each([
      [null, /hasn't been submitted/i, /submit your proof below/i],
      ['pending', /still being reviewed/i, /as soon as it's approved/i],
      ['rejected', /wasn't approved/i, /submit new screenshots/i],
      ['revoked', /was withdrawn/i, /submit new screenshots/i],
    ] as const)('reads the shortfall from status=%s', (status, shortfall, remedy) => {
      renderWithProviders(
        <FoundingPosition
          position={{ member: true, wave: 'founding', multiplier: 1.5, sequence_number: 19 }}
          follow={follow({ status: status as SocialFollowStatus['status'], submitted: status !== null })}
          theme="light"
        />
      )
      expect(screen.getByText(shortfall, { exact: false })).toBeInTheDocument()
      expect(screen.getByText(remedy, { exact: false })).toBeInTheDocument()
    })

    // A person waiting on a review must never be told to submit again.
    it('does not tell someone under review to resubmit', () => {
      expect(followRemedy(follow({ status: 'pending' }))).not.toMatch(/submit/i)
    })
  })

  // State 3.
  it('names the missing step for an approved person with no position', () => {
    renderWithProviders(
      <FoundingPosition
        position={{ member: false }}
        follow={follow({ status: 'approved', submitted: true, eligible: true })}
        theme="light"
      />
    )
    expect(screen.getByText(/approved · no position yet/i)).toBeInTheDocument()
    expect(screen.getByText(/verify your identity/i)).toBeInTheDocument()
    expect(screen.getByText(/order people complete both steps/i)).toBeInTheDocument()
  })

  // State 4.
  it('names both steps for somebody with neither', () => {
    renderWithProviders(
      <FoundingPosition position={{ member: false }} follow={follow()} theme="light" />
    )
    expect(screen.getByText(/not in the founding contributor pool yet/i)).toBeInTheDocument()
    expect(screen.getByText(/whichever you finish second/i)).toBeInTheDocument()
  })

  // Load failure, distinguished from absence. A blank where a position belongs
  // reads as "you have none", which is a worse lie than an error.
  it('distinguishes a failed load from having no position', () => {
    const { unmount } = renderWithProviders(
      <FoundingPosition position={null} follow={follow()} theme="light" />
    )
    expect(screen.getByText(/couldn't load your pool position/i)).toBeInTheDocument()
    expect(screen.getByText(/doesn't affect it/i)).toBeInTheDocument()
    // And it must NOT claim they have no position.
    expect(screen.queryByText(/not in the founding contributor pool yet/i)).not.toBeInTheDocument()
    unmount()
  })

  // The constraint: never the position on its own.
  it('never renders a position without an eligibility statement', () => {
    for (const s of [null, 'pending', 'rejected', 'revoked', 'approved'] as const) {
      const { unmount } = renderWithProviders(
        <FoundingPosition
          position={{ member: true, wave: 'founding', multiplier: 1.5, sequence_number: 7 }}
          follow={follow({ status: s })}
          theme="light"
        />
      )
      expect(screen.getByText('#7')).toBeInTheDocument()
      const body = document.body.textContent ?? ''
      expect(/eligib/i.test(body)).toBe(true)
      unmount()
    }
  })

  it('does not show a wave fill counter', () => {
    renderWithProviders(
      <FoundingPosition
        position={{ member: true, wave: 'founding', multiplier: 1.5, sequence_number: 12 }}
        follow={follow({ status: 'approved', eligible: true })}
        theme="light"
      />
    )
    // "38 of 100 claimed" invites scarcity into something where nobody is
    // refused, and it is the one figure that moves under the reader.
    expect(document.body.textContent).not.toMatch(/of 100|claimed|slots? (left|remaining)/i)
  })
})

describe('followShortfall', () => {
  it('never says "not submitted" about somebody who submitted', () => {
    for (const s of ['pending', 'rejected', 'revoked'] as const) {
      expect(followShortfall(follow({ status: s, submitted: true }))).not.toMatch(/hasn't been submitted/i)
    }
  })
})
