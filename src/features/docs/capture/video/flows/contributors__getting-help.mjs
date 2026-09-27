// Video flow for "Get help" (wip-notes/video-scripts/contributors__getting-help.md).
//
// The screenshot mira-dev attaches (search-bug.png) is a real capture of the
// Browse page taken at the start. Once the report is sent, Your reports is
// answered with it on top, under the ID the send returned (sr-5d20be71).
// "Zoom on" is shown as a highlight around the thing, since the recorder has
// no camera zoom.

import { world } from '../../world/index.mjs'
import { videoInit, point, click, pause, scrollTo, stable, glide, type, spotlight, unspotlight, segments } from './_human.mjs'

const C = world('contributor')
const MESSAGE = 'Search shows no results for a project I can see on Browse.'
const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)
const helpButton = (page) => page.getByRole('button', { name: /Get help or report a problem/ })
const category = (page, name) => page.getByRole('radiogroup', { name: "What's this about?" }).locator('button', { hasText: new RegExp(`^${name}$`) })
const apiPath = (p) => (url) => /^(localhost:8080|api\.grainlify\.com)$/.test(url.host) && url.pathname === p
const origin = (page) => new URL(page.url()).origin
const shots = new WeakMap()

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
    // 1. Get help at the bottom of the rail opens the Get help page.
    async (page) => {
      // The picture mira-dev will attach: what the Discover page looks like now.
      shots.set(page, await page.screenshot({ clip: { x: 80, y: 0, width: 1360, height: 900 } }))
      await pause(page, 400)
      await glide(page, 420, 760, 700)
      await point(page, helpButton(page), { ms: 900, hold: 1200 })
      await click(page, helpButton(page), { ms: 100, after: 500 })
      await page.getByRole('heading', { name: 'Get help' }).waitFor()
      await stable(page)
    },
    // 2. Across the five categories.
    async (page) => {
      for (const name of ['Bug', 'Verification', 'Idea', 'Help', 'Other']) await point(page, category(page, name), { ms: 550, hold: 450 })
    },
    // 3. Verification, and its "Handled privately" note.
    async (page) => {
      await click(page, category(page, 'Verification'), { ms: 700, after: 500 })
      await spotlight(page, page.getByText(/^Handled privately/).first(), { ms: 400 })
    },
    // 4. Back to Bug.
    async (page) => {
      await unspotlight(page)
      await click(page, category(page, 'Bug'), { ms: 900, after: 500 })
    },
    // 5. The message, a screenshot, Send.
    async (page) => {
      await type(page, page.locator('textarea').first(), MESSAGE, { delay: 22 })
      const attach = page.getByText('Attach a screenshot', { exact: true })
      await point(page, attach, { ms: 600, hold: 100 })
      const chooser = page.waitForEvent('filechooser')
      await click(page, attach, { ms: 100, after: 100 })
      await (await chooser).setFiles({ name: 'search-bug.png', mimeType: 'image/png', buffer: shots.get(page) })
      await page.getByText('search-bug.png').waitFor()
      await pause(page, 500)
      const when = await page.evaluate(() => new Date().toISOString())
      const mine = C.api['/support-requests/mine']
      const report = { id: 'sr-5d20be71', category: 'bug', message: MESSAGE, page_url: '/dashboard?tab=support', status: 'received', created_at: when, delivered_to_team: true, has_screenshot: true }
      await page.route(apiPath('/support-requests/mine'), (r) => r.fulfill({ json: { support_requests: [report, ...mine.support_requests], total: mine.total + 1 } }))
      await click(page, page.getByRole('button', { name: 'Send', exact: true }), { ms: 800, after: 300 })
    },
    // 6. The confirmation, then Done.
    async (page) => {
      await page.getByText("Thanks - we've got it").waitFor()
      await point(page, page.getByText("Thanks - we've got it"), { ms: 800, hold: 1600 })
      await click(page, page.getByRole('button', { name: 'Done', exact: true }), { ms: 700, after: 500 })
    },
    // 7. Your reports, and the newest one with its Received label and ID.
    async (page) => {
      await scrollTo(page, page.getByRole('heading', { name: 'Your reports' }), { top: 110, ms: 1300 })
      // The report's card: the nearest box around its ID that also holds its message.
      const newest = page.getByText('sr-5d20be71', { exact: true }).locator('xpath=ancestor::*[.//text()[contains(., "Search shows no results")]][1]')
      await newest.waitFor()
      await spotlight(page, newest, { ms: 400 })
    },
    // 8. Signed out, /signin: the Get help link.
    async (page) => {
      await unspotlight(page)
      await page.evaluate(() => localStorage.removeItem('patchwork_jwt'))
      await page.goto(origin(page) + '/signin')
      await page.getByRole('button', { name: /Sign in with GitHub/ }).waitFor()
      await pause(page, 600)
      await glide(page, 720, 700, 500)
      await point(page, page.getByRole('button', { name: 'Get help', exact: true }).or(page.getByRole('link', { name: 'Get help', exact: true })).first(), { ms: 900, hold: 400 })
    },
  ]),
}
