// Video flow for "Social follow" (wip-notes/video-scripts/contributors__social-follow.md).
//
// mira-dev holds Founding position #37 with no follow proof yet. After the
// submit, the proof answers "pending"; segments 6 and 7 switch the answer to
// the rejected and the withdrawn fixtures and reload the tab (the "cut").
// "Zoom on" is shown as a highlight.

import { world } from '../../world/index.mjs'
import { foundingPlace, rejectedFollow, revokedFollow, proofPng } from '../../world/extra-account.mjs'
import { followVariants } from '../../world/index.mjs'
import { videoInit, point, click, pause, stable, glide, spotlight, unspotlight, segments } from './_human.mjs'

const C = world('contributor', { follow: 'none' })
const apiPath = (p) => (url) => /^(localhost:8080|api\.grainlify\.com)$/.test(url.host) && url.pathname === p
const row = (page, label) => page.locator('div.flex-1', { has: page.getByText(label, { exact: true }) }).locator('xpath=..')
const answerFollow = (page, body) => page.route(apiPath('/social-follow/me'), (r) => (r.request().method() === 'GET' ? r.fulfill({ json: body }) : r.fallback()))

/** Chooses a screenshot on a platform's row, through the file dialog. */
async function choose(page, label, name) {
  const button = row(page, label).getByText('Choose screenshot')
  await point(page, button, { ms: 900, hold: 300 })
  const chooser = page.waitForEvent('filechooser')
  await click(page, button, { ms: 100, after: 200 })
  await (await chooser).setFiles({ ...proofPng(), name })
  await row(page, label).getByText('Screenshot ready').waitFor()
  await pause(page, 700)
}

/** Switches the proof's answer and reloads the tab, as a cut to another fixture. */
async function cutTo(page, body) {
  await unspotlight(page)
  await answerFollow(page, body)
  await page.reload()
  await page.getByRole('heading', { name: 'Social Follow' }).waitFor()
  await stable(page)
}

export default {
  start: {
    url: '/dashboard?tab=settings&subtab=rewards',
    persona: C.persona,
    api: { ...C.api, ...foundingPlace },
    agent: C.agent,
    init: [...C.init, ...videoInit()],
    ready: (page) => page.getByRole('heading', { name: 'Social Follow' }),
  },
  segments: segments([
    // 1. The position card and the Social Follow card.
    async (page) => {
      await stable(page)
      await pause(page, 800)
      await point(page, page.getByText('Founding member', { exact: false }).first(), { ms: 1100, hold: 1800 })
      await point(page, page.getByRole('heading', { name: 'Social Follow' }), { ms: 1000, hold: 400 })
    },
    // 2. "You're not currently eligible…" and the sentence about the permanent position.
    async (page) => {
      const card = page.getByText("You're not currently eligible to receive a share.").locator('xpath=..')
      await spotlight(page, card, { ms: 400, pad: 8 })
      await point(page, page.getByText(/Your position and multiplier are permanent/).first(), { ms: 900, hold: 200, scroll: false })
    },
    // 3. Follow next to LinkedIn, then next to X; no clicks.
    async (page) => {
      await unspotlight(page)
      await point(page, row(page, 'LinkedIn').getByRole('link', { name: /Follow/ }), { ms: 1000, hold: 1600 })
      await point(page, row(page, 'X').getByRole('link', { name: /Follow/ }), { ms: 800, hold: 1200 })
    },
    // 4. A screenshot for each row: Screenshot ready.
    async (page) => {
      await choose(page, 'LinkedIn', 'linkedin-follow.png')
      await choose(page, 'X', 'x-follow.png')
    },
    // 5. Submit both for review: the toast, and the Pending review badge.
    async (page) => {
      await answerFollow(page, followVariants.pending)
      await click(page, page.getByRole('button', { name: 'Submit both for review' }), { ms: 900, after: 300 })
      await page.getByText('Both screenshots submitted for review.').waitFor()
      await page.getByText('Pending review', { exact: true }).waitFor()
      await point(page, page.getByText('Pending review', { exact: true }), { ms: 900, hold: 300 })
    },
    // 6. The rejected fixture: Not approved and the reason.
    async (page) => {
      await cutTo(page, rejectedFollow['/social-follow/me'])
      const box = page.getByText('Not approved', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-[16px]")][1]')
      await spotlight(page, box, { ms: 400, pad: 8 })
    },
    // 7. The withdrawn fixture: Eligibility withdrawn, the reason, and how to become eligible again.
    async (page) => {
      await cutTo(page, revokedFollow['/social-follow/me'])
      const box = page.getByText('Eligibility withdrawn', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-[16px]")][1]')
      await spotlight(page, box, { ms: 400, pad: 8 })
      await point(page, page.getByText('You can follow again and submit new screenshots to become eligible.'), { ms: 900, hold: 200, scroll: false })
    },
  ]),
}
