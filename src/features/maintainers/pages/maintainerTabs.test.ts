import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const src = readFileSync(join(__dirname, 'MaintainersPage.tsx'), 'utf8')

describe('the maintainer tab bar', () => {
  // These were two hardcoded arrays: one validating ?subtab=, one rendering
  // the buttons. Adding Bounties to the first and not the second produced a
  // tab that rendered from a URL and could not be clicked to.
  it('renders from the same list the URL is validated against', () => {
    expect(src).toMatch(/const tabs: TabType\[\] = VALID_TABS;/)
    expect(src).not.toMatch(/const tabs: TabType\[\] = \[/)
  })

  it('includes Bounties, so a maintainer can reach it', () => {
    const declared = /const VALID_TABS: TabType\[\] = \[([^\]]+)\]/.exec(src)![1]!
    expect(declared).toContain("'Bounties'")
  })
})
