// Screenshots for switching bounties on per repository (admins/bounty-repositories)
// and the maintainer Bounties tab (maintainers/bounties).
//
// Data: world/extra-bounty-repos.mjs. The admin frames are the Bounty
// Repositories card only (never the rail, whose first item is the Data page).
// The maintainer frames are one bounty card each, one per phase.

import { adminBountyReposWorld, maintainerBountiesWorld, PHASE_BOUNTY } from '../world/extra-bounty-repos.mjs'

const ADMIN = adminBountyReposWorld()
const MAINT = maintainerBountiesWorld()
const REVIEWS = '/dashboard?tab=admin&view=admin'
const BOUNTIES_TAB = '/dashboard?tab=maintainers&view=maintainer&subtab=Bounties'
const DESKTOP = [1440]
const VIEW = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }

// --- Helpers (the same approach as shots/admins.mjs) ------------------------------------------

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The innermost rounded card that holds a heading with exactly this text. */
const card = (page, heading, cls = 'rounded-[24px]') =>
  page.locator(`div[class*="${cls}"]`, { has: page.locator('h2, h3', { hasText: new RegExp(`^\\s*${esc(heading)}\\s*$`) }) }).last()

async function waitStable(page, maxMs = 15000) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(200)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin, [aria-busy="true"]').length)
    if (n === last) {
      if (++same >= 4) return
    } else {
      same = 0
      last = n
    }
  }
}

const fixedBars = (page) =>
  page.evaluate(() => {
    let top = 0
    let bottom = 0
    let left = 0
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || r.right <= 0) continue
      if (r.left < 40 && r.width < innerWidth * 0.3 && r.height > innerHeight * 0.5) left = Math.max(left, r.right)
      if (r.width < innerWidth * 0.5 || r.height > innerHeight * 0.5) continue
      if (r.top < 40) top = Math.max(top, r.bottom)
      else if (r.bottom > innerHeight - 40) bottom = Math.max(bottom, innerHeight - r.top)
    }
    return { top, bottom, left }
  })

const union = async (locators) => {
  const boxes = []
  for (const l of locators) boxes.push(await l.boundingBox())
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const r = Math.max(...boxes.map((b) => b.x + b.width))
  const btm = Math.max(...boxes.map((b) => b.y + b.height))
  return { x, y, width: r - x, height: btm - y }
}

/** Frames some elements with padding, growing the viewport when they do not fit under the fixed bars. */
const fit = (get, { pad = 20 } = {}) => async (page, width) => {
  const locs = [get(page)].flat()
  const bars = await fixedBars(page)
  let b = await union(locs)
  const need = Math.ceil(b.height + pad * 2 + bars.top + bars.bottom + 16)
  if (need > VIEW[width].height) {
    await page.setViewportSize({ width: VIEW[width].width, height: need })
    await page.waitForTimeout(300)
  }
  const offset = bars.top + pad + 8
  await locs[0].evaluate((n, off) => {
    const y = n.getBoundingClientRect().top + window.scrollY - off
    window.scrollTo(0, Math.max(0, y))
  }, offset)
  await page.waitForTimeout(300)
  b = await union(locs)
  const vw = page.viewportSize().width
  const x = Math.max(bars.left + 4, b.x - pad)
  const y = Math.max(bars.top + 8, b.y - pad)
  return { x, y, width: Math.min(b.width + pad * 2, vw - x), height: b.y + b.height + pad - y }
}

/** Scrolls the Bounty Repositories section into view once it has loaded. */
async function toRepos(page) {
  await card(page, 'Bounty Repositories').getByText('tidewater-labs/tide-sdk', { exact: true }).waitFor({ timeout: 20000 })
  await waitStable(page)
  await card(page, 'Bounty Repositories').evaluate((n) => {
    n.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -120)
  })
  await waitStable(page)
}

/** The maintainer card for one bounty, by its issue title. */
const bountyCard = (page, b) => page.locator('div[class*="rounded-[20px]"]', { has: page.getByText(b.issueTitle, { exact: true }) }).last()

