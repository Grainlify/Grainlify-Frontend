// What GrainHack is: the events list and its phases, an event in issue prep,
// the live event's issues, then My GrainHack.
import { world } from '../../world/index.mjs'
import { eventsWithSettledApi } from '../../world/extra-bounties.mjs'
import { startWith, click, point, scrollTo, scrollToY } from './_money-motion.mjs'

const eventRow = (page, name) => page.getByRole('button').filter({ has: page.getByText(name, { exact: true }) }).first()
const phase = (page, label) => page.locator('span.rounded-full').filter({ hasText: new RegExp(`^${label}$`) }).first()
const issueRow = (page, title) => page.locator('div.rounded-\\[16px\\]').filter({ hasText: title }).filter({ has: page.getByRole('button', { name: 'View issue' }) }).last()
const allEvents = (page) => page.getByRole('button', { name: 'All events' })
const rail = (page, id) => page.locator(`aside [data-tour-id="${id}"]`)

export default {
  start: startWith(world('contributor'), {
    url: '/dashboard?tab=osw',
    api: eventsWithSettledApi(),
    ready: (page) => page.getByText('GrainHack Spring 2026'),
  }),
  segments: [
    // 1. Live events, panned down the list.
    async (page) => {
      await page.waitForTimeout(500)
      const names = await page.locator('button p.font-semibold').allTextContents()
      for (const name of names) await point(page, eventRow(page, name).locator('p').first(), { pause: 650 })
    },
    // 2. The phase labels; the event in Issue prep; back to All events.
    async (page) => {
      await point(page, phase(page, 'Applications open'), { pause: 1400 })
      await point(page, phase(page, 'Issue prep'), { pause: 900 })
      await click(page, eventRow(page, 'GrainHack Ledger Week').locator('p').first())
      await page.getByText('Issues are being added').waitFor({ timeout: 20000 })
      await point(page, page.getByText('Issues are being added'), { pause: 2200 })
      await click(page, allEvents(page))
    },
    // 3. The Live event: its issues, with the Contributor pool at the top.
    async (page) => {
      await click(page, eventRow(page, 'GrainHack Autumn 2026').locator('p').first())
      await page.getByText('Benchmark snapshot writes under load').waitFor({ timeout: 20000 })
      await page.waitForTimeout(400)
      await point(page, page.getByText('Contributor pool', { exact: true }), { pause: 1600 })
      await scrollTo(page, page.getByRole('button', { name: 'View issue' }).first(), { block: 'center' })
    },
    // 4. An issue row, holding on its difficulty label.
    async (page) => {
      const row = issueRow(page, 'Benchmark snapshot writes under load')
      await point(page, row.locator('span.font-semibold').first(), { pause: 800 })
      await point(page, row.locator('span.uppercase').first())
    },
    // 5. The "left to apply" line, then a Newcomers only label.
    async (page) => {
      await point(page, page.getByText(/left to apply/).first(), { pause: 2200 })
      await point(page, page.getByText('Newcomers only').first())
    },
    // 6. All events: Results published and Settled.
    async (page) => {
      await scrollToY(page, 0, { ms: 700 })
      await click(page, allEvents(page))
      await page.getByText('GrainHack Spring 2026').waitFor({ timeout: 20000 })
      await point(page, phase(page, 'Results published'), { pause: 1600 })
      await point(page, phase(page, 'Settled'))
    },
    // 7. My GrainHack, across its four tabs.
    async (page) => {
      await click(page, rail(page, 'my-grainhack'))
      await page.getByRole('button', { name: 'My assignments' }).waitFor({ timeout: 20000 })
      for (const tab of ['My assignments', 'My applications', 'My results', 'Rules']) {
        await point(page, page.getByRole('button', { name: tab, exact: true }), { pause: 500 })
      }
    },
  ],
}
