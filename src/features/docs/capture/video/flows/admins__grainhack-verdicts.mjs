// GrainHack: verdicts and appeals, as ada-admin on GrainHack Summer 2026
// (results published). World: world('admin') plus world/extra-admin.mjs (a
// verdict needing review, a pending appeal). The override and the appeal
// decision are answered by the fixtures, which then list them as recorded.

import { world } from '../../world/index.mjs'
import { extraAdminApi } from '../../world/extra-admin.mjs'
import { NOW } from '../../world/util.mjs'
import { initScripts, point, click, type, chooseNative, scrollTo, scrollBy, wait, waitStable, card, modal, perPage } from './_am.mjs'

const W = world('admin')
const base = { ...W.api, ...extraAdminApi(W.api) }
const EVENT = 'GrainHack Summer 2026'
const VERDICT = 'vd-quill-78'
const APPEAL = 'apl-tide-51'
const state = perPage(() => ({ t0: Date.now(), override: null, decision: null }))
const at = (s) => new Date(NOW.getTime() + (Date.now() - s.t0)).toISOString()

const overridden = (v, o) =>
  v.id === VERDICT && o ? { ...v, final_bucket: o.bucket, final_source: 'human_override', overridden_by: W.persona.login, override_reason: o.reason, overridden_at: o.at } : v

const verdictsFor = base['/admin/hackathons/hk-summer-26/verdicts']
const appealsFor = base['/admin/hackathons/hk-summer-26/appeals']

const api = {
  ...base,
  '/admin/hackathons/hk-summer-26/verdicts': (req) => {
    const res = verdictsFor(req)
    const o = state(req).override
    return { ...res, verdicts: res.verdicts.map((v) => overridden(v, o)) }
  },
  [`/admin/hackathon-verdicts/${VERDICT}`]: (req) => ({ ...base[`/admin/hackathon-verdicts/${VERDICT}`], verdict: overridden(base[`/admin/hackathon-verdicts/${VERDICT}`].verdict, state(req).override) }),
  [`POST /admin/hackathon-verdicts/${VERDICT}/override`]: (req) => {
    const b = JSON.parse(req.postData() || '{}')
    const s = state(req)
    s.override = { bucket: b.bucket ?? b.final_bucket, reason: b.reason, at: at(s) }
    return { ok: true, final_bucket: s.override.bucket }
  },
  '/admin/hackathons/hk-summer-26/appeals': (req) => {
    const res = appealsFor(req)
    const d = state(req).decision
    return { ...res, appeals: res.appeals.map((a) => (a.id === APPEAL && d ? { ...a, status: d.upheld ? 'upheld' : 'rejected', decision_reason: d.reason, decided_bucket: d.bucket || null, decided_at: d.at } : a)) }
  },
  [`POST /admin/hackathon-appeals/${APPEAL}/decide`]: (req) => {
    const b = JSON.parse(req.postData() || '{}')
    const s = state(req)
    s.decision = { upheld: b.upheld, reason: b.reason, bucket: b.bucket, at: at(s) }
    return { ok: true }
  },
}

const judging = (page) => card(page, 'Judging')
const appeals = (page) => card(page, 'Appeals')
const appealCard = (page) => appeals(page).locator('div', { has: page.getByText(/^Their grounds:/) }).filter({ hasText: 'sol-mendes' }).last()

export default {
  start: {
    url: '/dashboard?tab=grainhack&view=admin&subtab=hackathons',
    ...W,
    api,
    init: initScripts(W),
    ready: (page) => page.getByText(EVENT, { exact: true }),
  },
  segments: [
    // 1. The event whose results are published.
    async (page) => {
      await waitStable(page)
      await point(page, page.getByText('results_published', { exact: true }), { pause: 900 })
      await click(page, page.getByText(EVENT, { exact: true }))
      await page.getByRole('heading', { name: EVENT, exact: true }).waitFor()
      await waitStable(page)
    },
    // 2. Judging: the disagreement rate, and where they disagree.
    async (page) => {
      await judging(page).getByText('Cross-check disagreement').waitFor()
      await scrollTo(page, judging(page), { top: 110 })
      await point(page, judging(page).getByText('Cross-check disagreement'), { pause: 2400, left: 60 })
      await point(page, judging(page).getByText('Where they disagree'), { pause: 400, left: 60 })
    },
    // 3. The first row under Needs review: Judge and Cross-check side by side.
    async (page) => {
      await point(page, judging(page).getByRole('button', { name: 'Needs review', exact: true }), { pause: 700 })
      const first = judging(page).getByText(/^ines-byte · /).first()
      await click(page, first, { left: 60 })
      await judging(page).getByRole('button', { name: 'Set verdict' }).waitFor()
      await waitStable(page)
      await scrollTo(page, judging(page).getByText('Judge', { exact: true }).first(), { top: 150 })
      await scrollBy(page, 280)
      await point(page, judging(page).getByText('Cross-check', { exact: true }).first(), { pause: 300 })
    },
    // 4. Set verdict: Substantial, and why.
    async (page) => {
      await click(page, judging(page).getByRole('button', { name: 'Set verdict' }))
      const m = modal(page)
      await m.getByText('Set the final verdict').waitFor()
      await click(page, m.getByRole('combobox').first(), { after: 450 })
      await click(page, page.getByRole('option', { name: 'Substantial' }), { after: 250 })
      const why = m.locator('label', { hasText: /^Why/ }).first().locator('xpath=following::*[self::input or self::textarea][1]')
      await click(page, why, { after: 150 })
      await type(page, 'Adds tests for both edge cases the issue lists; the judge missed the second test file.')
      await click(page, m.getByRole('button', { name: 'Save verdict' }))
      await judging(page).getByText(/^ines-byte · substantial/).waitFor()
    },
    // 5. Appeals: how many are waiting.
    async (page) => {
      await scrollTo(page, appeals(page), { top: 110 })
      await point(page, appeals(page).getByText(/appeals? awaiting a decision$/), { pause: 400, left: 80 })
    },
    // 6. Their grounds; Decide this appeal; Uphold; accepted.
    async (page) => {
      const c = appealCard(page)
      await point(page, c.getByText(/^Their grounds:/).first(), { pause: 2200, left: 50 })
      await click(page, c.getByRole('button', { name: 'Decide this appeal' }))
      const m = modal(page)
      await click(page, m.getByRole('button', { name: 'Uphold', exact: true }), { pause: 500 })
      await chooseNative(page, m.locator('select'), 'accepted')
    },
    // 7. The reason; Record decision: Upheld.
    async (page) => {
      const m = modal(page)
      await click(page, m.locator('textarea'), { after: 150 })
      await type(page, 'The pull request meets both acceptance criteria; the rejection misread the diff.')
      await click(page, m.getByRole('button', { name: 'Record decision' }))
      const done = appeals(page).getByText('The pull request meets both acceptance criteria', { exact: false })
      await done.waitFor()
      await waitStable(page)
      const upheld = appeals(page).locator('span', { hasText: /^Upheld$/ }).first()
      await scrollTo(page, upheld, { top: 200 })
      await point(page, upheld, { pause: 500 })
      await point(page, done, { pause: 300, left: 80 })
    },
  ],
}
