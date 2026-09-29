// Apply for a bounty (contributor with a linked wallet).
//
// kestrel-data/sieve #17 ("Document the filter DSL") starts not applied for
// and turns to "in the draw" once mira-dev applies (world/extra-bounties.mjs).
// The public rules page has no link from the Bounties page, so it is opened
// by its address (in-page, as the app's router does) and left with Back.

import { world, BOUNTIES } from '../../world/index.mjs'
import { APPLY_BOUNTY_ID, bountyApplyApi } from '../../world/extra-bounties.mjs'
import { mainThreadAnimations, cursor, reveal, click, point, moveTo, scrollBy, scrollTo, type, stable, wait, zoomOn } from './_start-motion.mjs'

const w = world('contributor')
const bountyId = (repo, n) => BOUNTIES.find((b) => b.repo === repo && b.issueNumber === n).id
const NEWCOMER = bountyId('saltmarsh/orbit-wallet', 41)

const row = (page, id) => page.locator(`[data-testid="bounty-${id}"]`)
const openRow = (page) => row(page, APPLY_BOUNTY_ID)
const go = (page, url) =>
  page.evaluate((u) => {
    window.history.pushState({}, '', u)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, url)

export default {
  start: {
    url: '/dashboard?tab=bounties',
    ...w,
    api: { ...w.api, ...bountyApplyApi() },
    init: [...w.init, cursor(), mainThreadAnimations()],
    ready: (page) => openRow(page).getByRole('button', { name: 'Apply for this bounty' }),
  },
  segments: [
    // 1. Scroll to the open bounties list.
    async (page) => {
      await wait(page, 1200)
      await moveTo(page, 760, 560, { pause: 200 })
      await scrollTo(page, openRow(page), { top: 150 })
      await moveTo(page, 820, 520, { pause: 0 })
    },
    // 2. Zoom in on the open bounty's "Applications close in ... A few applicants so far." line.
    async (page) => {
      const line = openRow(page).getByText('A few applicants so far.', { exact: false }).first()
      await point(page, line, { dx: -60, pause: 300, steps: 25 })
      await zoomOn(page, line, { scale: 2.2, hold: 7000, text: true })
    },
    // 3. Type a note in "Anything you want to add (optional)".
    async (page) => {
      await click(page, openRow(page).getByLabel('Anything you want to add (optional)'))
      await type(page, 'I fixed a similar parser bug in this repository last month.')
    },
    // 4. Apply for this bounty: the row says you are in the draw.
    async (page) => {
      await click(page, openRow(page).getByRole('button', { name: 'Apply for this bounty' }))
      const inDraw = openRow(page).getByText('You are in the draw for this bounty', { exact: false })
      await inDraw.waitFor({ timeout: 10000 })
      await wait(page, 300)
      await point(page, inDraw, { steps: 25, pause: 0 })
    },
    // 5. /bounties/rules: hold on "Prior wins are capped at", then scroll through Weights.
    async (page) => {
      await go(page, '/bounties/rules')
      const cap = page.getByText('Prior wins are capped at', { exact: false }).first()
      await cap.waitFor({ timeout: 15000 })
      await stable(page)
      await point(page, cap, { steps: 25, pause: 3500 })
      const weights = page.locator('h2', { hasText: /^Weights$/ }).first()
      await moveTo(page, 760, 560, { pause: 0 })
      await scrollTo(page, weights, { top: 90 })
      await wait(page, 1200)
      await scrollBy(page, 260)
      await wait(page, 1500)
    },
    // 6. Back up to "What the draw cannot see".
    async (page) => {
      const cannot = page.getByText('What the draw cannot see', { exact: true }).first()
      await scrollTo(page, cannot, { top: 140 })
      await point(page, cannot, { steps: 25, pause: 0, scroll: false })
    },
    // 7. Back to the Bounties page; point at the row marked First bounty only.
    async (page) => {
      await page.evaluate(() => window.history.back())
      const first = row(page, NEWCOMER)
      await first.waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 760, 560, { pause: 0 })
      await scrollTo(page, first, { top: 200 })
      await point(page, first.getByText('First bounty only', { exact: true }).first(), { steps: 25, pause: 0 })
    },
    // 8. A row that says "Assigned to ...".
    async (page) => {
      const assigned = page.getByText(/^Assigned to /).first()
      await reveal(page, assigned)
      const b = await assigned.boundingBox()
      await point(page, assigned, { dx: -b.width / 2 + 160, steps: 25, pause: 0, scroll: false })
    },
  ],
}
