// The admin pages' screenshots (content/admins/*.md), all as ada-admin.
//
// Data: world('admin') plus world/extra-admin.mjs (logos, an overridden draw
// weight, extra GrainHack draws, a verdict awaiting review, a pending appeal
// against a rejected verdict, and phase transitions in the audit trail).
//
// Things these frames keep out, because the docs never mention them: the admin
// rail (its first item is the Data page), the Open-Source Week events card on
// Reviews, and the KeeperHub payout panel on a GrainHack event page. Every
// frame is a card or a window, never the whole viewport.

import sharp from 'sharp'
import { world, BOUNTIES } from '../world/index.mjs'
import { extraAdminApi, DEMO_LOGO_SVG } from '../world/extra-admin.mjs'

const W = world('admin')
const ADMIN = { persona: W.persona, api: { ...W.api, ...extraAdminApi(W.api) }, agent: W.agent, init: W.init }
const LOGO_PNG = await sharp(Buffer.from(DEMO_LOGO_SVG)).resize(128, 128).png().toBuffer()

// The bounty the draw shots choose: applications open, three applicants, nobody holding it.
const DRAW_BOUNTY = BOUNTIES.find((b) => b.repo === 'kestrel-data/sieve' && b.issueNumber === 17)

const REVIEWS = '/dashboard?tab=admin&view=admin'
const HACKATHONS = '/dashboard?tab=grainhack&view=admin&subtab=hackathons'
const VIEW = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }

// --- Finding things -----------------------------------------------------------------------

/** The innermost card (rounded-[24px]) that holds a heading with exactly this text. */
const card = (page, heading) =>
  page.locator('div[class*="rounded-[24px]"]', { has: page.locator('h2, h3', { hasText: new RegExp(`^\\s*${esc(heading)}\\s*$`) }) }).last()
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The open window (shared Modal). */
const modal = (page) => page.locator('div[class*="z-[10000]"] > div').last()
/** A form field in a window, found by the text of its label. */
const field = (scope, label) => scope.locator('label', { hasText: label }).first().locator('xpath=following::*[self::input or self::textarea][1]')

/** Waits until the page's text and spinner count stop changing. */
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

/** Scrolls an element into view under the fixed header. */
async function reveal(page, locator) {
  await locator.waitFor({ timeout: 15000 })
  await locator.evaluate((n) => {
    n.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -120)
  })
  await waitStable(page)
}

/** Opens a GrainHack event from the Hackathons list. */
const openEvent = (name) => async (page) => {
  await page.getByText(name, { exact: true }).first().click()
  await page.getByRole('heading', { name, exact: true }).waitFor({ timeout: 15000 })
  await waitStable(page)
}

// --- Framing ------------------------------------------------------------------------------

/** How much of the viewport the app's fixed bars cover, top and bottom. */
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
      // The rail down the left edge (its first item is the admin Data page).
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

/**
 * Frames the union of some elements on the page, with padding. The viewport is
 * made taller when they do not fit under the app's fixed bars, and the page is
 * scrolled so they sit just below the header.
 */
const fit = (get, { pad = 20, until = null, untilPad = 10, inHeader = false } = {}) => async (page, width) => {
  const locs = [get(page)].flat()
  const measure = async () => {
    const b = await union(locs)
    if (!until) return b
    const u = await until(page).boundingBox()
    return { ...b, height: u.y + u.height + untilPad - b.y }
  }
  // Something inside the fixed header is framed where it is, without scrolling.
  const bars = inHeader ? { top: -8, bottom: 0, left: -4 } : await fixedBars(page)
  let b = await measure()
  const need = Math.ceil(b.height + pad * 2 + bars.top + bars.bottom + 16)
  if (need > VIEW[width].height) {
    await page.setViewportSize({ width: VIEW[width].width, height: need })
    await page.waitForTimeout(300)
  }
  const offset = bars.top + pad + 8
  if (!inHeader)
    await locs[0].evaluate((n, off) => {
      const y = n.getBoundingClientRect().top + window.scrollY - off
      window.scrollTo(0, Math.max(0, y))
    }, offset)
  await page.waitForTimeout(300)
  b = await measure()
  const vw = page.viewportSize().width
  const x = Math.max(bars.left + 4, b.x - pad)
  const y = Math.max(bars.top + 8, b.y - pad)
  return { x, y, width: Math.min(b.x + b.width + pad, vw) - x, height: b.y + b.height + (until ? 0 : pad) - y }
}

