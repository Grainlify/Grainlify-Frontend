// Screenshots for the payouts, rewards and account pages: Payout Preferences,
// payout readiness, ranks and leaderboard, Rewards, social follow, referrals,
// profile, edit profile, notifications, settings and getting help.
//
// Every Settings shot is cropped to the card it describes, so the Settings tab
// bar (which lists Billing Profiles) never shows, and no Payout Preferences
// crop reaches the Base address card below the Aptos one or a claim.

import { world } from '../world/index.mjs'
import {
  excludedNoAddress, foundingPlace, noPayoutContact, notifications, petraWallet, proofPng, rejectedFollow, revokedFollow,
  savedPayoutContact, supportHistory,
} from '../world/extra-account.mjs'

/** world('contributor', opts) with extra API answers and init scripts on top. */
function mira(opts = {}, extraApi = {}, extraInit = []) {
  const w = world('contributor', opts)
  return { persona: w.persona, api: { ...w.api, ...extraApi }, agent: w.agent, init: [...w.init, ...extraInit] }
}

/** The innermost element of `selector` that contains the text (exact match). */
const within = (page, selector, text) =>
  page.locator(selector).filter({ has: page.getByText(text, { exact: true }) }).last()

const CARD16 = 'div[class*="rounded-[16px]"]'
const CARD24 = 'div[class*="rounded-[24px]"]'

/**
 * A clip around the union of the elements, with room around it. Scrolls the
 * union below the fixed header, and grows the viewport when the union is taller
 * than the screen, so a long card is never cut off.
 * `bottom` (a locator) ends the frame at that element instead, plus `bottomPad`.
 */
async function frameAround(page, locators, { padX = 16, padY = 16, bottom = null, bottomPad = 32 } = {}) {
  const els = Array.isArray(locators) ? locators : [locators]
  const header = 90
  const measure = async () => {
    const boxes = await Promise.all(els.map((e) => e.boundingBox()))
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (const b of boxes) {
      if (!b) throw new Error('frameAround: an element is not visible')
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height)
    }
    if (bottom) {
      const b = await bottom.boundingBox()
      y2 = b.y + b.height + bottomPad - padY
    }
    return { x1, y1, x2, y2 }
  }
  let u = await measure()
  const vp = page.viewportSize()
  const need = Math.ceil(u.y2 - u.y1 + padY * 2 + header + 24)
  if (need > vp.height) {
    await page.setViewportSize({ width: vp.width, height: need })
    await page.waitForTimeout(250)
    u = await measure()
  }
  const scrollY = await page.evaluate(() => window.scrollY)
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, scrollY + u.y1 - padY - header))
  await page.waitForTimeout(250)
  u = await measure()
  const { width: vw, height: vh } = page.viewportSize()
  // Never reach into the icon rail at the left of the dashboard.
  const rail = await page.locator('aside').first().boundingBox({ timeout: 500 }).catch(() => null)
  const minX = rail && rail.x < 40 ? Math.ceil(rail.x + rail.width + 2) : 0
  // Nor into the fixed header bar, unless the frame is meant to include it.
  const headerBottom = await page.evaluate(() => {
    let bottom = 0
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed') continue
      const r = el.getBoundingClientRect()
      if (r.top < 12 && r.bottom < 200 && r.width > window.innerWidth * 0.5) bottom = Math.max(bottom, r.bottom)
    }
    return bottom
  })
  const minY = u.y1 >= headerBottom ? Math.ceil(headerBottom + 6) : 0
  const x = Math.max(minX, Math.floor(u.x1 - padX))
  const y = Math.max(minY, Math.floor(u.y1 - padY))
  return { x, y, width: Math.min(vw, Math.ceil(u.x2 + padX)) - x, height: Math.min(vh, Math.ceil(u.y2 + padY)) - y }
}

// --- Payout Preferences ------------------------------------------------------------

const PAYOUT = '/dashboard?tab=settings&subtab=payout'
const readinessCard = (page, text) => within(page, CARD16, text)
const addressCard = (page, text) => within(page, CARD16, text)

