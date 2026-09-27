// Video flow for "Ranks and the leaderboard"
// (wip-notes/video-scripts/contributors__ranks-and-leaderboard.md).
// "Zoom on" is shown as a highlight around the rank card.

import { world, PROJECTS } from '../../world/index.mjs'
import { videoInit, point, click, pause, scrollTo, stable, glide, spotlight, unspotlight, segments } from './_human.mjs'

const C = world('contributor')

/**
 * The world's project board ignores the ecosystem filter. Answer it the way
 * the script describes the product: only organisations with projects in that
 * ecosystem, counted on those projects alone, and ranked again.
 */
function projectBoardByEcosystem(req) {
  const all = C.api['/leaderboard/projects'](req)
  const q = new URL(req.url()).searchParams
  const eco = q.get('ecosystem')?.toLowerCase()
  if (!eco) return all
  const scale = q.get('window') === 'all' ? 2 : 1
  const rows = all.projects
    .filter((r) => r.ecosystems.some((e) => e.toLowerCase() === eco))
    .map((r) => {
      const own = PROJECTS.filter((p) => p.github_full_name.startsWith(r.name + '/'))
      const inEco = own.filter((p) => p.ecosystem.toLowerCase() === eco)
      const contributors = inEco.reduce((s, p) => s + p.contributors, 0) * scale
      const merged = Math.round((r.merged_prs * inEco.length) / own.length)
      return { ...r, ecosystems: [inEco[0].ecosystem], contributors, merged_prs: merged, score: contributors * 10 + merged * 5 }
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }))
  return { ...all, projects: rows, total: rows.length }
}
const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)
const period = (page, name) => page.getByRole('button', { name, exact: true })
const heading = (page, re) => page.getByRole('heading', { name: re }).first()

export default {
  start: {
    url: '/dashboard?tab=discover',
    persona: C.persona,
    api: { ...C.api, '/leaderboard/projects': projectBoardByEcosystem },
    agent: C.agent,
    init: [...C.init, ...videoInit()],
    ready: (page) => page.getByRole('heading', { name: 'Recommended Issues' }),
  },
  segments: segments([
    // 1. Leaderboard in the rail: Seasonal Contributors and the podium.
    async (page) => {
      await pause(page, 500)
      await click(page, rail(page, 'leaderboard'), { ms: 1100, after: 500 })
      await heading(page, /Seasonal Contributors/).waitFor()
      await stable(page)
      await glide(page, 760, 560, 1000)
    },
    // 2. This season in the period toggle, then down to the table.
    async (page) => {
      await point(page, period(page, 'This season'), { ms: 1000, hold: 1600 })
      await scrollTo(page, period(page, 'This season'), { top: 90, ms: 1500 })
      await glide(page, 700, 520, 900)
    },
    // 3. All time (the heading changes), then This season again.
    async (page) => {
      await click(page, period(page, 'All time'), { ms: 900, after: 500 })
      await scrollTo(page, heading(page, /All-Time Contributors/), { top: 150, ms: 1100 })
      await pause(page, 1300)
      await click(page, period(page, 'This season'), { ms: 800, after: 400 })
    },
    // 4. mira-dev's row opens their profile.
    async (page) => {
      const row = page.locator('tr, [role="row"], div').filter({ has: page.getByText('mira-dev', { exact: true }) }).filter({ hasText: /^\s*3\b/ }).last()
      const name = page.locator('main, body').getByText('mira-dev', { exact: true }).filter({ visible: true })
      const target = (await row.count()) ? row.getByText('mira-dev', { exact: true }).first() : name.last()
      await click(page, target, { ms: 1100, after: 600 })
      await page.getByText(/All time/).first().waitFor({ timeout: 15000 })
      await stable(page)
    },
    // 5. The rank card, with its "All time" line.
    async (page) => {
      const card = page.getByText(/^All time/).first().locator('xpath=ancestor::*[contains(@class, "rounded")][1]')
      await spotlight(page, card, { ms: 400, pad: 8 })
      await point(page, page.getByText(/^All time/).first(), { ms: 800, hold: 200, scroll: false })
    },
    // 6. Leaderboard again, then Projects: Top Projects.
    async (page) => {
      await unspotlight(page)
      await click(page, rail(page, 'leaderboard'), { ms: 1000, after: 500 })
      await heading(page, /Seasonal Contributors/).waitFor()
      await click(page, page.getByRole('button', { name: 'Projects', exact: true }), { ms: 900, after: 500 })
      await heading(page, /Top Projects/).waitFor()
      await stable(page)
    },
    // 7. All Ecosystems, the first ecosystem in the list; the board reloads.
    async (page) => {
      await scrollTo(page, page.getByRole('button', { name: /All Ecosystems/ }), { top: 120, ms: 1100 })
      await click(page, page.getByRole('button', { name: /All Ecosystems/ }), { ms: 800, after: 600 })
      const first = page.locator('[role="menu"] [role="menuitem"], [role="listbox"] [role="option"], div.absolute button').filter({ hasNotText: /All Ecosystems/ }).first()
      await click(page, first, { ms: 700, after: 600, scroll: false })
      await stable(page)
    },
    // 8. Hold on the filtered board.
    async (page) => {
      await glide(page, 1180, 300, 1400)
    },
  ]),
}