/**
 * Frames the open window. When its body scrolls, the viewport is made taller
 * until the whole window shows (the window is capped at 90% of the viewport).
 */
const fitModal = (until = null, { pad = 32 } = {}) => async (page, width) => {
  for (let i = 0; i < 4; i++) {
    const overflow = await modal(page).evaluate((m) => {
      let o = 0
      for (const el of [m, ...m.querySelectorAll('*')]) {
        const oy = getComputedStyle(el).overflowY
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) o = Math.max(o, el.scrollHeight - el.clientHeight)
      }
      return o
    })
    if (!overflow) break
    const h = page.viewportSize().height
    await page.setViewportSize({ width: VIEW[width].width, height: Math.ceil(h + overflow / 0.9 + 24) })
    await page.waitForTimeout(300)
  }
  const m = modal(page)
  const b = until ? await union([m.locator('> div').first(), until(page)]) : await m.boundingBox()
  const mb = await m.boundingBox()
  const vw = page.viewportSize().width
  const p = width === 390 ? 10 : pad
  const x = Math.max(0, mb.x - p)
  const y = Math.max(0, mb.y - p)
  const bottom = until ? b.y + b.height + 20 : mb.y + mb.height + p
  return { x, y, width: Math.min(mb.width + p * 2, vw - x), height: bottom - y }
}

// --- Steps shared by several shots --------------------------------------------------------

const toSection = (heading) => async (page) => {
  await waitStable(page)
  await reveal(page, card(page, heading))
}

const selectDrawBounty = async (page) => {
  await toSection('Bounty Draw')(page)
  await page.getByRole('combobox', { name: 'Bounty' }).selectOption(DRAW_BOUNTY.id)
  await page.getByRole('heading', { name: 'Applications', exact: true }).waitFor()
  await waitStable(page)
}

const drawRow = (page, re) => card(page, 'Draws').locator('div[class*="rounded-[16px]"]', { hasText: re }).last()

const verdictsNeedsReview = async (page) => {
  await openEvent('GrainHack Summer 2026')(page)
  await reveal(page, card(page, 'Judging'))
  await card(page, 'Judging').getByText('ines-byte · accepted').waitFor()
}

const firstPendingAppeal = (page) =>
  card(page, 'Appeals').locator('div', { has: page.getByRole('button', { name: 'Decide this appeal' }) }).last()

// --- The shots ----------------------------------------------------------------------------

