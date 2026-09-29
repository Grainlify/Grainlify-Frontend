// Add your repositories, as owen-maintains (tidewater-labs). GitHub's own
// pages are never shown: a title card stands in for them, and the return is
// the real redirect URL (?github_app_installed=true) with
// tidewater-labs/harbor-bridge installed and waiting for setup.
import { setupWorld } from './_paced-setup.mjs'
import { click, point, park, wait, titleCard, cutTo, scrollBy } from './_paced.mjs'

const w = setupWorld()
const ORG = 'tidewater-labs'
const role = (page, name) => page.getByRole('button', { name, exact: true })
const modal = (page, heading) => page.locator('div[class*="shadow-[0_"]').filter({ has: page.getByText(heading, { exact: true }) }).last()
const selectorButton = (page) => page.getByRole('button', { name: 'Select repositories' })
const orgButton = (page) => page.getByText(ORG, { exact: true }).first()
const repoRow = (page, name) => page.locator('label').filter({ has: page.getByText(name, { exact: true }) }).first()

export default {
  start: {
    url: '/dashboard?tab=maintainers&view=maintainer',
    ...w,
    ready: (page) => page.getByText('Pull Requests Merged'),
  },
  segments: [
    // 1. The Maintainers page on its Dashboard tab.
    async (page) => {
      await park(page, 300)
      await wait(page, 800)
    },
    // 2. Select repositories; expand the owner; point at Add a repository.
    async (page) => {
      await click(page, selectorButton(page))
      await click(page, orgButton(page))
      await page.getByText('Complete setup').first().waitFor()
      await wait(page, 500)
      await point(page, page.getByText('Add a repository'), { pause: 600 })
    },
    // 3. Add a repository: the install window; scroll past the permissions to "You stay in control".
    async (page) => {
      await click(page, page.getByText('Add a repository'))
      await page.getByText('Required permissions').waitFor()
      const m = modal(page, 'Required permissions')
      await point(page, m.getByText('Required permissions'), { pause: 900 })
      // The window may fit the screen; either way the pointer reads down the list.
      const items = m.locator('div.space-y-2\\.5 > div')
      const n = await items.count()
      for (let i = 0; i < n; i++) await point(page, items.nth(i), { pause: 700, dx: -120 })
      await scrollBy(page, 200)
      await point(page, m.getByText('You stay in control:'), { pause: 600 })
    },
    // 4. Point at Install GitHub App without clicking; Cancel; the GitHub title card.
    async (page) => {
      const m = modal(page, 'Required permissions')
      await point(page, m.getByRole('button', { name: /Install GitHub App/ }), { pause: 1200 })
      await click(page, m.getByRole('button', { name: 'Cancel' }))
      await wait(page, 300)
      await titleCard(page, 'On GitHub: choose Only select repositories, pick yours, and install.')
    },
    // 5. Back from GitHub: Discover, in the contributor view.
    async (page) => {
      await cutTo(page, '/dashboard?github_app_installed=true', (p) => role(p, 'MAINTAINER'))
      await park(page, 300)
    },
    // 6. MAINTAINER; wait for the New Project Setup window for harbor-bridge.
    async (page) => {
      await click(page, role(page, 'MAINTAINER'))
      await page.getByText('New Project Setup').waitFor({ timeout: 15000 })
      await park(page, 300)
    },
    // 7. Ecosystem, Save & Continue; then the selector shows Edit beside harbor-bridge.
    async (page) => {
      await click(page, page.getByRole('button', { name: /Select an ecosystem/ }))
      await click(page, page.getByRole('option', { name: 'Solana' }))
      await click(page, page.getByRole('button', { name: 'Save & Continue' }))
      await page.getByText('Project details saved.').waitFor()
      await page.getByText('New Project Setup').waitFor({ state: 'detached' })
      await wait(page, 400)
      await click(page, selectorButton(page))
      const row = repoRow(page, 'harbor-bridge')
      // The owner stays expanded from before; expand it only if it is not.
      await wait(page, 300)
      if (!(await row.isVisible())) await click(page, orgButton(page))
      await row.getByText('Edit', { exact: true }).waitFor()
      await point(page, row.getByText('harbor-bridge', { exact: true }), { pause: 500, tip: 'right' })
    },
  ],
}
