// Ranks and the leaderboard, as mira-dev (#3 this season, #5 all time).
import { world } from '../../world/index.mjs'
import { click, point, reveal, scrollBy, zoom, unzoom, park, wait, cursor, setupDone } from './_paced.mjs'

const rail = (page, id) => page.locator(`aside [data-tour-id="${id}"]`)
const boardReady = async (page) => {
  await page.getByRole('button', { name: 'This season' }).waitFor()
  await page.locator('[class*="animate-pulse"]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
}
const tableRow = (page, login) => page.locator('div[class*="divide-y"] > div', { hasText: login }).first()

// The world's project board ignores the ecosystem filter; rank the filtered
// organisations again, as the real board does.
const w = world('contributor')
const projectBoard = w.api['/leaderboard/projects']
const api = {
  ...w.api,
  '/leaderboard/projects': (req) => {
    const out = projectBoard(req)
    const eco = new URL(req.url()).searchParams.get('ecosystem')?.toLowerCase()
    if (!eco) return out
    const rows = out.projects.filter((r) => r.ecosystems.some((e) => e.toLowerCase() === eco)).map((r, i) => ({ ...r, rank: i + 1 }))
    return { ...out, projects: rows, total: rows.length }
  },
}

export default {
  start: {
    url: '/dashboard?tab=discover',
    ...w,
    api,
    init: [...w.init, setupDone, cursor],
    ready: (page) => rail(page, 'leaderboard'),
  },
  segments: [
    // 1. Leaderboard in the rail.
    async (page) => {
      await click(page, rail(page, 'leaderboard'), { pause: 700 })
      await page.getByText('Seasonal Contributors').waitFor()
      await boardReady(page)
      await park(page, 300)
    },
    // 2. Hover This season, then scroll down to the table.
    async (page) => {
      await point(page, page.getByRole('button', { name: 'This season' }), { pause: 1600 })
      await reveal(page, tableRow(page, 'mira-dev'), { block: 'center' })
      await park(page, 700)
    },
    // 3. All time, then This season again.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'All time' }))
      await page.getByText('All-Time Contributors').waitFor()
      await boardReady(page)
      await reveal(page, page.getByText('All-Time Contributors'), { block: 'center' })
      await wait(page, 1400)
      await click(page, page.getByRole('button', { name: 'This season' }))
      await page.getByText('Seasonal Contributors').waitFor()
      await boardReady(page)
    },
    // 4. mira-dev's row: their profile opens.
    async (page) => {
      const row = tableRow(page, 'mira-dev')
      await reveal(page, row, { block: 'center' })
      await point(page, row, { pause: 900, dx: -200 })
      await click(page, row, { dx: -200, pause: 300 })
      await page.getByTestId('rank-position').waitFor()
      await park(page, 800)
    },
    // 5. Zoom on the rank card, with the All time line.
    async (page) => {
      await page.getByTestId('rank-badge-card').waitFor()
      await zoom(page, page.getByTestId('rank-badge-card'), { pad: 60, max: 1.6 })
    },
    // 6. Leaderboard, then Projects.
    async (page) => {
      await unzoom(page)
      await click(page, rail(page, 'leaderboard'))
      await boardReady(page)
      await click(page, page.getByRole('button', { name: 'Projects', exact: true }).first())
      await page.getByText('Top Projects').waitFor()
      await boardReady(page)
      await park(page, 300)
    },
    // 7. All Ecosystems -> the first ecosystem.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'All Ecosystems' }))
      const first = page.locator('div.animate-dropdown-in button').nth(1)
      await first.waitFor()
      await wait(page, 500)
      await click(page, first)
      await boardReady(page)
      await park(page, 820)
    },
    // 8. Hold on the filtered board.
    async (page) => {
      await scrollBy(page, 240)
    },
  ],
}
