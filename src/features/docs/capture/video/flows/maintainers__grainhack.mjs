// GrainHack for maintainers, as owen-maintains. The labelled, still-pending
// issue is tidewater-labs/ledgerline #242, "Document the CLI flags", in
// GrainHack Autumn 2026 (world/extra-maintainers.mjs). Saving the two missing
// fields publishes it; the fixture answers that save.

import { maintainerWorld, PENDING_GH_ISSUE } from '../../world/extra-maintainers.mjs'
import { initScripts, point, click, type, scrollTo, titleCard, titleCardClose, wait, waitStable } from './_am.mjs'

const W = maintainerWorld()
const PID = 'p-ledger'
const NUMBER = PENDING_GH_ISSUE.number
const pending = W.api[`/projects/${PID}/hackathon-issues/${NUMBER}`]

const api = {
  ...W.api,
  // The save publishes the issue once both fields are set, as the server does.
  [`PUT /projects/${PID}/hackathon-issues/${NUMBER}`]: (req) => {
    const body = JSON.parse(req.postData() || '{}')
    const ready = !!body.acceptance_criteria?.trim() && !!body.difficulty_tier?.trim()
    return { ...pending, ...body, status: ready ? 'published' : 'pending', published_at: ready ? new Date('2026-09-21T09:05:00Z').toISOString() : null }
  },
}

const panel = (page) => page.locator('div[class*="rounded-[16px]"]', { has: page.getByText(/^GrainHack: /) }).last()

export default {
  start: {
    url: '/dashboard?tab=maintainers&view=maintainer&subtab=Issues',
    ...W,
    api,
    init: initScripts(W),
    ready: (page) => page.getByText('Document the CLI flags').first(),
  },
  segments: [
    // 1. The Issues tab; on GitHub, the label.
    async (page) => {
      await waitStable(page)
      await point(page, page.getByText('Document the CLI flags').first(), { pause: 1200 })
      await titleCard(page, { eyebrow: 'On GitHub', lines: ["Add the event's label to the issue."] })
      await wait(page, 2600)
      await titleCardClose(page)
    },
    // 2. Open the issue: the GrainHack panel, pending.
    async (page) => {
      await click(page, page.getByText('Document the CLI flags').first())
      const p = panel(page)
      await p.getByText('Missing before this publishes').waitFor()
      await waitStable(page)
      await point(page, p.getByText(/^GrainHack: /), { pause: 900, left: 60 })
      await point(page, p.getByText('Missing before this publishes'), { pause: 700, left: 60 })
      await point(page, p.getByText('Difficulty tier').first(), { pause: 300, left: 40 })
    },
    // 3. Acceptance criteria.
    async (page) => {
      const box = page.getByPlaceholder('What must be true for a PR to satisfy this issue?')
      await click(page, box, { after: 200 })
      await type(page, 'Every flag in --help is documented in docs/cli.md with an example.')
    },
    // 4. Difficulty tier: Standard.
    async (page) => {
      const p = panel(page)
      await click(page, p.getByRole('combobox').first(), { after: 500 })
      await click(page, page.getByRole('option', { name: 'Standard' }), { after: 300 })
    },
    // 5. Save: published.
    async (page) => {
      await click(page, panel(page).getByRole('button', { name: 'Save', exact: true }))
      await page.getByText('Saved - issue is now published to GrainHack.').waitFor()
      await wait(page, 900)
      await point(page, panel(page).getByText('published', { exact: true }), { pause: 400 })
    },
    // 6. The draw picks who works on it.
    async (page) => {
      await wait(page, 1500)
      await titleCard(page, { lines: ['The draw picks who works on it.'] })
      await wait(page, 2600)
      await titleCardClose(page)
    },
    // 7. My GrainHack > Rules > Maintainer pool.
    async (page) => {
      await click(page, page.locator('[data-tour-id="my-grainhack"]'), { pause: 700 })
      const rules = page.getByRole('button', { name: 'Rules', exact: true })
      await rules.waitFor()
      await waitStable(page)
      await click(page, rules)
      const pool = page.getByText('Maintainer pool', { exact: true }).first()
      await pool.waitFor()
      await waitStable(page)
      await scrollTo(page, pool, { top: 140 })
      await point(page, pool, { pause: 300, left: 60 })
    },
  ],
}
