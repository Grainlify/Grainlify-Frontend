// Apply for an issue (contributor, mira-dev).
//
// The issue is ledgerline #212 "Document the snapshot format": a good first
// issue on Discover that mira-dev has not applied for (three others have).
// Once she submits, the server's answers include her application: the issue's
// comments and her own applications list (so the Contributors board shows it
// under Applied, and the issue shows it when she comes back).

import { world, ISSUES, issueId } from '../../world/index.mjs'
import { ago } from '../../world/util.mjs'
import { NOW } from '../../lib.mjs'
import { mainThreadAnimations, cursor, setupDone, click, point, moveTo, scrollTo, type, stable, wait, rail, readyThen, pageOf } from './_start-motion.mjs'

const w = world('contributor')
const LOGIN = w.persona.login
const PID = 'p-ledger'
const NUMBER = 212
const REPO = 'tidewater-labs/ledgerline'
const GH_ID = issueId(PID, NUMBER)
const TITLE = 'Document the snapshot format'
const MESSAGE = "I'd read through the snapshot code first, then write up the format with a worked example. I documented a similar file format for my own CLI last month."
const SITE = 'https://grainlify.example'

const applied = new WeakMap() // page -> the comment she posted
const body = (message) =>
  `**📋 Grainlify Application**\n\n**@${LOGIN} has applied to work on this issue as part of the Grainlify program.**\n\n> ${message}\n\n---\n\n**Repo Maintainers:** To accept this application, [review their application](${SITE}/dashboard?tab=maintainers&view=maintainer&project=${PID}&issue=${GH_ID}) or [assign @${LOGIN}](https://github.com/${REPO}/issues/${NUMBER}) to this issue.`
const withMine = (issues, req) => {
  const mine = applied.get(pageOf(req))
  if (!mine) return issues
  return issues.map((i) => (i.number === NUMBER ? { ...i, comments: [...(i.comments ?? []), mine], comments_count: (i.comments_count ?? 0) + 1 } : i))
}
const publicIssue = ({ assignees, comments, comments_count, ...rest }) => rest
const baseApps = w.api['/issue-applications/me'].issue_applications

const api = {
  ...w.api,
  [`POST /projects/${PID}/issues/${NUMBER}/apply`]: (req) => {
    let message = MESSAGE
    try {
      message = JSON.parse(req.postData() ?? '{}').message ?? MESSAGE
    } catch {}
    const now = NOW.toISOString()
    const comment = { id: 3199100212, body: body(message), user: { login: LOGIN }, created_at: now, updated_at: now }
    applied.set(pageOf(req), comment)
    return { ok: true, comment }
  },
  [`/projects/${PID}/issues`]: (req) => ({ issues: withMine(ISSUES[PID], req) }),
  [`/projects/${PID}/issues/public`]: (req) => ({ issues: withMine(ISSUES[PID], req).map(publicIssue) }),
  '/issue-applications/me': (req) => ({
    issue_applications: applied.has(pageOf(req))
      ? [
          { id: `ia-${PID}-${NUMBER}`, status: 'applied', project_id: PID, project_name: REPO, issue_number: NUMBER, issue_title: TITLE, issue_url: `https://github.com/${REPO}/issues/${NUMBER}`, labels: ['documentation', 'good first issue'], applied_at: applied.get(pageOf(req)).created_at ?? ago(0) },
          ...baseApps,
        ]
      : baseApps,
  }),
}

const recommendedIssues = (page) => page.getByRole('heading', { name: 'Recommended Issues' }).first()
/** The right-hand issue panel (the scrolling card beside the issue list). */
const issuePanel = (page) => page.locator('div.overflow-y-auto', { has: page.getByRole('heading', { level: 1 }) }).last()
const applicationCard = (page, login) => page.locator('div.p-6', { has: page.locator('h4', { hasText: login }) }).first()
const applyButton = (page) => page.getByRole('button', { name: 'Apply for this issue' }).first()
const dialog = (page) => page.locator('div.fixed.inset-0 > div.border-2', { has: page.locator('textarea') })

export default {
  start: {
    url: '/dashboard?tab=discover',
    ...w,
    api,
    init: [...w.init, cursor(), setupDone(), mainThreadAnimations()],
    ready: readyThen((page) => page.getByText(TITLE), async (page) => {
      await page.waitForTimeout(400)
    }),
  },
  segments: [
    // 1. On Discover, scroll down to Recommended Issues.
    async (page) => {
      await wait(page, 1200)
      await moveTo(page, 760, 560, { pause: 200 })
      await scrollTo(page, recommendedIssues(page), { top: 100 })
    },
    // 2. Open the good first issue: the issue page opens on Applications.
    async (page) => {
      const card = page.getByText(TITLE).first()
      await point(page, page.getByText('good first issue').first(), { pause: 900, steps: 25 })
      await click(page, card)
      await applyButton(page).waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 1000, 420, { pause: 0 })
    },
    // 3. Point at the apply box, then Apply for this issue.
    async (page) => {
      const box = page.locator('div', { has: applyButton(page) }).filter({ hasText: 'Interested in contributing?' }).last()
      await point(page, box, { dx: -180, pause: 2200, steps: 25 })
      await click(page, applyButton(page))
      await dialog(page).locator('textarea').waitFor({ timeout: 10000 })
    },
    // 4. Type the message.
    async (page) => {
      await click(page, dialog(page).locator('textarea'), { pause: 200 })
      await type(page, MESSAGE, 45)
    },
    // 5. Submit application: the dialog closes and the application appears in the list.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Submit application' }))
      const mine = applicationCard(page, LOGIN)
      await mine.waitFor({ timeout: 10000 })
      await wait(page, 500)
      await moveTo(page, 1000, 500, { pause: 100 })
      await scrollTo(page, mine, { top: 380 })
      await point(page, mine.locator('h4').first(), { steps: 25, pause: 0, scroll: false })
    },
    // 6. Contributors: the Contributions board shows it under Applied.
    async (page) => {
      await click(page, rail(page, 'contributors'))
      const card = page.getByText(TITLE).filter({ visible: true }).first()
      await card.waitFor({ timeout: 15000 })
      await stable(page)
      await point(page, card, { steps: 30, pause: 0 })
    },
    // 7. Browser back to the issue; expand mira-dev's application; point at Withdraw.
    async (page) => {
      const mine = applicationCard(page, LOGIN)
      for (let i = 0; i < 4 && !(await mine.isVisible()); i++) {
        await page.goBack()
        await page.waitForTimeout(400)
      }
      await mine.waitFor({ timeout: 15000 })
      await stable(page)
      await moveTo(page, 1000, 500, { pause: 0 })
      await scrollTo(page, mine, { top: 300 })
      await click(page, mine.locator('button').nth(1))
      const withdraw = page.getByRole('button', { name: 'Withdraw' }).first()
      await withdraw.waitFor({ timeout: 10000 })
      await wait(page, 300)
      await point(page, withdraw, { steps: 25, pause: 0 })
    },
    // 8. Stay on the issue page.
    async (page) => {
      // The pointer stays on Withdraw a moment longer, then drifts off it.
      await wait(page, 1800)
      await moveTo(page, 1250, 560, { pause: 0, steps: 40 })
    },
  ],
}
