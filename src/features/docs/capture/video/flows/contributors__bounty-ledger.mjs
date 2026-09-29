// The bounty ledger: header and banner, totals, inference budget, receipt
// chain, the filters, the Proof column, and the gate and test rows.
import { world } from '../../world/index.mjs'
import { startWith, click, point, scrollTo } from './_money-motion.mjs'

const loaded = (page) => page.getByText('You are in the draw for this bounty', { exact: false }).first()
const totals = (page) => page.locator('section[aria-label="Totals"]')
const budget = (page) => page.locator('section[aria-labelledby="ledger-budget"]')
const chain = (page) => page.locator('section[aria-labelledby="ledger-chain"]')
const filters = (page) => page.locator('section[aria-label="Filters"]')
const events = (page) => page.locator('[aria-label="Ledger events"]')
const rows = (page) => events(page).locator('> div.divide-y > div')

export default {
  start: startWith(world('contributor'), { url: '/dashboard?tab=bounties', ready: loaded }),
  segments: [
    // 1. Open the ledger; its header loads.
    async (page) => {
      await page.waitForTimeout(600)
      await click(page, page.getByRole('link', { name: 'Open the ledger' }))
      await page.getByRole('heading', { name: 'Bounty Ledger' }).waitFor({ timeout: 20000 })
      await point(page, page.getByRole('heading', { name: 'Bounty Ledger' }))
    },
    // 2. The banner, then the All time tiles, panned across.
    async (page) => {
      await point(page, page.locator('div[role="status"]').first().locator('p').first())
      await page.waitForTimeout(1200)
      await scrollTo(page, totals(page), { offset: 70 })
      const tiles = totals(page).locator('div.grid > div')
      for (let i = 0; i < 4; i++) await point(page, tiles.nth(i).locator('span').first(), { pause: 1400 })
    },
    // 3. Inference budget.
    async (page) => {
      await scrollTo(page, budget(page), { offset: 16 })
      await point(page, budget(page).getByRole('heading', { name: 'Inference budget' }), { pause: 800 })
      const phases = budget(page).locator('div.flex-col.gap-2')
      const n = await phases.count()
      for (let i = 0; i < n; i++) await point(page, phases.nth(i).locator('span').first(), { pause: 350 })
      await point(page, budget(page).getByText('each stop at that ceiling on their own', { exact: false }))
    },
    // 4. Receipt chain, down its rows.
    async (page) => {
      await point(page, chain(page).getByRole('heading', { name: /Receipt chain/ }), { pause: 900 })
      const steps = chain(page).locator('div.rounded-\\[16px\\]')
      const n = await steps.count()
      for (let i = 0; i < n; i++) {
        const s = steps.nth(i)
        const b = await s.boundingBox()
        if (b.y + b.height > 860) await scrollTo(page, s, { block: 'end', offset: 30, ms: 500 })
        await point(page, s.locator('span').first(), { pause: 700 })
      }
    },
    // 5. 30 days, then Payouts.
    async (page) => {
      await scrollTo(page, filters(page), { offset: 16 })
      await click(page, filters(page).getByRole('button', { name: '30 days' }), { after: 900 })
      await click(page, filters(page).getByRole('button', { name: 'Payouts' }), { after: 500 })
      await point(page, rows(page).first().getByText(/→/), { pause: 300 })
    },
    // 6. A row's link in the Proof column.
    async (page) => {
      await point(page, events(page).getByText('Proof', { exact: true }), { pause: 900 })
      await point(page, rows(page).first().locator('a').last(), { pause: 1500 })
      await point(page, rows(page).nth(1).locator('a').last())
    },
    // 7. All time, then Bounties: a Gate passed row, then an event marked test.
    // Every event in this ledger is from the devnet run, so every chip carries
    // "test": the pointer rests on a Gate passed chip, a Gate refused chip, and
    // then the note that explains "test".
    async (page) => {
      await click(page, filters(page).getByRole('button', { name: 'All time' }), { after: 600 })
      await click(page, filters(page).getByRole('button', { name: 'Bounties' }), { after: 700 })
      const chip = (label) => rows(page).getByText(new RegExp(`^${label} · test$`)).first()
      await scrollTo(page, chip('Gate passed'), { block: 'center' })
      await point(page, chip('Gate passed'), { pause: 1400 })
      await point(page, chip('Gate refused'), { pause: 1400 })
      await point(page, page.getByText('Rows marked "test" are the devnet run', { exact: false }))
    },
  ],
}