export const SHOTS = [
  // admins/access
  {
    id: 'admin-role-switcher',
    page: 'admins/access',
    url: REVIEWS,
    ...ADMIN,
    // The role pills live in the desktop header; on a phone the switcher is not shown.
    widths: [1440],
    ready: (page) => page.getByRole('heading', { name: 'Admin Panel' }),
    frame: fit(
      (page) => ['CONTRIBUTOR', 'ADMIN'].map((name) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).first()),
      { pad: 22, inHeader: true },
    ),
  },
  {
    id: 'admin-reviews-header',
    page: 'admins/access',
    url: REVIEWS,
    ...ADMIN,
    ready: (page) => page.getByText('Admin Access'),
    frame: fit((page) => page.locator('div[class*="rounded-[28px]"]', { has: page.getByRole('heading', { name: 'Admin Panel' }) }).last()),
  },

  // admins/kyc-review
  {
    id: 'admin-kyc-queue',
    page: 'admins/kyc-review',
    url: REVIEWS,
    ...ADMIN,
    steps: toSection('Verification Review'),
    ready: (page) => card(page, 'Verification Review').getByText('dara-loop'),
    frame: fit((page) => card(page, 'Verification Review')),
  },
  {
    id: 'admin-kyc-reset-modal',
    page: 'admins/kyc-review',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Verification Review')(page)
      // ines-byte, first in the queue, has exactly one suggested reason.
      await card(page, 'Verification Review').getByRole('button', { name: 'Send feedback & reset' }).first().click()
      const m = modal(page)
      await m.getByText('What should they fix?').waitFor()
      await field(m, 'Anything to add?').fill('Please retake it in daylight with the whole card in the frame.')
      await field(m, 'Why are you resetting?').fill('Didit could not read the date of birth. Declined there first.')
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Reset ines-byte' }),
    frame: fitModal(),
  },

  // admins/social-follow-review
  {
    id: 'admin-follow-queue',
    page: 'admins/social-follow-review',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Social Follow Review')(page)
      const boxes = page.getByRole('checkbox', { name: /^Select .*'s submission$/ })
      await boxes.nth(0).check()
      await boxes.nth(1).check()
    },
    ready: (page) => page.getByRole('button', { name: 'Approve selected (2)' }),
    frame: fit((page) => card(page, 'Social Follow Review')),
  },
  {
    id: 'admin-follow-proofs',
    page: 'admins/social-follow-review',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Social Follow Review')(page)
      await page.getByRole('button', { name: "Show arun-patch's follow proofs" }).click()
      await waitStable(page)
    },
    ready: (page) => page.getByRole('button', { name: "Hide arun-patch's follow proofs" }),
    frame: fit(
      (page) => card(page, 'Social Follow Review').locator('div[class*="rounded-[16px]"]', { has: page.getByRole('button', { name: "Hide arun-patch's follow proofs" }) }).last(),
      { pad: 12 },
    ),
  },
  {
    id: 'admin-follow-reject-modal',
    page: 'admins/social-follow-review',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Social Follow Review')(page)
      const row = card(page, 'Social Follow Review').locator('div[class*="rounded-[16px]"]', { hasText: 'arun-patch' }).last()
      await row.getByRole('button', { name: 'Reject' }).click()
      const m = modal(page)
      await m.getByText("X proof doesn't show a follow").click()
      await field(m, 'Note').fill('The X screenshot shows the profile but not the Following state.')
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Reject this proof' }),
    frame: fitModal(),
  },
  {
    id: 'admin-follow-bulk-confirm',
    page: 'admins/social-follow-review',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Social Follow Review')(page)
      const boxes = page.getByRole('checkbox', { name: /^Select .*'s submission$/ })
      for (const i of [0, 1, 2]) await boxes.nth(i).check()
      await page.getByRole('button', { name: 'Approve selected (3)' }).click()
    },
    ready: (page) => modal(page).getByRole('button', { name: 'Approve 3' }),
    frame: fitModal(),
  },

  // admins/ecosystems
  {
    id: 'admin-ecosystems-grid',
    page: 'admins/ecosystems',
    url: REVIEWS,
    ...ADMIN,
    ready: (page) => card(page, 'Ecosystem Management').getByText('Lumen Testnet'),
    steps: async (page) => {
      await card(page, 'Ecosystem Management').getByText('Lumen Testnet').waitFor()
      await waitStable(page)
    },
    frame: fit((page) => card(page, 'Ecosystem Management')),
  },
  {
    id: 'admin-ecosystem-add-modal',
    page: 'admins/ecosystems',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await card(page, 'Ecosystem Management').getByText('Lumen Testnet').waitFor()
      await page.getByRole('button', { name: /Add New Ecosystem/ }).click()
      const m = modal(page)
      await field(m, 'Ecosystem Name').fill('Docs Demo Chain')
      await field(m, 'Description').fill('A test network used to show how ecosystems are added.')
      await m.locator('input[type="file"]').first().setInputFiles({ name: 'docs-demo-chain.png', mimeType: 'image/png', buffer: LOGO_PNG })
      await m.locator('img[src^="data:image"]').first().waitFor()
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Add New Ecosystem' }),
    // The top of the window: name, description, logo and status.
    frame: fitModal((page) => modal(page).getByText('Status', { exact: false }).first().locator('xpath=following::*[@role="combobox" or self::button][1]')),
  },
  {
    id: 'admin-ecosystem-edit-modal',
    page: 'admins/ecosystems',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      const c = card(page, 'Ecosystem Management')
      await c.getByText('Solana', { exact: true }).waitFor()
      await c.locator('div[class*="rounded-[16px]"]', { has: page.getByRole('heading', { name: 'Solana', exact: true }) }).last().getByTitle('Edit ecosystem').click()
      await modal(page).getByText('Leave as is to keep the current logo').waitFor()
      await waitStable(page)
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Edit Ecosystem' }),
    frame: fitModal((page) => modal(page).getByText('Leave as is to keep the current logo')),
  },
  {
    id: 'admin-ecosystem-delete-modal',
    page: 'admins/ecosystems',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      const c = card(page, 'Ecosystem Management')
      await c.getByText('Lumen Testnet', { exact: true }).waitFor()
      await c.locator('div[class*="rounded-[16px]"]', { has: page.getByRole('heading', { name: 'Lumen Testnet', exact: true }) }).last().getByTitle('Delete ecosystem').click()
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Delete Ecosystem' }),
    frame: fitModal(),
  },

  // admins/bounty-draw
  {
    id: 'admin-bountydraw-result',
    // The result table scrolls sideways on a phone, so Share and the
    // weights are off screen: desktop only.
    widths: [1440],
    page: 'admins/bounty-draw',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await selectDrawBounty(page)
      await page.getByRole('button', { name: 'Simulate', exact: true }).click()
      await page.getByRole('button', { name: 'Yes, simulate' }).click()
      await page.getByRole('heading', { name: 'Simulated draw' }).waitFor()
      await waitStable(page)
    },
    ready: (page) => page.getByRole('heading', { name: 'Simulated draw' }),
    frame: fit((page) => {
      const box = (h) => card(page, 'Bounty Draw').locator('div[class*="rounded-[16px]"]', { has: page.getByRole('heading', { name: h, exact: true }) }).last()
      return [box('Applications'), box('Simulated draw')]
    }),
  },
  {
    id: 'admin-bountydraw-run',
    page: 'admins/bounty-draw',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await selectDrawBounty(page)
      await page.getByRole('button', { name: 'Run draw now' }).click()
    },
    ready: (page) => page.getByRole('button', { name: 'Yes, run the draw' }),
    frame: fit((page) => card(page, 'Bounty Draw').locator('div[class*="rounded-[16px]"]', { has: page.getByRole('heading', { name: 'Run a draw', exact: true }) }).last()),
  },
  {
    id: 'admin-bountydraw-settings',
    page: 'admins/bounty-draw',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Bounty Draw')(page)
      await reveal(page, page.getByText('Weights', { exact: true }))
    },
    ready: (page) => page.getByText('Overridden (default 1.5) by ada-admin'),
    frame: fit((page) => page.getByText('Weights', { exact: true }).locator('xpath=..')),
  },

  // admins/grainhack-events
  {
    id: 'admin-gh-list',
    page: 'admins/grainhack-events',
    url: HACKATHONS,
    ...ADMIN,
    ready: (page) => page.getByText('GrainHack Winter 2026'),
    frame: fit((page) => [page.getByRole('button', { name: 'Global Audit' }).locator('xpath=..'), card(page, 'Hackathons')]),
  },
  {
    id: 'admin-gh-requirements',
    page: 'admins/grainhack-events',
    url: HACKATHONS,
    ...ADMIN,
    steps: openEvent('GrainHack Winter 2026'),
    ready: (page) => page.getByText('Requirements for Application period'),
    frame: fit((page) => page.locator('div[class*="rounded-[24px]"]', { has: page.getByRole('heading', { name: 'GrainHack Winter 2026', exact: true }) }).last()),
  },
  {
    id: 'admin-gh-overrides',
    page: 'admins/grainhack-events',
    url: HACKATHONS,
    ...ADMIN,
    // Harbor Sprint, still taking applications: the time to set overrides,
    // before the event goes live. Its first override is in Issue intake.
    steps: async (page) => {
      await openEvent('GrainHack Harbor Sprint')(page)
      await reveal(page, card(page, 'Rule overrides for this event'))
    },
    ready: (page) => card(page, 'Rule overrides for this event').getByText('overridden', { exact: true }).first(),
    frame: fit((page) => card(page, 'Rule overrides for this event'), {
      until: (page) => card(page, 'Rule overrides for this event').locator('div[class*="rounded-[24px]"]', { has: page.locator('h3', { hasText: /^Issue intake$/ }) }).last(),
    }),
  },

  // admins/grainhack-applications
  {
    id: 'admin-gh-applications',
    // On a phone the application row squeezes its description to one
    // word per line and the signal values run into their labels: desktop only.
    widths: [1440],
    page: 'admins/grainhack-applications',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Harbor Sprint')(page)
      const c = card(page, 'Pending project applications')
      await reveal(page, c)
      await c.getByText('quill-docs').first().click()
      await c.getByText('Distinct contributors').waitFor()
      await waitStable(page)
    },
    ready: (page) => card(page, 'Pending project applications').getByText('Prior flagged associations'),
    frame: fit((page) => card(page, 'Pending project applications')),
  },
  {
    id: 'admin-gh-application-reason-modal',
    page: 'admins/grainhack-applications',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Harbor Sprint')(page)
      const c = card(page, 'Pending project applications')
      await reveal(page, c)
      await c.getByTitle('Request more info').first().click()
      await field(modal(page), 'Reason').fill('Please add acceptance criteria to the issues you plan to enter.')
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Request more info' }),
    frame: fitModal(),
  },

  // admins/grainhack-draws
  {
    id: 'admin-gh-draws-list',
    // On a phone a row with a badge squeezes its summary to one word
    // per line: desktop only.
    widths: [1440],
    page: 'admins/grainhack-draws',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Autumn 2026')(page)
      await reveal(page, card(page, 'Draws'))
      await card(page, 'Draws').getByText('Show simulations').click()
      await card(page, 'Draws').getByText('simulation', { exact: true }).waitFor()
      await waitStable(page)
    },
    ready: (page) => card(page, 'Draws').getByText('weak pool', { exact: true }),
    frame: fit((page) => card(page, 'Draws')),
  },
  {
    id: 'admin-gh-draw-breakdown',
    // The ticket table scrolls sideways on a phone, so Tickets and Odds
    // are off screen: desktop only.
    widths: [1440],
    page: 'admins/grainhack-draws',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Autumn 2026')(page)
      await reveal(page, card(page, 'Draws'))
      await drawRow(page, /brine[^#]*#22/).locator('button').first().click()
      await waitStable(page)
    },
    ready: (page) => drawRow(page, /brine[^#]*#22/).getByText('Won', { exact: true }),
    frame: fit((page) => drawRow(page, /brine[^#]*#22/), { pad: 12 }),
  },
  {
    id: 'admin-gh-simulation',
    // The ticket table scrolls sideways on a phone, so Tickets and Odds
    // are off screen: desktop only.
    widths: [1440],
    page: 'admins/grainhack-draws',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Autumn 2026')(page)
      await reveal(page, card(page, 'Draws'))
      await drawRow(page, /brine[^#]*#22/).getByTitle(/Re-run this draw/).click()
      await page.getByText(/^Simulation · seed/).waitFor()
      await waitStable(page)
    },
    ready: (page) => card(page, 'Draws').getByRole('button', { name: 'Dismiss' }),
    frame: fit((page) => card(page, 'Draws').locator('div[class*="rounded-[16px]"]', { has: page.getByText(/^Simulation · seed/) }).last(), { pad: 12 }),
  },

  // admins/grainhack-verdicts
  {
    id: 'admin-gh-disagreement',
    page: 'admins/grainhack-verdicts',
    url: HACKATHONS,
    ...ADMIN,
    steps: verdictsNeedsReview,
    ready: (page) => card(page, 'Judging').getByText('Cross-check disagreement'),
    frame: fit((page) => card(page, 'Judging'), { until: (page) => card(page, 'Judging').getByRole('button', { name: 'Pre-filtered out' }) }),
  },
  {
    id: 'admin-gh-verdict-detail',
    page: 'admins/grainhack-verdicts',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await verdictsNeedsReview(page)
      await card(page, 'Judging').getByText('ines-byte · accepted').click()
      await waitStable(page)
    },
    ready: (page) => card(page, 'Judging').getByRole('button', { name: 'Set verdict' }),
    frame: fit((page) => card(page, 'Judging').locator('div[class*="rounded-[16px]"]', { has: page.getByRole('button', { name: 'Set verdict' }) }).last(), { pad: 12 }),
  },
  {
    id: 'admin-gh-override-modal',
    page: 'admins/grainhack-verdicts',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await verdictsNeedsReview(page)
      await card(page, 'Judging').getByText('ines-byte · accepted').click()
      await card(page, 'Judging').getByRole('button', { name: 'Set verdict' }).click()
      const m = modal(page)
      await m.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'Substantial' }).click()
      await field(m, 'Why').fill('Adds tests for both edge cases the issue lists; the judge missed the second test file.')
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Set the final verdict' }),
    frame: fitModal(),
  },
  {
    id: 'admin-gh-appeals',
    page: 'admins/grainhack-verdicts',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Summer 2026')(page)
      await reveal(page, card(page, 'Appeals'))
    },
    ready: (page) => card(page, 'Appeals').getByText('Awaiting decision').first(),
    // From the heading to the first appeal's grounds. The verdict underneath
    // is left out of the frame (see the report on the shadow-mode note).
    frame: fit((page) => card(page, 'Appeals'), { until: (page) => card(page, 'Appeals').getByText('Their grounds:').first().locator('xpath=..') }),
  },
  {
    id: 'admin-gh-appeal-modal',
    page: 'admins/grainhack-verdicts',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Summer 2026')(page)
      await reveal(page, card(page, 'Appeals'))
      await card(page, 'Appeals').getByRole('button', { name: 'Decide this appeal' }).first().click()
      const m = modal(page)
      await m.getByRole('button', { name: 'Uphold', exact: true }).click()
      await m.locator('select').selectOption('accepted')
      await m.locator('textarea').fill('The pull request meets both acceptance criteria; the rejection misread the diff.')
    },
    ready: (page) => modal(page).getByText('recomputed once when the appeal window closes'),
    frame: fitModal(),
  },

  // admins/audit-log
  {
    id: 'admin-gh-global-audit',
    page: 'admins/audit-log',
    url: '/dashboard?tab=grainhack&view=admin&subtab=global-audit',
    ...ADMIN,
    ready: (page) => card(page, 'Audit trail').getByText('Phase transition').first(),
    // The newest six entries; the list goes on below.
    frame: fit((page) => [page.getByRole('button', { name: 'Global Audit' }).locator('xpath=..'), card(page, 'Audit trail')], {
      until: (page) => card(page, 'Audit trail').locator('div.space-y-2 > div').nth(5),
      untilPad: 10,
    }),
  },
  {
    id: 'admin-gh-event-audit',
    page: 'admins/audit-log',
    url: HACKATHONS,
    ...ADMIN,
    steps: async (page) => {
      await openEvent('GrainHack Autumn 2026')(page)
      await reveal(page, card(page, 'Audit trail'))
    },
    ready: (page) => card(page, 'Audit trail').getByText('Phase transition').first(),
    frame: fit((page) => card(page, 'Audit trail')),
  },

  // admins/redemptions
  {
    id: 'admin-redemptions-queue',
    page: 'admins/redemptions',
    url: REVIEWS,
    ...ADMIN,
    steps: toSection('Redemption Requests'),
    ready: (page) => card(page, 'Redemption Requests').getByText(/kofi-ade/).first(),
    frame: fit((page) => card(page, 'Redemption Requests')),
  },
  {
    id: 'admin-redemptions-reject-modal',
    page: 'admins/redemptions',
    url: REVIEWS,
    ...ADMIN,
    steps: async (page) => {
      await toSection('Redemption Requests')(page)
      await card(page, 'Redemption Requests').getByTitle('Reject and refund').first().click()
      await field(modal(page), 'Reason (optional)').fill('Wallet address looks wrong')
    },
    ready: (page) => modal(page).getByRole('heading', { name: 'Reject Redemption' }),
    frame: fitModal(),
  },
]