/** Scrolls a maintainer bounty card into view once every card has loaded. */
const toBounty = (b) => async (page) => {
  await page.getByText('Bounties on your repositories').waitFor({ timeout: 20000 })
  await page.getByText(b.issueTitle, { exact: true }).waitFor()
  await waitStable(page)
  await bountyCard(page, b).evaluate((n) => {
    n.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -120)
  })
  await waitStable(page)
}

/** The scrolling container on the Maintainers page is not the window, so frame with that in mind. */
const fitInner = (get, { pad = 16 } = {}) => async (page, width) => {
  const loc = get(page)
  let b = await loc.boundingBox()
  const v = page.viewportSize()
  if (b.y < 0 || b.y + b.height > v.height) {
    await loc.evaluate((n) => n.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)
    b = await loc.boundingBox()
  }
  if (b.height + pad * 2 > v.height - 16) {
    await page.setViewportSize({ width: VIEW[width].width, height: Math.ceil(v.height + (b.height + pad * 2 - v.height) + 160) })
    await page.waitForTimeout(300)
    await loc.evaluate((n) => n.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)
    b = await loc.boundingBox()
  }
  const vw = page.viewportSize().width
  const x = Math.max(0, b.x - pad)
  const y = Math.max(0, b.y - pad)
  return { x, y, width: Math.min(b.width + pad * 2, vw - x), height: b.y + b.height + pad - y }
}

// --- Shots ------------------------------------------------------------------------------------

export const SHOTS = [
  // admins/bounty-repositories
  {
    id: 'admin-bountyrepos-list',
    page: 'admins/bounty-repositories',
    url: REVIEWS,
    ...ADMIN,
    steps: toRepos,
    ready: (page) => page.getByText('Known to the agent, not a Grainlify project'),
    frame: fit((page) => card(page, 'Bounty Repositories')),
  },

  // maintainers/bounties
  {
    id: 'maint-bounties-open',
    page: 'maintainers/bounties',
    url: BOUNTIES_TAB,
    ...MAINT,
    widths: DESKTOP,
    steps: toBounty(PHASE_BOUNTY.open),
    ready: (page) => page.getByText('A few applicants'),
    frame: async (page, width) => {
      // The tab's header card and the first bounty, together: the header says what this tab is.
      const header = page.locator('div[class*="rounded-[20px]"]', { has: page.getByText('Bounties on your repositories') }).last()
      await header.evaluate((n) => n.scrollIntoView({ block: 'start' }))
      await page.waitForTimeout(300)
      const h = await header.boundingBox()
      const c = await bountyCard(page, PHASE_BOUNTY.open).boundingBox()
      const pad = 16
      const bottom = c.y + c.height + pad
      if (bottom > page.viewportSize().height) {
        await page.setViewportSize({ width: VIEW[width].width, height: Math.ceil(bottom + 40) })
        await page.waitForTimeout(300)
      }
      const h2 = await header.boundingBox()
      const c2 = await bountyCard(page, PHASE_BOUNTY.open).boundingBox()
      return { x: h2.x - pad, y: h2.y - pad, width: h2.width + pad * 2, height: c2.y + c2.height + pad - (h2.y - pad) }
    },
  },
  {
    id: 'maint-bounties-closed',
    page: 'maintainers/bounties',
    url: BOUNTIES_TAB,
    ...MAINT,
    widths: DESKTOP,
    steps: toBounty(PHASE_BOUNTY.closed),
    ready: (page) => page.getByText('not eligible (account_too_new)').first(),
    frame: fitInner((page) => bountyCard(page, PHASE_BOUNTY.closed)),
  },
  {
    id: 'maint-bounties-drawn',
    page: 'maintainers/bounties',
    url: BOUNTIES_TAB,
    ...MAINT,
    widths: DESKTOP,
    steps: toBounty(PHASE_BOUNTY.drawn),
    ready: (page) => page.getByText('Drawn: jun-okafor'),
    frame: fitInner((page) => bountyCard(page, PHASE_BOUNTY.drawn)),
  },
]
