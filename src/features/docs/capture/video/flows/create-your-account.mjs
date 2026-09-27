// Video flow for "Create your account" (wip-notes/video-scripts/create-your-account.md).
//
// Starts signed out on /signin (no persona, so no session and no "tour seen"
// flag). Segment 4 signs mira-dev in the way the OAuth callback leaves the
// browser (a stored session token) and opens /dashboard, where the first-visit
// tour starts. GitHub's own consent page is never shown.

import { world } from '../../world/index.mjs'
import { videoInit, point, click, pause, stable, glide, segments } from './_human.mjs'

const C = world('contributor')
const origin = (page) => new URL(page.url()).origin
const tourCard = (page) => page.locator('div.rounded-\\[20px\\]', { has: page.getByRole('button', { name: /Next|Skip tour|Back/ }) }).last()

export default {
  start: {
    url: '/signin',
    api: C.api,
    agent: C.agent,
    init: [...C.init, ...videoInit()],
    ready: (page) => page.getByRole('button', { name: /Sign in with GitHub/ }),
  },
  segments: segments([
    // 1. The sign-in page; the pointer onto Sign in with GitHub.
    async (page) => {
      await pause(page, 1200)
      await point(page, page.getByRole('button', { name: /Sign in with GitHub/ }), { ms: 1000, hold: 600 })
    },
    // 2. /signup and its button, then back to /signin.
    async (page) => {
      await page.goto(origin(page) + '/signup')
      await page.getByRole('button', { name: /Sign up with GitHub/ }).waitFor()
      await pause(page, 700)
      await point(page, page.getByRole('button', { name: /Sign up with GitHub/ }), { ms: 900, hold: 2200 })
      await page.goto(origin(page) + '/signin')
      await page.getByRole('button', { name: /Sign in with GitHub/ }).waitFor()
      await pause(page, 300)
    },
    // 3. Stay on /signin with the pointer on the button; nothing is clicked.
    async (page) => {
      await point(page, page.getByRole('button', { name: /Sign in with GitHub/ }), { ms: 600, hold: 400 })
    },
    // 4. Signed in, first visit on a computer: Discover, and the tour's first step.
    async (page) => {
      await page.evaluate(() => localStorage.setItem('patchwork_jwt', 'docs-capture'))
      await page.goto(origin(page) + '/dashboard')
      await page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }).waitFor({ timeout: 20000 })
      await glide(page, 760, 520, 600)
      await page.getByText('Welcome to Grainlify, mira-dev!').waitFor({ timeout: 10000 })
      await pause(page, 600)
    },
    // 5. Next twice: the Discover step, then the Browse step.
    async (page) => {
      await click(page, tourCard(page).getByRole('button', { name: /Next/ }), { after: 300 })
      await page.getByRole('heading', { name: 'Discover', exact: true }).or(page.getByText('Discover', { exact: true })).first().waitFor()
      await pause(page, 2000)
      await click(page, tourCard(page).getByRole('button', { name: /Next/ }), { after: 300 })
      await pause(page, 1500)
    },
    // 6. Escape closes the tour.
    async (page) => {
      await pause(page, 800)
      await page.keyboard.press('Escape')
      await pause(page, 500)
    },
    // 7. The menu under the picture: point at Logout, then Esc.
    async (page) => {
      await click(page, page.getByRole('button', { name: /mira-dev/ }).first(), { ms: 900, after: 700 })
      const logout = page.getByRole('button', { name: /Logout/ }).or(page.getByRole('menuitem', { name: /Logout/ })).first()
      await point(page, logout, { ms: 700, hold: 2000, scroll: false })
      await page.keyboard.press('Escape')
      await pause(page, 300)
      await glide(page, 1100, 330, 700)
    },
  ]),
}
