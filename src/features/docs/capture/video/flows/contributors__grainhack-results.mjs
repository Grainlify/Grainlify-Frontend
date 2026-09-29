// Results, grading and appeals: My results, a graded pull request, its
// criteria and reasoning, then an appeal from start to "under review".
import { world, apiFor } from '../../world/index.mjs'
import { startWith, click, point, scrollTo, zoom, unzoom, type } from './_money-motion.mjs'

// The one result still open to appeal; once mira-dev appeals it, My results
// shows her appeal as pending, with what she wrote.
const APPEALABLE = 'vd-quill-75'
const base = apiFor('contributor')['/grainhack/my-verdicts']
const pageOf = (req) => {
  try {
    return req.frame().page()
  } catch {
    return null
  }
}
const appeals = new WeakMap()
const api = {
  [`POST /grainhack/verdicts/${APPEALABLE}/appeal`]: (req) => {
    let reason = ''
    try {
      reason = req.postDataJSON().reason
    } catch {}
    appeals.set(pageOf(req), {
      id: `apl-new-${APPEALABLE}`, verdict_id: APPEALABLE, github_login: 'mira-dev', reason, status: 'pending',
      decision_reason: null, decided_bucket: null, decided_at: null, created_at: new Date().toISOString(),
    })
    return { id: `apl-new-${APPEALABLE}` }
  },
  '/grainhack/my-verdicts': (req) => {
    const appeal = appeals.get(pageOf(req))
    return { ...base, verdicts: base.verdicts.map((e) => (appeal && e.verdict.id === APPEALABLE ? { ...e, appeal } : e)) }
  },
}

const card = (page) => page.locator('div.rounded-2xl.p-5').first()
const dialog = (page) => page.locator('div.fixed.inset-0 > div').filter({ hasText: 'Tell us what you think' })

export default {
  start: startWith(world('contributor'), {
    url: '/dashboard?tab=my-grainhack&subtab=results',
    api,
    ready: (page) => page.getByRole('button', { name: 'Appeal this result' }),
  }),
  segments: [
    // 1. My results, a graded pull request.
    async (page) => {
      await page.waitForTimeout(600)
      await point(page, page.getByRole('button', { name: 'My results', exact: true }), { pause: 1500 })
      await point(page, card(page).locator('a').first())
    },
    // 2. The grade label, zoomed.
    async (page) => {
      const grade = card(page).locator('span.rounded-full').first()
      await point(page, grade, { pause: 300 })
      await zoom(page, grade, { scale: 2, align: 'right' })
    },
    // 3. Down the criteria list; a file and line link.
    async (page) => {
      await unzoom(page)
      const items = card(page).locator('ul > li')
      const n = await items.count()
      for (let i = 0; i < n; i++) await point(page, items.nth(i).locator('span > span').first(), { pause: 900 })
      await point(page, items.first().locator('a').first())
    },
    // 4. The reasoning, then Appeal this result.
    async (page) => {
      const reasoning = card(page).locator('> p.mt-3').last()
      await point(page, reasoning, { pause: 3200 })
      await click(page, card(page).getByRole('button', { name: 'Appeal this result' }))
      await dialog(page).locator('textarea').waitFor({ timeout: 20000 })
    },
    // 5. What it missed.
    async (page) => {
      await click(page, dialog(page).locator('textarea'), { after: 200 })
      await type(page, 'The review says no tests were added, but the new test file covers the new branch.')
    },
    // 6. Submit appeal: the result shows Appeal under review.
    async (page) => {
      await click(page, dialog(page).getByRole('button', { name: 'Submit appeal' }), { after: 300 })
      const status = card(page).getByText('Appeal under review')
      await status.waitFor({ timeout: 20000 })
      await scrollTo(page, status, { block: 'center' })
      await point(page, status, { pause: 1200 })
      await point(page, card(page).getByText('You wrote:'))
    },
    // 7. The line about payouts and appeals.
    async (page) => {
      await point(page, card(page).getByText('Payouts are not released until every appeal has been answered.'))
    },
  ],
}
