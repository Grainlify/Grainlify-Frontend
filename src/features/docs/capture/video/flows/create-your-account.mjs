// Create your account: sign-in and sign-up pages (signed out), then mira-dev's
// first visit to the dashboard with the product tour, then the profile menu.
//
// The browser starts signed out (no persona), so /signin shows its form and
// the tour has not been seen. Segment 4 signs in by storing the session token
// the app reads (through its own /auth/callback route, as GitHub's redirect
// does), which opens /dashboard: GitHub's own approval page is never shown.

import { world } from '../../world/index.mjs'
import { mainThreadAnimations, cursor, setupDone, click, point, moveTo, stable, wait } from './_start-motion.mjs'

const w = world('contributor')
const LOGIN = w.persona.login

const signInButton = (page) => page.getByRole('button', { name: /Sign in with GitHub/ }).first()
const tourCard = (page) => page.locator('div.fixed.inset-0 div.rounded-\\[20px\\]', { has: page.getByRole('button', { name: 'Close tour' }) }).last()
const profileButton = (page) => page.locator(`button:has(img[alt="${LOGIN}"])`).first()

export default {
  start: {
    url: '/signin',
    api: w.api,
    agent: w.agent,
    init: [...w.init, cursor(), setupDone(), mainThreadAnimations()],
    ready: signInButton,
  },
  segments: [
    // 1. The sign-in page; pointer onto Sign in with GitHub, no click.
    async (page) => {
      await wait(page, 1500)
      await point(page, signInButton(page), { steps: 30, pause: 0 })
    },
    // 2. To the sign-up page, point at Sign up with GitHub, and back to /signin.
    async (page) => {
      await click(page, page.getByRole('link', { name: 'Sign Up', exact: true }))
      const up = page.getByRole('button', { name: /Sign up with GitHub/ }).first()
      await up.waitFor({ timeout: 10000 })
      await wait(page, 400)
      await point(page, up, { steps: 25, pause: 2200 })
      await click(page, page.getByRole('link', { name: 'Sign In', exact: true }))
      await signInButton(page).waitFor({ timeout: 10000 })
    },
    // 3. Stay on /signin with the pointer on the button. No click.
    async (page) => {
      await point(page, signInButton(page), { steps: 25, pause: 0 })
    },
    // 4. Signed in: /dashboard on a first visit, Discover with the tour's first step.
    async (page) => {
      // GitHub sends the browser back to Grainlify's callback with a session
      // token, which signs you in and opens the dashboard. Done in-page (no
      // reload) so the page's animation timeline stays in step with the clock.
      await page.evaluate(() => {
        window.history.pushState({}, '', '/auth/callback?token=docs-capture')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      await page.getByText(`Welcome to Grainlify, ${LOGIN}!`).waitFor({ timeout: 20000 })
      await wait(page, 300)
      await moveTo(page, 1100, 700, { pause: 0, steps: 15 })
    },
    // 5. Next twice, pausing on the Discover and Browse steps.
    async (page) => {
      const next = () => tourCard(page).getByRole('button', { name: 'Next', exact: true })
      await click(page, next(), { scroll: false })
      await page.getByText('The most active projects on Grainlify', { exact: false }).waitFor({ timeout: 5000 })
      await wait(page, 2600)
      await click(page, next(), { scroll: false })
      await page.getByText('Explore every project on the platform', { exact: false }).waitFor({ timeout: 5000 })
    },
    // 6. Esc closes the tour.
    async (page) => {
      await wait(page, 1800)
      await page.keyboard.press('Escape')
      await tourCard(page).waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
      await moveTo(page, 900, 560, { pause: 0, steps: 25 })
    },
    // 7. The menu under the picture: point at Logout, then Esc.
    async (page) => {
      await click(page, profileButton(page), { scroll: false })
      const logout = page.getByRole('menuitem', { name: 'Logout' }).first()
      await logout.waitFor({ timeout: 5000 })
      await wait(page, 500)
      await point(page, logout, { steps: 25, pause: 6500, scroll: false })
      await page.keyboard.press('Escape')
      await stable(page, 1500)
    },
  ],
}
