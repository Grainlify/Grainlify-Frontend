// GrainHack: create an event, as ada-admin in GrainHack admin. The new draft
// ("GrainHack Docs Demo") lives only in these fixtures, which answer every
// save, phase move and override the way the server does (blocking reasons as
// in internal/hackathon/phase.go), and record each in the event's audit trail.

import { world } from '../../world/index.mjs'
import { extraAdminApi } from '../../world/extra-admin.mjs'
import { NOW } from '../../world/util.mjs'
import { initScripts, point, click, type, fillIn, scrollTo, wait, waitStable, card, modal, perPage } from './_am.mjs'

const W = world('admin')
const base = { ...W.api, ...extraAdminApi(W.api) }
const ID = 'hk-docs-demo'
const NAME = 'GrainHack Docs Demo'
const ADA = W.persona

const NEXT = { draft: 'application_period', application_period: 'issue_prep', issue_prep: 'live', live: 'closed' }
// What the server requires before each phase (internal/hackathon/phase.go).
const REQUIRED = {
  application_period: [
    ['announced_at', 'Set an announcement date before opening applications.'],
    ['application_period_start', 'Set when the application period opens.'],
    ['application_period_end', 'Set when the application period closes.'],
  ],
  issue_prep: [['issue_prep_start', 'Set when issue preparation begins.']],
  live: [['starts_at', 'Set when the hackathon goes live.'], ['ends_at', 'Set when the hackathon ends.']],
}

const state = perPage(() => ({
  t0: Date.now(),
  created: false,
  hackathon: {
    id: ID, name: NAME, phase: 'draft', announced_at: null, application_period_start: null, application_period_end: null, issue_prep_start: null,
    starts_at: null, ends_at: null, merge_grace_period_hours: 48, sponsor_total_usdc: null, platform_fee_usdc: null, platform_fee_rate_pct: null,
    contributor_prize_pool: null, maintainer_prize_pool: null, net_pool_usdc: null, created_at: NOW.toISOString(),
  },
  overrides: {},
  audit: [],
}))
// The capture clock started at NOW when the page opened and runs in real time.
const at = (s) => new Date(NOW.getTime() + (Date.now() - s.t0)).toISOString()

const detail = (s) => {
  const h = s.hackathon
  const next = NEXT[h.phase] ?? ''
  const blocking = (REQUIRED[next] ?? []).filter(([f]) => !h[f]).map(([field, message]) => ({ field, message }))
  return { hackathon: h, next_phase: next, blocking_reasons: blocking }
}

const configFor = base['/admin/hackathon-config']
const auditFor = base['/admin/hackathon-config/audit']
const q = (req) => new URL(req.url()).searchParams

const api = {
  ...base,
  // The sections under the form answer as the other draft's do: nothing yet.
  ...Object.fromEntries(['applications', 'issues', 'draws', 'assignments', 'verdicts', 'appeals'].map((x) => [`/admin/hackathons/${ID}/${x}`, base[`/admin/hackathons/hk-winter-26/${x}`]])),
  '/admin/hackathons': (req) => {
    const s = state(req)
    return { hackathons: s.created ? [...base['/admin/hackathons'].hackathons, s.hackathon] : base['/admin/hackathons'].hackathons }
  },
  'POST /admin/hackathons': (req) => {
    const s = state(req)
    s.created = true
    s.hackathon.name = JSON.parse(req.postData() || '{}').name ?? NAME
    return { id: ID }
  },
  [`/admin/hackathons/${ID}`]: (req) => detail(state(req)),
  [`PUT /admin/hackathons/${ID}`]: (req) => {
    const s = state(req)
    Object.assign(s.hackathon, JSON.parse(req.postData() || '{}'))
    return { ok: true }
  },
  [`POST /admin/hackathons/${ID}/transition`]: (req) => {
    const s = state(req)
    const from = s.hackathon.phase
    s.hackathon.phase = NEXT[from]
    s.audit.unshift({ id: `audit-demo-${s.audit.length}`, hackathon_id: ID, key: 'phase', old_value: from, new_value: s.hackathon.phase, actor_user_id: ADA.id, actor_login: ADA.login, created_at: at(s) })
    return { ok: true }
  },
  '/admin/hackathon-config': (req) => {
    if (q(req).get('hackathon_id') !== ID) return configFor(req)
    const { overrides } = state(req)
    return { settings: configFor(req).settings.map((c) => (c.key in overrides ? { ...c, value: overrides[c.key], overridden: true } : c)) }
  },
  'PUT /admin/hackathon-config': (req) => {
    const b = JSON.parse(req.postData() || '{}')
    if (b.hackathon_id === ID) {
      const s = state(req)
      const old = s.overrides[b.key] ?? configFor({ url: () => `http://localhost:8080/admin/hackathon-config?hackathon_id=${ID}` }).settings.find((c) => c.key === b.key)?.value ?? ''
      s.overrides[b.key] = b.value
      s.audit.unshift({ id: `audit-demo-${s.audit.length}`, hackathon_id: ID, key: b.key, old_value: old, new_value: b.value, actor_user_id: ADA.id, actor_login: ADA.login, created_at: at(s) })
    }
    return { ok: true }
  },
  'POST /admin/hackathon-config/reset': (req) => {
    const b = JSON.parse(req.postData() || '{}')
    if (b.hackathon_id === ID) delete state(req).overrides[b.key]
    return { ok: true }
  },
  '/admin/hackathon-config/audit': (req) => (q(req).get('hackathon_id') === ID ? { entries: state(req).audit } : auditFor(req)),
}

