// Review applications, as owen-maintains on tidewater-labs/ledgerline #212
// "Document the snapshot format" (three applications: jun-okafor, priya-kern,
// tomas-rivet).
import { world } from '../../world/index.mjs'
import { click, point, park, wait, reveal, cursor, setupDone } from './_paced.mjs'

const w = world('maintainer')
const ISSUE = 'Document the snapshot format'
const role = (page, name) => page.getByRole('button', { name, exact: true })

/** The funnel button to the right of Search in the issue list. */
const filterButton = (page) =>
  page.getByPlaceholder('Search', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"flex-1")][1]/following-sibling::button[1]')
const filterOption = (page, group, option) =>
  page.locator('div', { has: page.getByRole('heading', { name: group, exact: true }) }).last().getByRole('button', { name: option, exact: true })

/** The application card for `login`; its second button is the chevron that expands it. */
const card = (page, login) => page.locator('div.p-6', { has: page.locator('h4', { hasText: login }) }).first()
const chevron = (page, login) => card(page, login).locator('button').nth(1)

async function expand(page, login) {
  await click(page, chevron(page, login))
  await wait(page, 400)
}

export default {
  start: {
    url: '/dashboard?tab=maintainers&view=maintainer&subtab=Issues',
    ...w,
    init: [...w.init, setupDone, cursor],
    ready: (page) => page.getByText(ISSUE).first(),
  },
  segments: [
    // 1. The Issues tab: the list on the left, "Select an issue" on the right.
    async (page) => {
      await park(page, 300)
      await wait(page, 600)
      await point(page, page.getByText(ISSUE).first(), { pause: 900 })
      await park(page, 400)
    },
    // 2. Filter: Applicants Yes, Assignee No, Apply.
    async (page) => {
      await click(page, filterButton(page))
      await page.getByText('All Filters').waitFor()
      await wait(page, 400)
      await click(page, filterOption(page, 'Applicants', 'Yes'))
      await click(page, filterOption(page, 'Assignee', 'No'))
      await click(page, page.getByRole('button', { name: 'Apply', exact: true }))
      await page.getByText('All Filters').waitFor({ state: 'detached' })
      await park(page, 400)
    },
    // 3. Open the issue; expand the first application.
    async (page) => {
      await click(page, page.getByText(ISSUE).first())
      await page.getByText(/Applications \(3\)/).waitFor()
      await wait(page, 600)
      await expand(page, 'jun-okafor')
      await park(page, 400)
    },
    // 4. Expand the second application; Reject.
    async (page) => {
      await expand(page, 'priya-kern')
      const reject = card(page, 'priya-kern').getByRole('button', { name: 'Reject', exact: true })
      await reveal(page, reject)
      await wait(page, 500)
      await click(page, reject)
      await park(page, 400)
    },
    // 5. Expand the first application again; Assign: the applications show Assigned.
    async (page) => {
      const first = card(page, 'jun-okafor')
      if (!(await first.getByRole('button', { name: 'Assign', exact: true }).isVisible())) await expand(page, 'jun-okafor')
      const assign = first.getByRole('button', { name: 'Assign', exact: true })
      await reveal(page, assign)
      await wait(page, 400)
      await click(page, assign)
      await page.getByText('Assigned', { exact: true }).first().waitFor()
      await park(page, 400)
    },
    // 6. Point at Unassign on the first application.
    async (page) => {
      const unassign = card(page, 'jun-okafor').getByRole('button', { name: 'Unassign' })
      await reveal(page, unassign)
      await point(page, unassign, { pause: 800 })
    },
    // 7. CONTRIBUTOR; Browse; ledgerline; the same issue: no buttons. MAINTAINER again.
    async (page) => {
      await click(page, role(page, 'CONTRIBUTOR'))
      await click(page, page.locator('aside [data-tour-id="browse"]'))
      await click(page, page.getByRole('button', { name: 'Repositories' }))
      await click(page, page.getByText('ledgerline', { exact: true }).first())
      await page.getByText('Overview').first().waitFor()
      await wait(page, 500)
      await click(page, page.getByRole('heading', { name: ISSUE }).first())
      await page.getByText(/Applications \(3\)/).waitFor()
      await expand(page, 'jun-okafor')
      // Down to the end of the expanded application, where the maintainer's buttons were.
      await reveal(page, card(page, 'jun-okafor'), { block: 'nearest', margin: 40 })
      await park(page, 400)
      await wait(page, 1500)
      await click(page, role(page, 'MAINTAINER'))
      await park(page, 300)
    },
  ],
}
