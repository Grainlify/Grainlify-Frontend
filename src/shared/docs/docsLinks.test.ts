import { describe, it, expect } from 'vitest'
import { BOUNTY_RULES_PAGE, DOC_SLUGS, DOCS_LIVE, docHref } from './docsLinks'

describe('where "read more" points', () => {
  it('never links to the docs site before it exists', () => {
    // A link to a page that 404s is worse than no link: it reads as the
    // product being broken rather than the docs being unfinished.
    if (!DOCS_LIVE) {
      for (const key of Object.keys(DOC_SLUGS) as (keyof typeof DOC_SLUGS)[]) {
        expect(docHref(key)).not.toMatch(/^\/docs\//)
      }
    }
  })

  it('falls back to a page that is real and covers the same ground', () => {
    // /bounties/rules already publishes the weights, the cap and what the
    // draw cannot read, so the fallback is not a consolation prize.
    expect(docHref('applyForABounty')).toBe(BOUNTY_RULES_PAGE)
    expect(docHref('bountyRules')).toBe(BOUNTY_RULES_PAGE)
  })

  it('uses the slugs the docs navigation actually declares', () => {
    // Taken from src/features/docs/nav.ts in the docs work, not invented, so
    // flipping the switch does not produce three dead links.
    expect(DOC_SLUGS.applyForABounty).toBe('/docs/contributors/apply-for-a-bounty')
    expect(DOC_SLUGS.bountyRules).toBe('/docs/contributors/bounty-rules')
    expect(DOC_SLUGS.bountyPayment).toBe('/docs/contributors/bounty-payment')
  })

  it('is one switch, so the move happens everywhere at once', () => {
    expect(typeof DOCS_LIVE).toBe('boolean')
  })
})
