// Run a bounty draw, as ada-admin on Reviews. The bounty chosen is
// kestrel-data/sieve #17: applications open, several applicants, nobody
// holding it. Every draw and settings change is answered by the fixtures;
// the real draw is cancelled at its confirmation.

import { world, BOUNTIES } from '../../world/index.mjs'
import { extraAdminApi } from '../../world/extra-admin.mjs'
import { adminBountyReposWorld } from '../../world/extra-bounty-repos.mjs'
import { drawSettings } from '../../world/bounties.mjs'
import { ago } from '../../world/util.mjs'
import { initScripts, point, click, fillIn, chooseNative, scrollTo, scrollBy, wait, waitStable, card } from './_am.mjs'

const W = world('admin')
const KEY = 'weight_first_ever_application'
const BOUNTY = BOUNTIES.find((b) => b.repo === 'kestrel-data/sieve' && b.issueNumber === 17)

// Sieve #17 answers with a fuller pool than the world gives it (five in the
// pool, two refused at the gates), so the Applications box has refusals to show.
const LEDGER = BOUNTIES.find((b) => b.repo === 'tidewater-labs/ledgerline' && b.issueNumber === 240)
const rename = (login) => (login === 'owen-maintains' ? 'lars-kestrel' : login)
const ledgerState = W.api[`/admin/bounty-draw/${LEDGER.id}/state`]
const sieveState = {
  ...ledgerState,
  applications: {
    ...ledgerState.applications,
    applications: ledgerState.applications.applications.map((a) => ({ ...a, githubLogin: rename(a.githubLogin), status: a.status === 'won' || a.status === 'lost' ? 'applied' : a.status })),
  },
  draws: [],
}
const sieveRun = W.api[`POST /admin/bounty-draw/${LEDGER.id}/run`]

const settingsWith = (key, value) =>
  drawSettings().map((s) => (s.key === key ? { ...s, value, overridden: true, updatedAt: ago(0, 0, 0), updatedBy: W.persona.login } : s))

const api = {
  ...W.api,
  ...extraAdminApi(W.api),
  'GET /admin/bounty-repos': adminBountyReposWorld().api['GET /admin/bounty-repos'],
  // The weight starts at its coded default here, so the video can override it and reset it.
  [`/admin/bounty-draw/${BOUNTY.id}/state`]: sieveState,
  [`POST /admin/bounty-draw/${BOUNTY.id}/run`]: sieveRun,
  '/admin/bounty-draw/settings': { settings: drawSettings() },
  'POST /admin/bounty-draw/settings': (req) => {
    const { key, value } = JSON.parse(req.postData() || '{}')
    return { ok: true, settings: settingsWith(key, value) }
  },
  'POST /admin/bounty-draw/settings/reset': { ok: true, settings: drawSettings() },
}

const drawCard = (page) => card(page, 'Bounty Draw')
const box = (page, heading) => drawCard(page).locator('div[class*="rounded-[16px]"]', { has: page.getByRole('heading', { name: heading, exact: true }) }).last()
const settingRow = (page, key) => page.locator('div.flex', { has: page.locator(`label[for="setting-${key}"]`) }).filter({ has: page.getByRole('button', { name: 'Reset' }) }).last()

export default {
  start: {
    url: '/dashboard?tab=admin&view=admin',
    ...W,
    api,
    init: initScripts(W),
    ready: (page) => page.getByRole('heading', { name: 'Admin Panel' }),
  },
  segments: [
    // 1. Down to Bounty Draw, Run a draw at the top.
    async (page) => {
      await waitStable(page)
      await drawCard(page).getByRole('combobox', { name: 'Bounty' }).locator(`option[value="${BOUNTY.id}"]`).waitFor({ state: 'attached' })
      await scrollTo(page, box(page, 'Run a draw'), { top: 110 })
      await point(page, box(page, 'Run a draw').getByRole('heading', { name: 'Run a draw' }), { pause: 300, left: 50 })
    },
    // 2. Choose a bounty; the Applications box.
    async (page) => {
      await chooseNative(page, drawCard(page).getByRole('combobox', { name: 'Bounty' }), /kestrel-data\/sieve #17/)
      const apps = box(page, 'Applications')
      await apps.waitFor()
      await waitStable(page)
      await point(page, apps.getByText(/applied · .* in the pool · .* refused/), { pause: 1200, left: 120 })
      await point(page, apps.locator('li', { hasText: 'account_too_new' }), { pause: 300, left: 150 })
    },
    // 3. Simulate, then Yes, simulate.
    async (page) => {
      await click(page, drawCard(page).getByRole('button', { name: 'Simulate', exact: true }))
      await click(page, page.getByRole('button', { name: 'Yes, simulate' }), { pause: 700 })
      await page.getByRole('heading', { name: 'Simulated draw' }).waitFor()
    },
    // 4. The simulated draw: tickets, share, weights, and the seed.
    async (page) => {
      const sim = box(page, 'Simulated draw')
      await waitStable(page)
      await scrollTo(page, sim, { top: 300 })
      const head = (name) => sim.locator('th', { hasText: new RegExp(`^${name}$`) })
      await point(page, head('Tickets'), { pause: 700 })
      await point(page, head('Share'), { pause: 700 })
      await point(page, head('Weights'), { pause: 700, left: 30 })
      await point(page, sim.getByText(/^Seed /), { pause: 400, left: 60 })
    },
    // 5. Run draw now: read the confirmation, then Cancel.
    async (page) => {
      await scrollTo(page, drawCard(page).getByRole('heading', { name: 'Bounty Draw' }), { top: 110 })
      await click(page, drawCard(page).getByRole('button', { name: 'Run draw now' }))
      const confirm = page.getByRole('alertdialog', { name: 'Confirm draw' })
      await confirm.waitFor()
      await point(page, confirm.getByText(/^Run the draw for/), { pause: 2600, left: 160 })
      await click(page, confirm.getByRole('button', { name: 'Cancel' }))
    },
    // 6. Settings: override a weight.
    async (page) => {
      await scrollTo(page, drawCard(page).locator('p', { hasText: /^Weights$/ }), { top: 120 })
      const input = page.locator(`#setting-${KEY}`)
      await fillIn(page, input, '2')
      await page.keyboard.press('Tab')
      await settingRow(page, KEY).getByText(/^Overridden \(default/).waitFor()
      await point(page, settingRow(page, KEY).getByText(/^Overridden \(default/), { pause: 300, left: 60 })
    },
    // 7. Reset it; then the public rules page.
    async (page) => {
      await click(page, settingRow(page, KEY).getByRole('button', { name: 'Reset' }))
      await settingRow(page, KEY).getByText(/^Overridden \(default/).waitFor({ state: 'detached' })
      await wait(page, 1200)
      await page.goto(new URL('/bounties/rules', page.url()).href)
      const weights = page.getByText('Weights', { exact: true }).first()
      await weights.waitFor({ timeout: 20000 })
      await waitStable(page)
      await wait(page, 600)
      await scrollTo(page, weights, { top: 120 })
      await point(page, page.getByText(KEY, { exact: true }).first(), { pause: 300 })
    },
  ],
}
