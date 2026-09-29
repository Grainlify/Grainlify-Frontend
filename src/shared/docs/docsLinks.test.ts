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

  it('points at the docs once they are live, and at a real page before', () => {
    // Before: /bounties/rules already publishes the weights, the cap and what
    // the draw cannot read, so the fallback is not a consolation prize.
    // After: the three docs pages exist (src/features/docs/content/contributors/).
    expect(docHref('applyForABounty')).toBe(DOCS_LIVE ? DOC_SLUGS.applyForABounty : BOUNTY_RULES_PAGE)
    expect(docHref('bountyRules')).toBe(DOCS_LIVE ? DOC_SLUGS.bountyRules : BOUNTY_RULES_PAGE)
  })

  it('only goes live when every page it links to has been written', () => {
    const { existsSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    if (DOCS_LIVE) {
      for (const slug of Object.values(DOC_SLUGS)) {
        expect(existsSync(join(__dirname, '../../features/docs/content', `${slug.replace('/docs/', '')}.md`)), slug).toBe(true)
      }
    }
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
