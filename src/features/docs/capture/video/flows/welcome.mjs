// Video flow for "Welcome to Grainlify" (wip-notes/video-scripts/welcome.md).

import { world } from '../../world/index.mjs'
import { videoInit, point, click, pause, scrollTo, stable, glide, segments } from './_human.mjs'

const C = world('contributor')
const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)
const railTip = (page, label) => page.locator('div.fixed.pointer-events-none', { hasText: new RegExp(`^${label}$`) })
const recommendedProjects = (page) => page.getByRole('heading', { name: /Recommended Projects/ })

/** Hovers a rail icon until its label is showing. */
async function hoverRail(page, id, label, hold = 1200) {
  await point(page, rail(page, id), { hold: 0 })
  await railTip(page, label).waitFor({ timeout: 5000 }).catch(() => {})
  await pause(page, hold)
}

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
    // 1. Discover with project cards and open issues, then the picture and username.
    async (page) => {
      await stable(page)
      await pause(page, 600)
      await scrollTo(page, recommendedProjects(page), { top: 90, ms: 1200 })
      await pause(page, 1800)
      await point(page, page.getByRole('button', { name: /mira-dev/ }).first(), { ms: 1100, scroll: false, hold: 800 })
    },
    // 2. Hover Discover, click Browse, open the Language filter and close it.
    async (page) => {
      await hoverRail(page, 'discover', 'Discover', 800)
      await click(page, rail(page, 'browse'), { after: 500 })
      await stable(page)
      await point(page, page.getByRole('button', { name: 'Language', exact: true }), { ms: 600, hold: 200 })
      await click(page, page.getByRole('button', { name: /Select languages/ }), { ms: 500, after: 1000 })
      const list = page.locator('div.w-\\[340px\\]').first()
      await list.waitFor({ timeout: 5000 })
      // The cross in the list's header.
      await click(page, list.locator('button').first(), { ms: 500, after: 300 })
    },
    // 3. Back to Discover, open an issue, point at Apply for this issue.
    async (page) => {
      await click(page, rail(page, 'discover'), { after: 700 })
      await stable(page)
      await scrollTo(page, page.getByRole('heading', { name: 'Recommended Issues' }), { top: 120, ms: 1100 })
      await click(page, page.getByText('Document the snapshot format').first(), { after: 900 })
      await stable(page)
      await point(page, page.getByRole('button', { name: 'Apply for this issue' }).first(), { ms: 900, hold: 600 })
    },
    // 4. Back, then Contributors (Contributions tab).
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Back', exact: true }).first(), { after: 900 })
      await hoverRail(page, 'contributors', 'Contributors', 1000)
      await click(page, rail(page, 'contributors'), { after: 600 })
      await stable(page)
      await point(page, page.getByRole('button', { name: 'Contributions', exact: true }).first(), { hold: 600 })
    },
    // 5. Bounties: the header and the status line.
    async (page) => {
      await click(page, rail(page, 'bounties'), { after: 700 })
      await stable(page)
      await point(page, page.getByRole('heading', { name: 'Open bounties' }), { ms: 900, hold: 900 })
      await point(page, page.getByText(/No mainnet payout has happened yet/).first(), { dx: -120, ms: 900, hold: 600 })
    },
    // 6. Hover GrainHack, then My GrainHack; don't open either.
    async (page) => {
      await hoverRail(page, 'osw', 'GrainHack', 1800)
      await hoverRail(page, 'my-grainhack', 'My GrainHack', 1800)
    },
    // 7. Leaderboard, This season, hold on the table.
    async (page) => {
      await click(page, rail(page, 'leaderboard'), { after: 700 })
      await stable(page)
      await point(page, page.getByRole('button', { name: 'This season', exact: true }), { hold: 500 })
      await scrollTo(page, page.getByRole('button', { name: 'This season', exact: true }), { top: 100, ms: 1300 })
      await point(page, page.getByRole('button', { name: 'This season', exact: true }), { scroll: false, hold: 300 })
    },
    // 8. Discover, and hold.
    async (page) => {
      await click(page, rail(page, 'discover'), { after: 600 })
      await stable(page)
      await glide(page, 760, 480, 900)
    },
  ]),
}
