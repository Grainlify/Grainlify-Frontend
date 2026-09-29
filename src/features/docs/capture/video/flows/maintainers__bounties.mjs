// Bounties on your repositories, as owen-maintains on the Bounties page.
// The fixture world's drawn bounty on his repositories is
// tidewater-labs/ledgerline #240, held by jun-okafor.

import { world } from '../../world/index.mjs'
import { initScripts, point, click, scrollTo, scrollBy, titleCard, titleCardAdd, titleCardClose, wait, waitStable } from './_am.mjs'

const W = world('maintainer')
const HELD = 'Add a `ledgerline inspect` CLI subcommand'

const bountyCard = (page, title) => page.locator('div[class*="rounded-["]', { has: page.getByText(title, { exact: true }) }).last()

export default {
  start: {
    url: '/dashboard?tab=bounties',
    ...W,
    init: initScripts(W),
    ready: (page) => page.getByText(HELD, { exact: true }),
  },
  segments: [
    // 1. The Bounties page, at the top.
    async (page) => {
      await waitStable(page)
      await point(page, page.getByRole('heading', { name: 'Open bounties' }), { pause: 600, left: 90 })
    },
    // 2. The status notice, then the open bounties.
    async (page) => {
      await point(page, page.getByText('Bounties pay real', { exact: false }).first(), { pause: 1400, left: 110 })
      await scrollTo(page, page.getByText(/bounties open/i).first(), { top: 110 })
      await point(page, page.getByText(/^Applications close in/).first(), { pause: 600, left: 150 })
    },
    // 3. The bounty on ledgerline, held by the one drawn.
    async (page) => {
      const c = bountyCard(page, HELD)
      await scrollTo(page, c, { top: 330 })
      await point(page, c.getByText(HELD, { exact: true }), { pause: 700, left: 120 })
      await point(page, c.getByText(/^Assigned to jun-okafor/), { pause: 400, left: 70 })
    },
    // 4. On GitHub: the advisory review.
    async (page) => {
      await titleCard(page, { eyebrow: 'On GitHub', lines: ['Advisory review for bounty on #12: Looks complete.'] })
    },
    // 5. Your merge is the gate.
    async (page) => {
      await wait(page, 1200)
      await titleCardAdd(page, 'You merge on GitHub.')
    },
    // 6. Back on Bounties: the ledger.
    async (page) => {
      await scrollTo(page, page.getByRole('link', { name: 'Open the ledger' }), { top: 300 })
      await titleCardClose(page)
      await click(page, page.getByRole('link', { name: 'Open the ledger' }))
      await page.getByRole('button', { name: 'All bounties' }).waitFor()
      await waitStable(page)
      await wait(page, 800)
      await scrollBy(page, 420)
    },
    // 7. The rule: write access means you cannot win.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'All bounties' }))
      await page.getByText(HELD, { exact: true }).waitFor()
      await waitStable(page)
      const rules = page.getByText(/Maintainers of a repository cannot win its bounties/)
      await scrollTo(page, page.getByText('How to claim a bounty', { exact: true }), { top: 380 })
      await point(page, rules, { pause: 400, left: 960, dy: -7 })
    },
  ],
}