const eventCard = (page) => page.locator('div[class*="rounded-[24px]"]', { has: page.getByRole('heading', { name: NAME, exact: true }) }).last()
const field = (page, label) => eventCard(page).locator('label', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) }).locator('xpath=following-sibling::input[1]')
const overrides = (page) => card(page, 'Rule overrides for this event')
const slotsRow = (page) => overrides(page).locator('div.grid', { has: page.locator('code', { hasText: /^slots_per_contributor$/ }) }).last()

/**
 * Whether this browser's date fields put the day before the month. Chrome lays
 * a datetime-local field out in the machine's locale, so this is tried on an
 * off-screen field first.
 */
async function dayFirst(page) {
  await page.evaluate(() => {
    const i = document.createElement('input')
    i.type = 'datetime-local'
    i.id = '__am_dt'
    Object.assign(i.style, { position: 'fixed', left: '-2000px', top: '0', width: '400px', padding: '8px 12px' })
    document.body.appendChild(i)
  })
  const probe = page.locator('#__am_dt')
  await probe.focus()
  // The first segment gets "24" (a day, or month 2 then day 4), the second "09".
  await page.keyboard.type('2409', { delay: 20 })
  await page.keyboard.type('2026', { delay: 20 })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.type('1000A', { delay: 20 })
  const v = await probe.inputValue()
  await page.evaluate(() => document.getElementById('__am_dt')?.remove())
  return v.slice(5, 7) === '09'
}

/** Types a local date and time into a datetime-local field, segment by segment, as a person would. */
async function typeDate(page, input, { m, d, y = 2026, h = 10, min = 0 }, dmy) {
  await click(page, input, { left: 22, after: 120 })
  const pad = (n) => String(n).padStart(2, '0')
  const h12 = h % 12 || 12
  await type(page, dmy ? `${pad(d)}${pad(m)}` : `${pad(m)}${pad(d)}`)
  await type(page, String(y))
  // A year field takes up to six digits, so it does not move on by itself.
  await page.keyboard.press('ArrowRight')
  await type(page, `${pad(h12)}${pad(min)}${h < 12 ? 'A' : 'P'}`)
}

