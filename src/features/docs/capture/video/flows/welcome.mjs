// Welcome to Grainlify (contributor, mira-dev): a tour of the rail.

import { world } from '../../world/index.mjs'
import { mainThreadAnimations, cursor, setupDone, click, point, moveTo, scrollBy, scrollTo, stable, wait, rail, hoverRail, readyThen } from './_start-motion.mjs'

const w = world('contributor')

const recommendedProjects = (page) => page.getByRole('heading', { name: /^Recommended Projects/ }).first()
const recommendedIssues = (page) => page.getByRole('heading', { name: 'Recommended Issues' }).first()
const profileButton = (page) => page.locator('div.fixed.top-2.right-2').getByText('mira-dev', { exact: true }).first()
/** ledgerline #212, a good first issue mira-dev has not applied for. */
const ISSUE_TITLE = 'Document the snapshot format'

/** Discover scrolled so its project cards and open issues fill the screen. */
async function toProjects(page) {
  const b = await recommendedProjects(page).boundingBox()
  await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'instant' }), b.y - 110)
  await page.waitForTimeout(200)
}

export default {
  start: {
    url: '/dashboard?tab=discover',
    ...w,
    init: [...w.init, cursor(), setupDone(), mainThreadAnimations()],
    ready: readyThen((page) => page.getByText(ISSUE_TITLE), toProjects),
  },
  segments: [
    // 1. Discover with project cards and issues; then the picture and username top right.
    async (page) => {
      await moveTo(page, 760, 520, { pause: 2200, steps: 5 })
      await point(page, profileButton(page), { pause: 1500, steps: 30, scroll: false })
    },
    // 2. Hover Discover (label shows), click Browse, open and close the Language filter.
    async (page) => {
      await hoverRail(page, 'discover', { pause: 1600 })
      await click(page, rail(page, 'browse'))
      await page.getByText('kestrel-data').first().waitFor({ timeout: 15000 })
      await stable(page)
      await click(page, page.getByRole('button', { name: 'Select languages' }))
      await page.getByPlaceholder('Search languages...').waitFor({ timeout: 5000 })
      await wait(page, 1400)
      await click(page, page.locator('div.w-\\[340px\\]').first().locator('button:has(svg.lucide-x)').first())
    },
    // 3. Back to Discover, open an issue, point at Apply for this issue.
    async (page) => {
      await click(page, rail(page, 'discover'))
      await recommendedIssues(page).waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 760, 500, { pause: 100 })
      await scrollTo(page, recommendedIssues(page), { top: 110 })
      await click(page, page.getByText(ISSUE_TITLE).first())
      const apply = page.getByRole('button', { name: 'Apply for this issue' })
      await apply.first().waitFor({ timeout: 15000 })
      await stable(page)
      await point(page, apply, { pause: 1200 })
    },
    // 4. Back; hover Contributors (label shows) and open it on Contributions.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Back', exact: true }))
      await wait(page, 600)
      await hoverRail(page, 'contributors', { pause: 1000 })
      await click(page, rail(page, 'contributors'))
      await page.getByRole('button', { name: 'Contributions', exact: true }).first().waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 760, 460, { pause: 0 })
    },
    // 5. Bounties: hold on the header and the status line.
    async (page) => {
      await click(page, rail(page, 'bounties'))
      const status = page.locator('div[role="status"]').first()
      await status.waitFor({ timeout: 15000 })
      await stable(page)
      await point(page, status, { pause: 0, scroll: false, steps: 30 })
    },
    // 6. Hover GrainHack, then My GrainHack, so each label shows. Nothing opens.
    async (page) => {
      await hoverRail(page, 'osw', { pause: 2600 })
      await hoverRail(page, 'my-grainhack', { pause: 2600 })
    },
    // 7. Leaderboard, This season: hold on the table.
    async (page) => {
      await click(page, rail(page, 'leaderboard'))
      const season = page.getByRole('button', { name: 'This season', exact: true }).first()
      await season.waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 760, 560, { pause: 600 })
      await scrollTo(page, season, { top: 100 })
      await point(page, season, { pause: 900, scroll: false })
      await moveTo(page, 700, 520, { pause: 0, steps: 30 })
    },
    // 8. Discover, and hold.
    async (page) => {
      await click(page, rail(page, 'discover'))
      await recommendedProjects(page).waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 760, 520, { pause: 0, steps: 30 })
    },
  ],
}