const payoutShots = [
  {
    id: 'payouts-payout-tab',
    page: 'contributors/payouts',
    url: PAYOUT,
    ...mira({}, noPayoutContact),
    ready: (page) => page.getByText('How should we contact you about payouts?'),
    frame: (page) => frameAround(page, [readinessCard(page, "You're set up for payouts"), addressCard(page, 'Payout address verified')]),
  },
  {
    id: 'payout-address-register',
    page: 'contributors/payout-address',
    url: PAYOUT,
    widths: [1440],
    ...mira({ readiness: 'register_now', payoutAddress: false }, {}, [petraWallet()]),
    ready: (page) => page.getByRole('button', { name: 'Connect wallet and verify' }),
    frame: (page) => frameAround(page, addressCard(page, 'Register your payout address')),
  },
  {
    id: 'payout-address-verified',
    page: 'contributors/payout-address',
    url: PAYOUT,
    ...mira({}, noPayoutContact),
    ready: (page) => page.getByText('How should we contact you about payouts?'),
    frame: (page) => frameAround(page, addressCard(page, 'Payout address verified')),
  },
  {
    id: 'payout-address-contact',
    page: 'contributors/payout-address',
    url: PAYOUT,
    ...mira({}, savedPayoutContact),
    ready: (page) => page.getByRole('button', { name: 'Remove' }),
    // From the contact label to the Save and Remove buttons: the field's own block.
    frame: (page) => frameAround(page, page.locator('div.mt-5.pt-5:has(#payout-contact)'), { padY: 8 }),
  },
  {
    id: 'readiness-register-now',
    page: 'contributors/payout-readiness',
    url: PAYOUT,
    ...mira({ readiness: 'register_now', payoutAddress: false }, {}, [petraWallet()]),
    ready: (page) => page.getByText('Register a payout address', { exact: true }),
    frame: (page) => frameAround(page, readinessCard(page, 'Register a payout address')),
  },
  {
    id: 'readiness-ready',
    page: 'contributors/payout-readiness',
    url: PAYOUT,
    ...mira({}, noPayoutContact),
    ready: (page) => page.getByText("You're set up for payouts"),
    frame: (page) => frameAround(page, readinessCard(page, "You're set up for payouts")),
  },
  {
    id: 'readiness-excluded',
    page: 'contributors/payout-readiness',
    url: PAYOUT,
    ...mira({ readiness: 'excluded_from_published', payoutAddress: false }, excludedNoAddress, [petraWallet()]),
    ready: (page) => page.getByText('Register a payout address below so this cannot happen again.'),
    frame: (page) => frameAround(page, readinessCard(page, 'You were left out of a payout that has already been published')),
  },
]

// --- Ranks and leaderboard ---------------------------------------------------------

