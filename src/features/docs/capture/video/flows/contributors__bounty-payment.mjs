// From pull request to payment: the Bounties page, the rules page's
// Assignment section, the rows for each stage, then the ledger's payouts.
import { world, BOUNTIES } from '../../world/index.mjs'
import { startWith, click, point, scrollTo, scrollToY, zoom, unzoom, park } from './_money-motion.mjs'

const id = (repo, n) => BOUNTIES.find((b) => b.repo === repo && b.issueNumber === n).id
const row = (page, bounty) => page.locator(`[data-testid="bounty-${bounty}"]`)
const IN_REVIEW = id('northfield-oss/anchorage', 132)
const PAYABLE = id('tidewater-labs/tide-sdk', 61)
const PAID = id('northfield-oss/anchorage', 109)
const loaded = (page) => page.getByText('You are in the draw for this bounty', { exact: false }).first()
const card = (page, text) => page.locator('div.rounded-\\[24px\\]').filter({ has: page.getByText(text, { exact: true }) }).last()
const go = async (page, path, ready) => {
  await page.goto(new URL(path, page.url()).href)
  await ready(page).waitFor({ timeout: 20000 })
  await page.waitForTimeout(400)
}

export default {
  start: startWith(world('contributor'), { url: '/dashboard?tab=bounties', ready: loaded }),
  segments: [
    // 1. The Bounties page, with the open bounties list.
    async (page) => {
      await page.waitForTimeout(1200)
      await scrollTo(page, page.getByText(/^\d+ bounties open$/), { offset: 8 })
      await point(page, row(page, id('kestrel-data/sieve', 17)).getByText('Document the filter DSL'))
    },
    // 2. The rules page, Assignment section, assignment_stale_hours.
    async (page) => {
      await park(page)
      await go(page, '/bounties/rules', (p) => p.getByText('assignment_stale_hours', { exact: true }))
      await page.waitForTimeout(600)
      const section = page.locator('div').filter({ has: page.locator('h2', { hasText: /^Assignment$/ }) }).last()
      await scrollTo(page, section, { offset: 40 })
      await point(page, page.getByText('assignment_stale_hours', { exact: true }))
    },
    // 3. Back to the Bounties page, zoomed on the PR in review row.
    async (page) => {
      await park(page)
      await go(page, '/dashboard?tab=bounties', loaded)
      await scrollTo(page, row(page, IN_REVIEW), { block: 'center' })
      await point(page, row(page, IN_REVIEW).getByText('PR in review'))
      await zoom(page, row(page, IN_REVIEW), { scale: 1.7 })
    },
    // 4. How to claim a bounty, its last line of rules.
    async (page) => {
      await unzoom(page)
      const how = card(page, 'How to claim a bounty')
      await scrollTo(page, how, { block: 'end', offset: 40 })
      await point(page, how.getByText('Self-merged pull requests are not paid', { exact: false }))
    },
    // 5. The Awaiting approval row, zoomed.
    async (page) => {
      await scrollTo(page, row(page, PAYABLE), { block: 'center' })
      await point(page, row(page, PAYABLE).getByText('Awaiting approval'))
      await zoom(page, row(page, PAYABLE), { scale: 1.7 })
    },
    // 6. Paid, hovering a paid bounty's transaction link.
    async (page) => {
      await unzoom(page)
      await scrollTo(page, page.getByText(/^Paid$/).first(), { offset: 24 })
      await point(page, row(page, PAID).getByRole('link', { name: 'transaction' }))
    },
    // 7. Open the ledger, then Payouts.
    async (page) => {
      await scrollToY(page, 0, { ms: 1000 })
      await click(page, page.getByRole('link', { name: 'Open the ledger' }))
      const filters = page.locator('section[aria-label="Filters"]')
      await filters.getByRole('button', { name: 'Payouts' }).waitFor({ timeout: 20000 })
      await page.waitForTimeout(500)
      await scrollTo(page, filters, { offset: 8 })
      await click(page, filters.getByRole('button', { name: 'Payouts' }))
      await point(page, page.locator('[aria-label="Ledger events"]').getByText(/→ priya-kern$/).first())
    },
  ],
}
