// Video flow for "Browse projects and organizations"
// (wip-notes/video-scripts/contributors__browse.md).

import { world } from '../../world/index.mjs'
import { videoInit, point, click, pause, scrollTo, stable, glide, type, segments } from './_human.mjs'

const C = world('contributor')
const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)
/** An organisation card in Browse > Organizations. */
const orgCard = (page, name) => page.locator('div.rounded-\\[16px\\].border.p-6', { has: page.getByText(name, { exact: true }) }).first()
/** A repository card in Browse > Repositories (or an organisation's Repositories). */
const repoCard = (page, name) => page.locator('div.rounded-\\[16px\\].border.p-5', { has: page.getByText(name, { exact: true }) }).first()
const filterList = (page) => page.locator('div.w-\\[340px\\]').first()
const chip = (page, text) => page.locator('span.rounded-full', { hasText: text }).first()

export default {
  start: {
    url: '/dashboard?tab=discover',
    persona: C.persona,
    api: C.api,
    agent: C.agent,
    init: [...C.init, ...videoInit()],
    ready: (page) => page.getByRole('heading', { name: 'Recommended Issues' }),
  },
  segments: segments([
    // 1. Browse in the rail; it opens on Organizations.
    async (page) => {
      await pause(page, 500)
      await point(page, rail(page, 'browse'), { ms: 900, hold: 700 })
      await click(page, rail(page, 'browse'), { ms: 100, after: 500 })
      await orgCard(page, 'kestrel-data').waitFor()
      await stable(page)
    },
    // 2. Slowly across the first two organisation cards.
    async (page) => {
      const a = await orgCard(page, 'kestrel-data').boundingBox()
      const b = await orgCard(page, 'northfield-oss').boundingBox()
      await glide(page, a.x + 40, a.y + a.height * 0.45, 900)
      await glide(page, a.x + a.width / 2, a.y + a.height * 0.62, 1500)
      await glide(page, b.x + b.width / 2, b.y + b.height * 0.62, 1800)
      await glide(page, b.x + b.width - 40, b.y + b.height * 0.8, 1300)
    },
    // 3. Repositories: every project on its own card. (All eight fit on a
    // 1440x900 screen, so the pointer runs along the rows instead of scrolling.)
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Repositories', exact: true }), { after: 400 })
      await repoCard(page, 'perch').waitFor()
      await stable(page)
      const first = await repoCard(page, 'ledgerline').boundingBox()
      const last = await repoCard(page, 'perch').boundingBox()
      await glide(page, first.x + first.width / 2, first.y + first.height * 0.66, 900)
      await glide(page, first.x + first.width * 4.3, first.y + first.height * 0.66, 2200)
      await glide(page, last.x + last.width / 2, last.y + last.height * 0.66, 1400)
    },
    // 4. Language > Select languages, search "type", tick TypeScript, close the list.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Language', exact: true }), { ms: 800, after: 400 })
      await click(page, page.getByRole('button', { name: /Select languages/ }), { ms: 600, after: 500 })
      await type(page, page.getByPlaceholder('Search languages...'), 'type', { delay: 110 })
      await click(page, filterList(page).locator('button', { hasText: 'TypeScript' }).first(), { ms: 600, after: 700 })
      await click(page, filterList(page).locator('button').first(), { ms: 600, after: 400 })
      await stable(page)
    },
    // 5. The TypeScript chip above the toggle; its cross removes it.
    async (page) => {
      await point(page, chip(page, 'TypeScript'), { ms: 900, hold: 1600 })
      await click(page, chip(page, 'TypeScript').locator('button'), { ms: 500, after: 600 })
      await repoCard(page, 'perch').waitFor()
      await glide(page, 900, 520, 900)
    },
    // 6. The first repository card, then Issues and Recent Activity on its page.
    async (page) => {
      await click(page, repoCard(page, 'ledgerline').getByText('ledgerline', { exact: true }), { ms: 800, after: 500 })
      await page.getByText('Document the snapshot format').first().waitFor({ timeout: 15000 })
      await stable(page)
      await pause(page, 500)
      await scrollTo(page, page.getByText(/^Issues/).filter({ visible: true }).first(), { top: 110, ms: 1400 })
      await pause(page, 1400)
      await scrollTo(page, page.getByText('Recent Activity', { exact: true }).first(), { top: 110, ms: 1400 })
    },
    // 7. Back to Browse (Organizations), the first organisation, its Repositories.
    async (page) => {
      await click(page, page.getByRole('button', { name: /Back to Browse/ }).first(), { ms: 900, after: 400 })
      await orgCard(page, 'kestrel-data').waitFor()
      await pause(page, 700)
      await click(page, orgCard(page, 'kestrel-data'), { ms: 800, after: 500 })
      await stable(page)
      await scrollTo(page, page.getByRole('heading', { name: /^Repositories/ }).first(), { top: 110, ms: 1400 })
    },
    // 8. The first repository there opens its project page.
    async (page) => {
      await click(page, page.getByText('sieve', { exact: true }).first(), { ms: 900, after: 500 })
      await stable(page)
      await glide(page, 900, 420, 900)
    },
  ]),
}
