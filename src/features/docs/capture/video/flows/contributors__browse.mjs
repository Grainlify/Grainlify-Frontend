// Browse projects and organizations (contributor, mira-dev).

import { world } from '../../world/index.mjs'
import { mainThreadAnimations, cursor, setupDone, click, point, moveTo, scrollBy, scrollTo, type, stable, wait } from './_start-motion.mjs'

const w = world('contributor')

const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)
const orgCards = (page) => page.locator('div.rounded-\\[16px\\].border.p-6').filter({ visible: true })
const repoCards = (page) => page.locator('div.rounded-\\[16px\\].border.p-5').filter({ visible: true })
const filterList = (page) => page.locator('div.w-\\[340px\\]').first()
const chip = (page, text) => page.locator('span.rounded-full', { hasText: text }).first()
const heading = (page, level, name) => page.getByRole('heading', { level, name, exact: true }).first()

export default {
  start: {
    url: '/dashboard?tab=discover',
    ...w,
    init: [...w.init, cursor(), setupDone(), mainThreadAnimations()],
    ready: (page) => page.getByText('Recommended Issues').first(),
  },
  segments: [
    // 1. Click Browse in the rail; it opens on Organizations.
    async (page) => {
      await wait(page, 600)
      await click(page, rail(page, 'browse'))
      await page.getByText('kestrel-data').first().waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 700, 500, { pause: 0 })
    },
    // 2. Pointer slowly across the first two organisation cards.
    async (page) => {
      await point(page, orgCards(page).nth(0), { steps: 35, pause: 1600 })
      await point(page, orgCards(page).nth(1), { steps: 45, pause: 1600 })
    },
    // 3. Repositories; scroll down a little to show a full row, then back up.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Repositories', exact: true }))
      await page.getByText('orbit-wallet').first().waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 760, 560, { pause: 800 })
      await scrollBy(page, 320)
      await wait(page, 1600)
      await scrollBy(page, -320)
    },
    // 4. Language > Select languages > search "type" > tick TypeScript > close.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Language', exact: true }))
      await click(page, page.getByRole('button', { name: 'Select languages' }))
      await click(page, page.getByPlaceholder('Search languages...'))
      await type(page, 'type')
      await wait(page, 500)
      await click(page, filterList(page).locator('button', { hasText: 'TypeScript' }).first())
      await stable(page, 4000)
      await wait(page, 600)
      await click(page, filterList(page).locator('button:has(svg.lucide-x)').first())
    },
    // 5. Point at the TypeScript chip, then its cross; the full list returns.
    async (page) => {
      await point(page, chip(page, 'TypeScript'), { pause: 1400, dx: -8 })
      await click(page, chip(page, 'TypeScript').locator('button'))
      await stable(page, 4000)
    },
    // 6. Open the first repository; scroll to Issues, then Recent Activity.
    async (page) => {
      await click(page, repoCards(page).first(), { dy: -20 })
      await heading(page, 2, 'Issues').waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 900, 500, { pause: 100 })
      await scrollTo(page, heading(page, 2, 'Issues'), { top: 120 })
      await wait(page, 800)
      await scrollTo(page, heading(page, 2, 'Recent Activity'), { top: 120 })
    },
    // 7. Back to Browse (Organizations), open the first organisation, scroll to Repositories.
    async (page) => {
      await click(page, page.getByRole('button', { name: /Back to Browse/ }))
      await orgCards(page).first().waitFor({ timeout: 15000 })
      await stable(page)
      await wait(page, 300)
      await click(page, orgCards(page).first())
      await heading(page, 2, 'Repositories').waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 700, 500, { pause: 300 })
      await scrollTo(page, heading(page, 2, 'Repositories'), { top: 120 })
    },
    // 8. The first repository under Repositories; the project page opens.
    async (page) => {
      const list = page.locator('div', { has: heading(page, 2, 'Repositories') }).last()
      await click(page, list.locator('div.rounded-\\[16px\\].border.p-5').first(), { dy: -20 })
      await heading(page, 2, 'Issues').waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 900, 600, { pause: 0 })
    },
  ],
}
