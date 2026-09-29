// Maintainer quick start, as owen-maintains: install, set up, first assignment.
// GitHub's own pages are never shown: a title card stands in for them, and the
// return is the real redirect URL (?github_app_installed=true).
import { setupWorld } from './_paced-setup.mjs'
import { click, point, park, wait, type, titleCard, clearTitleCard, cutTo, reveal } from './_paced.mjs'

const w = setupWorld()
const role = (page, name) => page.getByRole('button', { name, exact: true })
const modal = (page, heading) => page.locator('div[class*="shadow-[0_"]').filter({ has: page.getByText(heading, { exact: true }) }).last()
const issueRow = (page, title) => page.getByText(title, { exact: true }).first()

/** The application card for `login` (the chevron beside the name expands it). */
const applicationCard = (page, login) => page.locator('div.p-6', { has: page.locator('h4', { hasText: login }) }).first()

export default {
  start: {
    url: '/dashboard?tab=discover',
    ...w,
    ready: (page) => role(page, 'MAINTAINER'),
  },
  segments: [
    // 1. Discover as owen-maintains; hover the role switcher.
    async (page) => {
      await wait(page, 1200)
      await point(page, role(page, 'CONTRIBUTOR'), { pause: 900 })
      await point(page, role(page, 'MAINTAINER'), { pause: 900 })
    },
    // 2. MAINTAINER: the Maintainers page on its Dashboard tab.
    async (page) => {
      await click(page, role(page, 'MAINTAINER'), { pause: 300 })
      await page.getByText('Pull Requests Merged').waitFor()
      await park(page, 300)
    },
    // 3. Select repositories -> Add a repository: the install window; Cancel; a title card for GitHub.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Select repositories' }))
      await click(page, page.getByText('Add a repository'))
      await page.getByText('Required permissions').waitFor()
      await park(page, 300)
      await wait(page, 2600)
      await click(page, modal(page, 'Required permissions').getByRole('button', { name: 'Cancel' }))
      await wait(page, 300)
      await titleCard(page, 'On GitHub: pick your repositories and install.')
    },
    // 4. Back on Discover from GitHub; MAINTAINER; the New Project Setup window.
    async (page) => {
      await cutTo(page, '/dashboard?github_app_installed=true', (p) => role(p, 'MAINTAINER'))
      await wait(page, 700)
      await click(page, role(page, 'MAINTAINER'))
      await page.getByText('New Project Setup').waitFor({ timeout: 15000 })
      await park(page, 300)
    },
    // 5. Description, ecosystem, Save & Continue.
    async (page) => {
      await click(page, page.getByPlaceholder('Brief description of the project'), { pause: 250 })
      await type(page, 'Bridges Tidewater channel balances into harbour accounts.')
      await wait(page, 300)
      await click(page, page.getByRole('button', { name: /Select an ecosystem/ }))
      await click(page, page.getByRole('option', { name: 'Solana' }))
      await click(page, page.getByRole('button', { name: 'Save & Continue' }))
      await page.getByText('Project details saved.').waitFor()
      await page.getByText('New Project Setup').waitFor({ state: 'detached' })
      await park(page, 300)
    },
    // 6. Issues tab; an issue with 3 applicants.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Issues', exact: true }))
      const row = issueRow(page, 'Document the snapshot format')
      await row.waitFor()
      await wait(page, 500)
      await click(page, row)
      await page.getByText(/Applications \(3\)/).waitFor()
      await park(page, 300)
    },
    // 7. Expand the first applicant; Assign.
    async (page) => {
      const card = applicationCard(page, 'jun-okafor')
      await click(page, card.locator('button').nth(1))
      const assign = page.getByRole('button', { name: 'Assign', exact: true }).first()
      await assign.waitFor()
      await reveal(page, assign)
      await wait(page, 900)
      await click(page, assign)
      await page.getByText('Assigned', { exact: true }).first().waitFor()
      await park(page, 300)
    },
    // 8. Pull Requests tab; hover an open pull request.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Pull Requests', exact: true }))
      const pr = page.getByText('Retry channel close with capped backoff').first()
      await pr.waitFor()
      await wait(page, 400)
      await point(page, pr, { pause: 600 })
    },
  ],
}
