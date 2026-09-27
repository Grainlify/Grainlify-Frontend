// Video flow for "Apply for an issue"
// (wip-notes/video-scripts/contributors__applying-to-issues.md).
//
// mira-dev applies for ledgerline #212 ("Document the snapshot format", good
// first issue, three applications from others). The world answers the apply
// POST but stays as it was afterwards, so from the moment of submitting, this
// flow answers the issue list and mira-dev's applications with the new
// application included (page routes added later take precedence).

import { world } from '../../world/index.mjs'
import { ISSUES, issueApplicationsFor } from '../../world/projects.mjs'
import { videoInit, point, click, pause, scrollTo, scrollIntoView, stable, glide, type, segments } from './_human.mjs'

const C = world('contributor')
const MESSAGE = "I'd start by reproducing this with a failing test, then fix the parser. I fixed a similar bug in my own CLI last month."
const ISSUE = ISSUES['p-ledger'].find((i) => i.number === 212)
const COMMENT_ID = 3100000212
const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)
const applyButton = (page) => page.getByRole('button', { name: 'Apply for this issue' }).first()
const apiPath = (p) => (url) => /^(localhost:8080|api\.grainlify\.com)$/.test(url.host) && url.pathname === p

/** An application card in the issue's Applications tab, by applicant. */
const application = (page, login) => page.locator('div.rounded-\\[16px\\]', { has: page.getByText(login, { exact: true }) }).filter({ has: page.locator('svg.lucide-chevron-down, svg.lucide-chevron-up') }).last()

/** From now on, answer as if mira-dev's application on #212 had been posted at `when`. */
async function rememberApplication(page, when) {
  const body = `**📋 Grainlify Application**\n\n**@mira-dev has applied to work on this issue as part of the Grainlify program.**\n\n> ${MESSAGE}\n\n---\n\n**Repo Maintainers:** To accept this application, [review their application](https://grainlify.example/dashboard?tab=maintainers&view=maintainer&project=p-ledger&issue=${ISSUE.github_issue_id}) or [assign @mira-dev](https://github.com/tidewater-labs/ledgerline/issues/212) to this issue.`
  const comment = { id: COMMENT_ID, body, user: { login: 'mira-dev' }, created_at: when, updated_at: when }
  const issues = ISSUES['p-ledger'].map((i) => (i.number === 212 ? { ...i, comments: [...i.comments, comment], comments_count: i.comments.length + 1 } : i))
  const mine = [
    { id: 'ia-p-ledger-212', status: 'applied', project_id: 'p-ledger', project_name: 'tidewater-labs/ledgerline', issue_number: 212, issue_title: ISSUE.title, issue_url: ISSUE.url, labels: ISSUE.labels.map((l) => l.name), applied_at: when },
    ...issueApplicationsFor('mira-dev'),
  ]
  await page.route(apiPath('/projects/p-ledger/issues/212/apply'), (r) => r.fulfill({ json: { ok: true, comment } }))
  await page.route(apiPath('/projects/p-ledger/issues'), (r) => r.fulfill({ json: { issues } }))
  await page.route(apiPath('/issue-applications/me'), (r) => r.fulfill({ json: { issue_applications: mine } }))
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
    // 1. Discover, down to Recommended Issues.
    async (page) => {
      await pause(page, 800)
      await glide(page, 820, 520, 800)
      await scrollTo(page, page.getByRole('heading', { name: 'Recommended Issues' }), { top: 110, ms: 1600 })
    },
    // 2. A good first issue mira-dev hasn't applied for; the issue opens on Applications.
    async (page) => {
      const card = page.getByText('Document the snapshot format').first()
      await point(page, page.getByText('good first issue').first(), { ms: 900, hold: 900 })
      await click(page, card, { ms: 600, after: 400 })
      await page.getByRole('button', { name: /Applications \(\d+\)/ }).waitFor({ timeout: 15000 })
      await stable(page)
    },
    // 3. The apply box, then Apply for this issue.
    async (page) => {
      const box = page.locator('div.rounded-\\[16px\\]', { has: applyButton(page) }).last()
      await point(page, box.getByText(/Interested in contributing/), { ms: 1000, hold: 1500 })
      await click(page, applyButton(page), { ms: 800, after: 600 })
      await page.locator('textarea').first().waitFor()
    },
    // 4. The message.
    async (page) => {
      await type(page, page.locator('textarea').first(), MESSAGE, { delay: 28 })
    },
    // 5. Submit; the dialog closes and the new application is in the list.
    async (page) => {
      const when = await page.evaluate(() => new Date().toISOString())
      await rememberApplication(page, when)
      await click(page, page.getByRole('button', { name: 'Submit application' }), { ms: 800, after: 700 })
      await page.locator('textarea').first().waitFor({ state: 'detached' })
      const mine = application(page, 'mira-dev')
      await mine.waitFor()
      await scrollIntoView(page, mine)
      await point(page, mine.getByText('mira-dev', { exact: true }), { ms: 900, hold: 400 })
    },
    // 6. Contributors in the rail: the application is under Applied.
    async (page) => {
      await click(page, rail(page, 'contributors'), { ms: 900, after: 500 })
      await page.getByText('Document the snapshot format').first().waitFor({ timeout: 15000 })
      await stable(page)
      await point(page, page.getByText('Document the snapshot format').first(), { ms: 900, hold: 500 })
    },
    // 7. Back to the issue; expand mira-dev's application; point at Withdraw.
    async (page) => {
      // The browser's Back. Switching tabs from the issue leaves two history
      // entries for Contributors, so the first Back stays there; keep going
      // until the issue is back (at most three).
      for (let k = 0; k < 3 && !/[?&]issue=/.test(page.url()); k++) {
        await page.goBack()
        await pause(page, 300)
      }
      const mine = application(page, 'mira-dev')
      await mine.waitFor({ timeout: 15000 })
      await stable(page)
      await scrollIntoView(page, mine)
      await click(page, mine.locator('svg.lucide-chevron-down').first(), { ms: 1000, after: 700 })
      const withdraw = page.getByRole('button', { name: 'Withdraw', exact: true })
      await withdraw.waitFor()
      await scrollIntoView(page, withdraw)
      await point(page, withdraw, { ms: 800, hold: 500 })
    },
    // 8. Stay on the issue page.
    async (page) => {
      await glide(page, 1180, 300, 1400)
    },
  ]),
}