export default {
  start: {
    url: '/dashboard?tab=grainhack&view=admin&subtab=hackathons',
    ...W,
    api,
    init: initScripts(W),
    ready: (page) => page.getByText('GrainHack Winter 2026'),
  },
  segments: [
    // 1. The list, then New hackathon.
    async (page) => {
      await waitStable(page)
      await point(page, page.getByText('GrainHack Autumn 2026', { exact: true }), { pause: 900 })
      await click(page, page.getByRole('button', { name: /New hackathon/ }), { pause: 500 })
      await modal(page).getByText('New GrainHack').waitFor()
    },
    // 2. Name, Create draft: the event opens as a draft.
    async (page) => {
      const m = modal(page)
      await click(page, m.getByPlaceholder('e.g. GrainHack Spring 2026'), { after: 150 })
      await type(page, NAME)
      await click(page, m.getByRole('button', { name: 'Create draft' }))
      await page.getByRole('heading', { name: NAME, exact: true }).waitFor()
      await waitStable(page)
      await point(page, eventCard(page).getByText('Draft', { exact: true }), { pause: 300 })
    },
    // 3. The requirements for Application period.
    async (page) => {
      const reqs = eventCard(page).locator('li')
      await point(page, eventCard(page).getByText('Requirements for Application period'), { pause: 500, left: 60 })
      for (let i = 0; i < 3; i++) await point(page, reqs.nth(i), { pause: 650, left: 120 })
    },
    // 4. The dates, the merge grace period and the sponsor total.
    async (page) => {
      const dmy = await dayFirst(page)
      await scrollTo(page, field(page, 'Announced at'), { top: 330 })
      await typeDate(page, field(page, 'Announced at'), { m: 9, d: 24 }, dmy)
      await typeDate(page, field(page, 'Application period start'), { m: 9, d: 28 }, dmy)
      await typeDate(page, field(page, 'Application period end'), { m: 10, d: 5 }, dmy)
      await typeDate(page, field(page, 'Issue prep start'), { m: 10, d: 6 }, dmy)
      await typeDate(page, field(page, 'Starts at (live)'), { m: 10, d: 12 }, dmy)
      await typeDate(page, field(page, 'Ends at'), { m: 10, d: 19 }, dmy)
      await fillIn(page, field(page, 'Merge grace period (hours)'), '48')
      await fillIn(page, field(page, 'Sponsor total (USDC)'), '10000')
    },
    // 5. Save fields; ready; move to Application period.
    async (page) => {
      await click(page, eventCard(page).getByRole('button', { name: 'Save fields' }))
      const ready = eventCard(page).getByText('Ready to transition.')
      await ready.waitFor()
      await waitStable(page)
      await point(page, ready, { pause: 700, left: 80 })
      await click(page, eventCard(page).getByRole('button', { name: /Move to Application period/ }))
      await eventCard(page).getByText('Application period', { exact: true }).waitFor()
      await waitStable(page)
      await point(page, eventCard(page).getByText('Application period', { exact: true }), { pause: 300 })
    },
    // 6. Move to Issue prep; then down to the rule overrides.
    async (page) => {
      await point(page, eventCard(page).getByRole('button', { name: /Move to Issue prep/ }), { pause: 1600 })
      await scrollTo(page, overrides(page), { top: 110 })
    },
    // 7. Slots Per Contributor to 3, Save changes: overridden.
    async (page) => {
      const row = slotsRow(page)
      await scrollTo(page, row, { top: 330 })
      await fillIn(page, row.locator('input'), '3')
      await click(page, overrides(page).getByRole('button', { name: 'Save changes' }))
      await slotsRow(page).getByText('overridden', { exact: true }).waitFor()
      await waitStable(page)
      await scrollTo(page, slotsRow(page), { top: 330 })
      await point(page, slotsRow(page).getByText('overridden', { exact: true }), { pause: 700 })
      await point(page, slotsRow(page).getByTitle('Reset to default'), { pause: 300 })
    },
    // 8. The audit trail (the event page is reopened so it reloads).
    async (page) => {
      await scrollTo(page, page.getByRole('button', { name: 'Back to hackathons' }), { top: 120 })
      await click(page, page.getByRole('button', { name: 'Back to hackathons' }))
      await click(page, page.getByText(NAME, { exact: true }), { pause: 300 })
      await page.getByRole('heading', { name: NAME, exact: true }).waitFor()
      const trail = card(page, 'Audit trail')
      await trail.getByText('slots_per_contributor').first().waitFor()
      await waitStable(page)
      await scrollTo(page, trail, { top: 110 })
      await point(page, trail.getByText('slots_per_contributor').first(), { pause: 700 })
      await point(page, trail.getByText('Phase transition').first(), { pause: 300 })
    },
  ],
}
