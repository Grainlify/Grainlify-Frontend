// Apply for a GrainHack issue: the live event, the issue's GrainHack panel,
// a note, applying, then My applications and My assignments.
import { world } from '../../world/index.mjs'
import { MY_APPLICATIONS } from '../../world/grainhack.mjs'
import { APPLY_GH, grainhackApplyApi } from '../../world/extra-bounties.mjs'
import { startWith, click, point, zoom, unzoom, ring, unring, type, scrollToY } from './_money-motion.mjs'

// grainhackApplyApi() answers the issue before and after applying; on top of
// it, My applications lists the new application once it has been made.
const gh = grainhackApplyApi()
const issuePath = `/projects/${APPLY_GH.projectId}/grainhack/${APPLY_GH.number}`
const applyPath = `POST /hackathon-issues/${APPLY_GH.issueId}/apply`
const pageOf = (req) => {
  try {
    return req.frame().page()
  } catch {
    return null
  }
}
const mine = new WeakMap()
const api = {
  ...gh,
  [applyPath]: (req) => {
    const out = gh[applyPath](req)
    mine.set(pageOf(req), gh[issuePath](req).my_application)
    return out
  },
  '/hackathon-issue-applications/me': (req) => ({ applications: mine.has(pageOf(req)) ? [mine.get(pageOf(req)), ...MY_APPLICATIONS] : MY_APPLICATIONS }),
}

const panel = (page) => page.locator('div.mb-4.rounded-\\[16px\\]').filter({ hasText: 'Part of GrainHack Autumn 2026' })
const rail = (page, id) => page.locator(`aside [data-tour-id="${id}"]`)
const tab = (page, name) => page.getByRole('button', { name, exact: true })

export default {
  start: startWith(world('contributor'), { url: '/dashboard?tab=osw', api, ready: (page) => page.getByText('GrainHack Autumn 2026') }),
  segments: [
    // 1. GrainHack in the rail, the Live event, View issue on an open issue.
    async (page) => {
      await point(page, rail(page, 'osw'), { pause: 900 })
      await click(page, page.getByRole('button').filter({ has: page.getByText('GrainHack Autumn 2026', { exact: true }) }).first().locator('p').first())
      const issue = page.locator('div.rounded-\\[16px\\]').filter({ hasText: 'Benchmark snapshot writes under load' }).filter({ has: page.getByRole('button', { name: 'View issue' }) }).last()
      await issue.waitFor({ timeout: 20000 })
      await point(page, issue.getByText(/left to apply/), { pause: 700 })
      await click(page, issue.getByRole('button', { name: 'View issue' }))
      await panel(page).waitFor({ timeout: 20000 })
      await scrollToY(page, 0, { ms: 300 })
    },
    // 2. The panel, from Part of to the applicant count.
    async (page) => {
      const p = panel(page)
      await point(page, p.getByText('Part of GrainHack Autumn 2026'), { pause: 300 })
      await zoom(page, [p.getByText('Part of GrainHack Autumn 2026'), p.locator('span.uppercase').first(), p.getByText(/applicants?$/).first()], { scale: 1.9 })
    },
    // 3. The Acceptance criteria box.
    async (page) => {
      await unzoom(page)
      const box = panel(page).locator('div.rounded-\\[12px\\]').filter({ hasText: 'Acceptance criteria' })
      await ring(page, box)
      await point(page, box.getByText('Acceptance criteria'))
    },
    // 4. A note for the maintainer.
    async (page) => {
      await unring(page)
      await click(page, panel(page).locator('textarea'), { after: 200 })
      await type(page, "I've worked on this module before and can start today.")
    },
    // 5. The slot line, then Apply for this issue.
    async (page) => {
      await point(page, panel(page).getByText("Applying doesn't use a slot. Only winning does."), { pause: 2200 })
      await click(page, panel(page).getByRole('button', { name: 'Apply for this issue' }))
      await point(page, panel(page).getByText("You've applied. The draw runs when the window closes."))
    },
    // 6. My GrainHack, My applications.
    async (page) => {
      await click(page, rail(page, 'my-grainhack'))
      await tab(page, 'My applications').waitFor({ timeout: 20000 })
      await click(page, tab(page, 'My applications'))
      await page.getByText('Waiting for the draw').first().waitFor({ timeout: 20000 })
      await point(page, page.getByText('Waiting for the draw').first())
    },
    // 7. A Couldn't apply row and its reason.
    async (page) => {
      await point(page, page.getByText("Couldn't apply", { exact: true }).first(), { pause: 1200 })
      await point(page, page.getByText("You're holding 2 of 2 assignment slots", { exact: false }).first())
    },
    // 8. My assignments.
    async (page) => {
      await click(page, tab(page, 'My assignments'))
    },
  ],
}
