// Screenshots for "Find your way around" and "Contributor, maintainer and admin views".

import { world } from '../world/index.mjs'
import { region, waitStable } from './contributors-work.mjs'

const C = world('contributor')
const contributor = { persona: C.persona, api: C.api, agent: C.agent, init: C.init }
const M = world('maintainer')
const maintainer = { persona: M.persona, api: M.api, agent: M.agent, init: M.init }

const themeButton = (page) => page.locator('button[title^="Switch to"]').first()
const roleButton = (page, name) => page.getByRole('button', { name, exact: true }).first()

/** Scrolls Discover so the setup checklist (left out of the docs) is above the viewport. */
async function scrollPastSetup(page) {
  const join = page.getByRole('button', { name: /Let's go/ })
  await join.waitFor({ timeout: 15000 })
  const card = page.locator('div.rounded-\\[24px\\]', { has: join }).last()
  const b = await card.boundingBox()
  await page.evaluate((dy) => window.scrollBy(0, dy), b.y - 4)
  await page.waitForTimeout(200)
}

export const SHOTS = [
  {
    id: 'shell-rail',
    page: 'find-your-way-around',
    url: '/dashboard?tab=discover',
    ...contributor,
    widths: [1440],
    steps: (page) => waitStable(page),
    ready: (page) => page.locator('button[data-tour-id="browse"]'),
    // The tooltip shows only while the pointer is over the icon, and the runner
    // parks the mouse before framing, so the hover happens here.
    frame: async (page) => {
      // Scroll the page so what shows beside the rail is the GrainHack card
      // and Recommended Projects, not the setup checklist above them.
      await scrollPastSetup(page)
      const browse = page.locator('button[data-tour-id="browse"]')
      await browse.hover()
      const tip = page.locator('div.fixed.pointer-events-none', { hasText: /^Browse$/ })
      await tip.waitFor({ timeout: 5000 })
      // Its fade-in runs on the frozen clock: advance it until it is fully shown.
      for (let i = 0; i < 40; i++) {
        await page.clock.runFor(100)
        await page.waitForTimeout(30)
        if ((await tip.evaluate((n) => getComputedStyle(n).opacity)) === '1') break
      }
      const t = await tip.boundingBox()
      const help = await page.getByRole('button', { name: /help/i }).last().boundingBox()
      return { x: 0, y: 0, width: Math.ceil(t.x + t.width + 28), height: Math.ceil(help.y + help.height + 32) }
    },
  },
  {
    id: 'shell-header',
    page: 'find-your-way-around',
    url: '/dashboard?tab=discover',
    ...contributor,
    widths: [1440],
    steps: (page) => waitStable(page),
    ready: (page) => page.locator('button[data-tour-id="search"]'),
    frame: async (page) => {
      const header = await page.locator('div.fixed.top-2.right-2').first().boundingBox()
      return { x: header.x - 8, y: 0, width: header.width + 16, height: header.y + header.height + 10 }
    },
  },
  {
    id: 'shell-phone-menu',
    page: 'find-your-way-around',
    url: '/dashboard?tab=discover',
    ...contributor,
    // A phone-only view: the menu button does not exist on a wide screen, so
    // the wide variant is the same phone screen (the page shows it beside a
    // section headed "On a phone").
    steps: async (page, width) => {
      if (width !== 390) await page.setViewportSize({ width: 390, height: 844 })
      await waitStable(page)
      await scrollPastSetup(page)
      await page.getByRole('button', { name: 'Open menu' }).click()
    },
    ready: (page) => page.getByText('Notification').first(),
    frame: () => 'viewport',
  },
  {
    id: 'views-switcher',
    page: 'views',
    url: '/dashboard?tab=discover',
    ...contributor,
    widths: [1440],
    steps: (page) => waitStable(page),
    ready: (page) => roleButton(page, 'MAINTAINER'),
    frame: async (page) => {
      const c = await roleButton(page, 'CONTRIBUTOR').boundingBox()
      const t = await themeButton(page).boundingBox()
      const header = await page.locator('div.fixed.top-2.right-2').first().boundingBox()
      const x = c.x - 150
      return { x, y: header.y - 4, width: t.x + t.width + 8 - x, height: header.height + 8 }
    },
  },
  {
    id: 'views-maintainer-page',
    page: 'views',
    url: '/dashboard?tab=maintainers&view=maintainer',
    ...maintainer,
    widths: [1440],
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('Pull Requests Merged').first(),
    frame: () => 'viewport',
  },
]