const LEADERBOARD = '/dashboard?tab=leaderboard'
const waitForBoard = async (page) => {
  await page.getByRole('button', { name: 'This season' }).waitFor()
  await page.locator('[class*="animate-pulse"], [class*="skeleton" i]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
}

const boardToggle = (page) => page.getByRole('button', { name: 'Contributors', exact: true }).locator('..')
const filterRow = (page) => page.locator('div[class*="rounded-[20px]"]:has(button:text("This season"))').last()
const boardRow = (page, n) => page.locator('div[class*="divide-y"] > div').nth(n)

const rankShots = [
  {
    id: 'leaderboard-season',
    page: 'contributors/ranks-and-leaderboard',
    url: LEADERBOARD,
    ...mira(),
    steps: waitForBoard,
    ready: (page) => page.getByText('Seasonal Contributors'),
    // From the Contributors / Projects toggle down to the period and ecosystem row.
    frame: (page) => frameAround(page, [boardToggle(page), filterRow(page)]),
  },
  {
    id: 'profile-rank-card',
    page: 'contributors/ranks-and-leaderboard',
    url: '/dashboard?tab=profile',
    ...mira(),
    ready: (page) => page.getByTestId('rank-position'),
    frame: (page) => frameAround(page, page.getByTestId('rank-badge-card'), { padX: 16, padY: 16 }),
  },
  {
    id: 'leaderboard-projects',
    page: 'contributors/ranks-and-leaderboard',
    url: LEADERBOARD,
    ...mira(),
    steps: async (page) => {
      await waitForBoard(page)
      await page.getByRole('button', { name: 'Projects', exact: true }).first().click()
      await waitForBoard(page)
    },
    ready: (page) => page.getByText('Top Projects'),
    // The hero and podium, and the first rows of the table.
    frame: (page) => frameAround(page, [boardToggle(page)], { bottom: boardRow(page, 2), bottomPad: 2 }),
  },
  {
    id: 'leaderboard-ecosystems',
    page: 'contributors/ranks-and-leaderboard',
    url: LEADERBOARD,
    ...mira(),
    steps: async (page) => {
      await waitForBoard(page)
      await page.getByRole('button', { name: 'All Ecosystems' }).click()
    },
    ready: (page) => page.locator('div.animate-dropdown-in button').nth(3),
    frame: (page) =>
      frameAround(page, [filterRow(page), page.locator('div.animate-dropdown-in')]),
  },
]

// --- Rewards and social follow -----------------------------------------------------

const REWARDS = '/dashboard?tab=settings&subtab=rewards'
const followCard = (page) => page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Social Follow' }) }).last()
const statusBox = (page) => followCard(page).locator('div.mb-6.p-4')

const rewardsShots = [
  {
    id: 'rewards-position-eligible',
    page: 'rewards',
    url: REWARDS,
    ...mira({ follow: 'approved' }),
    ready: (page) => page.getByText("Your follow proof is approved, so you're eligible.", { exact: false }),
    frame: (page) => frameAround(page, within(page, CARD16, 'Founding member')),
  },
  {
    id: 'rewards-position-not-eligible',
    page: 'rewards',
    url: REWARDS,
    ...mira({ follow: 'none' }, foundingPlace),
    ready: (page) => page.getByText("You're not currently eligible to receive a share."),
    frame: (page) => frameAround(page, within(page, CARD16, 'Founding member')),
  },
  {
    id: 'rules-founding-pool',
    page: 'rewards',
    url: '/dashboard?tab=my-grainhack&subtab=rules',
    ...mira(),
    ready: (page) => page.getByRole('heading', { name: 'Founding pool', exact: true }),
    frame: (page) => frameAround(page, page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Founding pool', exact: true }) }).last()),
  },
  {
    id: 'social-follow-ready',
    page: 'contributors/social-follow',
    url: REWARDS,
    ...mira({ follow: 'none' }),
    steps: async (page) => {
      await page.getByLabel('LinkedIn screenshot').waitFor({ state: 'attached' })
      await page.getByLabel('LinkedIn screenshot').setInputFiles(proofPng())
      await page.getByLabel('X screenshot').setInputFiles(proofPng())
    },
    ready: (page) => page.getByText('Both screenshots ready.'),
    frame: (page) => frameAround(page, followCard(page)),
  },
  {
    id: 'social-follow-pending',
    page: 'contributors/social-follow',
    url: REWARDS,
    ...mira({ follow: 'pending' }),
    ready: (page) => page.getByText('Pending review'),
    // The top of the card, down to the status box.
    frame: (page) => frameAround(page, followCard(page), { bottom: statusBox(page), bottomPad: 12 }),
  },
  {
    id: 'social-follow-rejected',
    page: 'contributors/social-follow',
    url: REWARDS,
    ...mira({ follow: 'rejected' }, rejectedFollow),
    ready: (page) => page.getByText('Not approved'),
    // The top of the card, down to the status box.
    frame: (page) => frameAround(page, followCard(page), { bottom: statusBox(page), bottomPad: 12 }),
  },
  {
    id: 'social-follow-revoked',
    page: 'contributors/social-follow',
    url: REWARDS,
    ...mira({ follow: 'none' }, revokedFollow),
    ready: (page) => page.getByText('You can follow again and submit new screenshots to become eligible.'),
    frame: (page) => frameAround(page, statusBox(page), { padX: 24, padY: 20 }),
  },
  {
    id: 'referrals-tab',
    page: 'contributors/referrals',
    url: '/dashboard?tab=settings&subtab=referrals',
    ...mira(),
    ready: (page) => page.getByText('Total Referred'),
    frame: (page) => frameAround(page, within(page, CARD24, 'Referral Program')),
  },
]

// --- Profile and edit profile -----------------------------------------------------

const profileShots = [
  {
    id: 'profile-header',
    page: 'contributors/profile',
    url: '/dashboard?tab=profile',
    ...mira(),
    steps: async (page) => {
      await page.getByTestId('rank-position').waitFor()
      await page.getByText(/Contributor on/).waitFor()
    },
    ready: (page) => page.getByText(/^Lead\b/).first(),
    frame: (page) => frameAround(page, page.locator('div[class*="rounded-[32px]"]').first()),
  },
  {
    id: 'profile-activity',
    page: 'contributors/profile',
    url: '/dashboard?tab=profile',
    ...mira(),
    steps: async (page) => {
      await page.getByText('contributions last year').waitFor()
      await page.getByRole('heading', { name: 'Contributions Activity' }).scrollIntoViewIfNeeded()
    },
    ready: (page) => page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Contributions Activity' }) }).last().locator('div[class*="rounded-[12px]"].overflow-hidden').nth(1),
    frame: (page) => {
      const calendar = page.locator(CARD24).filter({ has: page.getByText('contributions last year') }).last()
      const activity = page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Contributions Activity' }) }).last()
      const second = activity.locator('div[class*="rounded-[12px]"].overflow-hidden').nth(1)
      return frameAround(page, [calendar, second], { bottom: second, bottomPad: 6 })
    },
  },
  {
    id: 'settings-profile-github',
    page: 'contributors/edit-profile',
    url: '/dashboard?tab=settings&subtab=profile',
    ...mira(),
    ready: (page) => page.getByRole('button', { name: /Resync/ }),
    frame: (page) =>
      frameAround(page, [within(page, CARD24, 'GitHub account'), within(page, CARD24, 'Profile Picture')]),
  },
  {
    id: 'settings-profile-details',
    page: 'contributors/edit-profile',
    url: '/dashboard?tab=settings&subtab=profile',
    ...mira(),
    ready: (page) => page.getByText('Contact Information', { exact: true }),
    frame: (page) =>
      frameAround(page, [page.locator(CARD24).filter({ has: page.getByText('First Name', { exact: true }) }).last(), within(page, CARD24, 'Contact Information')]),
  },
]

// --- Notifications, settings, help ------------------------------------------------

const accountShots = [
  {
    id: 'notifications-bell',
    page: 'contributors/notifications',
    url: '/dashboard?tab=discover',
    widths: [1440],
    ...mira({}, notifications),
    steps: async (page) => {
      await page.getByRole('button', { name: 'Notifications' }).click()
    },
    ready: (page) => page.getByText('See all notifications'),
    frame: (page) => frameAround(page, [page.locator('button[aria-label="Notifications"]:visible'), page.locator('[role="menu"]')], { padX: 24, padY: 20 }),
  },
  {
    id: 'notifications-page',
    page: 'contributors/notifications',
    url: '/dashboard?tab=notifications',
    ...mira({}, notifications),
    ready: (page) => page.getByRole('heading', { name: 'Earlier' }),
    // The top of the page, made tall enough to reach the Earlier group.
    frame: async (page) => {
      await page.evaluate(() => window.scrollTo(0, 0))
      const earlier = await page.getByRole('heading', { name: 'Earlier' }).boundingBox()
      const { width, height } = page.viewportSize()
      const want = Math.ceil(earlier.y + earlier.height + 150)
      if (want > height) await page.setViewportSize({ width, height: want })
      await page.waitForTimeout(250)
      return { x: 0, y: 0, width, height: Math.max(height, want) }
    },
  },
  {
    id: 'settings-notifications',
    page: 'contributors/notifications',
    url: '/dashboard?tab=settings&subtab=notifications',
    ...mira(),
    ready: (page) => page.getByRole('heading', { name: 'Contributor', exact: true }),
    frame: (page) =>
      frameAround(page, [
        within(page, CARD24, 'Notification Preferences'),
        page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Contributor', exact: true }) }).last(),
      ], { bottom: page.locator('div[class*="grid-cols-[1fr_140px_140px]"]').filter({ has: page.getByText('Pull request merged', { exact: true }) }).last(), bottomPad: 4 }),
  },
  {
    id: 'settings-menu',
    page: 'contributors/settings',
    url: '/dashboard?tab=discover',
    widths: [1440],
    ...mira(),
    steps: async (page) => {
      await page.getByRole('button', { name: /mira-dev/ }).first().click()
    },
    ready: (page) => page.getByRole('menuitem', { name: 'Public Profile' }),
    frame: (page) => frameAround(page, [page.locator('button[aria-haspopup="menu"]:visible:has-text("mira-dev")'), page.locator('[role="menu"]')], { padX: 24, padY: 20 }),
  },
  {
    id: 'settings-terms-accept',
    page: 'contributors/settings',
    url: '/dashboard?tab=settings&subtab=terms',
    ...mira(),
    ready: (page) => page.getByRole('heading', { name: 'Accept Terms' }),
    frame: (page) => frameAround(page, within(page, CARD24, 'Accept Terms')),
  },
  {
    id: 'support-form',
    page: 'contributors/getting-help',
    url: '/support',
    init: [],
    ready: (page) => page.getByRole('heading', { name: 'After you send this' }),
    frame: () => 'viewport',
  },
  {
    id: 'support-verification',
    page: 'contributors/getting-help',
    url: '/support',
    init: [],
    steps: async (page) => {
      await page.getByRole('radio', { name: 'Verification' }).click()
    },
    ready: (page) => page.getByText("What's happening?").first(),
    frame: (page) => frameAround(page, page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Get help' }) }).last()),
  },
  {
    id: 'support-history',
    page: 'contributors/getting-help',
    url: '/dashboard?tab=support',
    ...mira({}, supportHistory),
    ready: (page) => page.getByText('sr-9e41a3b7'),
    frame: (page) => frameAround(page, page.locator(CARD24).filter({ has: page.getByRole('heading', { name: 'Your reports' }) }).last()),
  },
]

export const SHOTS = [...payoutShots, ...rankShots, ...rewardsShots, ...profileShots, ...accountShots]
