// Screenshots for the contributor pages on Bounties (bounties, apply-for-a-bounty,
// bounty-payment, bounty-ledger, bounty-rules) and GrainHack (grainhack,
// grainhack-eligibility, grainhack-apply, grainhack-draw, grainhack-assignment,
// grainhack-results). Data comes from the fixture world, plus
// world/extra-bounties.mjs for the states the world does not hold.

import { world, BOUNTIES, agent, apiFor, initFor } from '../world/index.mjs'
import {
  APPLY_BOUNTY_ID, bountyApplyApi, bountyRefusedApi, eventsWithSettledApi, grainhackApplyApi,
} from '../world/extra-bounties.mjs'

/** world('contributor', opts) with an extra API map merged over it. */
const W = (opts = {}, extra = {}) => {
  const w = world('contributor', opts)
  return { ...w, api: { ...w.api, ...extra } }
}

const bountyId = (repo, n) => BOUNTIES.find((b) => b.repo === repo && b.issueNumber === n).id
const row = (id) => (page) => page.locator(`[data-testid="bounty-${id}"]`)
const OPEN = APPLY_BOUNTY_ID
/** Rows sit 8px apart, so a wider margin would show slivers of their neighbours. */
const TIGHT = { padX: 6, padY: 6 }
const NEWCOMER = bountyId('saltmarsh/orbit-wallet', 41)
const IN_REVIEW = bountyId('northfield-oss/anchorage', 132)
const PAYABLE = bountyId('tidewater-labs/tide-sdk', 61)
const PAID = bountyId('northfield-oss/anchorage', 109)
const TEST = bountyId('tidewater-labs/agent-sandbox', 1)

/** Scrolls an element to just under the floating header. */
async function scrollUnderHeader(locator, offset) {
  await locator.evaluate((node, off) => {
    // 'instant': the app sets scroll-behavior: smooth, and a measurement
    // taken mid-animation crops the wrong place.
    node.scrollIntoView({ block: 'start', behavior: 'instant' })
    window.scrollBy({ top: node.getBoundingClientRect().top - off, behavior: 'instant' })
  }, offset)
}

/**
 * The rectangle from the top of `top` to the bottom of `bottom` (default: the
 * same element), with padding. When it is taller than the screen, the window
 * is made taller for this capture, so nothing is cut off.
 */
const region = (top, bottom = top, { padX = 8, padY = 12, padBottom = padY, offset } = {}) => async (page, width) => {
  const a = top(page).first()
  const b = bottom(page).first()
  const off = offset ?? 112
  const measure = async () => {
    await scrollUnderHeader(a, off)
    await page.waitForTimeout(250)
    const ra = await a.boundingBox()
    const rb = await b.boundingBox()
    return { ra, rb }
  }
  let { ra, rb } = await measure()
  for (let i = 0; i < 4; i++) {
    const vp = page.viewportSize()
    const overflow = rb.y + rb.height + padBottom - vp.height
    if (overflow <= 0) break
    await page.setViewportSize({ width: vp.width, height: Math.ceil(Math.max(vp.height + overflow, rb.y + rb.height - ra.y + off + padBottom) + 8) })
    ;({ ra, rb } = await measure())
  }
  const vw = page.viewportSize().width
  const x0 = Math.max(0, Math.min(ra.x, rb.x) - padX)
  const x1 = Math.min(vw, Math.max(ra.x + ra.width, rb.x + rb.width) + padX)
  const y0 = Math.max(0, ra.y - padY)
  return { x: x0, y: y0, width: x1 - x0, height: rb.y + rb.height + padBottom - y0 }
}

/** A dialog (the app's Modal) with some of the dimmed page around it. */
const dialog = (title) => (page) => page.locator('div.fixed.inset-0 > div').filter({ hasText: title })
const aroundDialog = (title) => async (page, width) => {
  const b = await dialog(title)(page).first().boundingBox()
  const vp = page.viewportSize()
  const pad = width === 390 ? 12 : 48
  const x = Math.max(0, b.x - pad)
  const y = Math.max(0, b.y - pad)
  return { x, y, width: Math.min(vp.width, b.x + b.width + pad) - x, height: Math.min(vp.height, b.y + b.height + pad) - y }
}

// --- Locators ---------------------------------------------------------------------

const statusBanner = (page) => page.locator('div[role="status"]').filter({ hasText: 'Bounties pay real USDC' })
const paidCard = (page) => page.locator('div.rounded-\\[24px\\]').filter({ has: page.locator('p', { hasText: /^Paid$/ }) }).last()
const receiptChain = (page) => page.locator('section[aria-labelledby="ledger-chain"]')
const filters = (page) => page.locator('section[aria-label="Filters"]')
const eventsTable = (page) => page.locator('[aria-label="Ledger events"]')
const eventRow = (n) => (page) => page.locator('[aria-label="Ledger events"] > div.divide-y > div').nth(n - 1)
const ghTabs = (page) => page.locator('div.backdrop-blur-\\[40px\\]').filter({ has: page.getByRole('button', { name: 'My assignments' }) }).last()
const ghContent = (page) => page.locator('div.backdrop-blur-\\[40px\\].p-6').first()
const rulesCard = (heading) => (page) => page.locator('div.rounded-\\[24px\\]').filter({ has: page.locator('h2', { hasText: new RegExp(`^${heading}$`) }) })
const rulesTop = (page) => page.locator('div.rounded-\\[24px\\]').filter({ has: page.locator('h1', { hasText: 'GrainHack rules' }) })
const ghPanel = (page) => page.locator('div.mb-4.rounded-\\[16px\\]').filter({ hasText: 'Part of GrainHack Autumn 2026' })
const issuesCard = (page) => page.locator('div.rounded-\\[24px\\]').filter({ has: page.getByRole('button', { name: 'View issue' }) }).last()
const resultCard = (text) => (page) => (text ? page.locator('div.rounded-2xl.p-5').filter({ hasText: text }) : page.locator('div.rounded-2xl.p-5'))

// --- Steps ------------------------------------------------------------------------

const openEvent = (name) => async (page) => {
  await page.getByText(name, { exact: true }).first().click()
}
const openApplyIssue = async (page) => {
  await openEvent('GrainHack Autumn 2026')(page)
  const issue = page.locator('div.rounded-\\[16px\\]').filter({ hasText: 'Benchmark snapshot writes under load' }).last()
  await issue.getByRole('button', { name: 'View issue' }).click()
  await ghPanel(page).waitFor({ timeout: 20000 })
}

const BOUNTIES_URL = '/dashboard?tab=bounties'
const LEDGER_URL = '/dashboard?tab=bounties&subtab=ledger'
const loadedRows = (page) => page.getByText('You are in the draw for this bounty', { exact: false }).first()

export const SHOTS = [
  // --- contributors/bounties ------------------------------------------------------
  {
    id: 'bounties-overview',
    page: 'contributors/bounties',
    url: BOUNTIES_URL,
    ...W(),
    ready: loadedRows,
    // On a phone the header and wallet card fill the first screen, so the
    // phone shot starts at the status banner and runs to the first bounty.
    frame: (page, width) => (width === 390 ? region(statusBanner, row(OPEN))(page, width) : 'viewport'),
  },
  {
    id: 'bounties-status-banner',
    page: 'contributors/bounties',
    url: BOUNTIES_URL,
    ...W(),
    ready: statusBanner,
    frame: region(statusBanner),
  },
  {
    id: 'bounties-test-row',
    page: 'contributors/bounties',
    url: BOUNTIES_URL,
    ...W(),
    ready: (page) => row(TEST)(page).getByText('Relaxed for this test'),
    frame: region(row(TEST), undefined, TIGHT),
  },

  // --- contributors/apply-for-a-bounty ------------------------------------------------
  {
    id: 'bounties-apply-open',
    page: 'contributors/apply-for-a-bounty',
    url: BOUNTIES_URL,
    ...W({}, bountyApplyApi()),
    ready: (page) => row(OPEN)(page).getByRole('button', { name: 'Apply for this bounty' }),
    frame: region(row(OPEN), undefined, TIGHT),
  },
  {
    id: 'bounties-apply-in-draw',
    page: 'contributors/apply-for-a-bounty',
    url: BOUNTIES_URL,
    ...W({}, bountyApplyApi()),
    steps: async (page) => {
      const r = row(OPEN)(page)
      await r.getByRole('button', { name: 'Apply for this bounty' }).waitFor({ timeout: 20000 })
      await r.getByLabel('Anything you want to add (optional)').fill('I fixed a similar parser bug in this repository last month.')
      await r.getByRole('button', { name: 'Apply for this bounty' }).click()
    },
    ready: (page) => row(OPEN)(page).getByText('You are in the draw for this bounty'),
    frame: region(row(OPEN), undefined, TIGHT),
  },
  {
    id: 'bounties-apply-newcomer',
    page: 'contributors/apply-for-a-bounty',
    url: BOUNTIES_URL,
    ...W(),
    ready: (page) => row(NEWCOMER)(page).getByRole('button', { name: 'Apply for this bounty' }),
    frame: region(row(NEWCOMER), undefined, TIGHT),
  },

  // --- contributors/bounty-payment ------------------------------------------------------
  {
    id: 'bounties-pay-in-review',
    page: 'contributors/bounty-payment',
    url: BOUNTIES_URL,
    ...W(),
    ready: (page) => row(IN_REVIEW)(page).getByText('PR in review'),
    frame: region(row(IN_REVIEW), undefined, TIGHT),
  },
  {
    id: 'bounties-pay-awaiting',
    page: 'contributors/bounty-payment',
    url: BOUNTIES_URL,
    ...W(),
    ready: (page) => row(PAYABLE)(page).getByText('Awaiting approval'),
    frame: region(row(PAYABLE), undefined, TIGHT),
  },
  {
    id: 'bounties-pay-paid',
    page: 'contributors/bounty-payment',
    url: BOUNTIES_URL,
    ...W(),
    ready: (page) => row(PAID)(page).getByText('Paid to priya-kern.'),
    // One paid row. mira-dev's own paid bounty (perch #7) still shows her
    // draw result, "You won the draw... Open a pull request", instead of
    // "Paid to", so it is left out of the picture.
    frame: region(row(PAID), undefined, TIGHT),
  },

  // --- contributors/bounty-ledger ---------------------------------------------------------
  {
    id: 'ledger-overview',
    page: 'contributors/bounty-ledger',
    url: LEDGER_URL,
    ...W(),
    ready: (page) => page.locator('span:visible').filter({ hasText: /^mainnet · 3 devnet test$/ }).first(),
    frame: () => 'viewport',
  },
  {
    id: 'ledger-receipt-chain',
    page: 'contributors/bounty-ledger',
    url: LEDGER_URL,
    ...W(),
    ready: (page) => receiptChain(page).getByText('Payout', { exact: true }),
    frame: region(receiptChain),
  },
  {
    id: 'ledger-filtered',
    page: 'contributors/bounty-ledger',
    url: LEDGER_URL,
    ...W(),
    steps: async (page) => {
      await filters(page).getByRole('button', { name: '30 days' }).click()
      await filters(page).getByRole('button', { name: 'Payouts' }).click()
    },
    ready: (page) => filters(page).locator('button[aria-pressed="true"]', { hasText: 'Payouts' }),
    frame: region(filters, eventsTable),
  },
  {
    id: 'ledger-events',
    page: 'contributors/bounty-ledger',
    url: LEDGER_URL,
    ...W(),
    // The Proof column only exists at desktop width.
    widths: [1440],
    ready: (page) => eventsTable(page).getByText('Payout · test').first(),
    // From the header row down to the first payout, which is the point where
    // every kind of event has appeared.
    frame: region(eventsTable, eventRow(17), { padBottom: 0 }),
  },

  // --- contributors/bounty-rules ------------------------------------------------------------
  {
    id: 'bounties-rules-page',
    page: 'contributors/bounty-rules',
    url: '/bounties/rules',
    api: apiFor('contributor'),
    agent,
    init: initFor('contributor'),
    ready: (page) => page.getByText('Prior wins are capped at', { exact: false }).first(),
    frame: () => 'viewport',
  },
  {
    id: 'bounties-rules-refused',
    page: 'contributors/bounty-rules',
    url: BOUNTIES_URL,
    ...W({ wallet: 'unlinked' }, bountyRefusedApi()),
    ready: (page) => row(OPEN)(page).getByRole('link', { name: 'Link a wallet' }),
    frame: region(row(OPEN), undefined, TIGHT),
  },

  // --- contributors/grainhack ----------------------------------------------------------------
  {
    id: 'grainhack-events',
    page: 'contributors/grainhack',
    url: '/dashboard?tab=osw',
    ...W({}, eventsWithSettledApi()),
    ready: (page) => page.getByText('GrainHack Spring 2026'),
    frame: () => 'viewport',
  },
  {
    id: 'grainhack-event-live',
    page: 'contributors/grainhack',
    url: '/dashboard?tab=osw',
    ...W(),
    steps: openEvent('GrainHack Autumn 2026'),
    ready: (page) => page.getByText('Benchmark snapshot writes under load'),
    frame: () => 'viewport',
  },
  {
    id: 'grainhack-event-prep',
    page: 'contributors/grainhack',
    url: '/dashboard?tab=osw',
    ...W(),
    steps: openEvent('GrainHack Ledger Week'),
    ready: (page) => page.getByText('Issues are being added'),
    frame: () => 'viewport',
  },

  // --- contributors/grainhack-eligibility ------------------------------------------------------
  {
    id: 'grainhack-myapps-refused',
    page: 'contributors/grainhack-eligibility',
    url: '/dashboard?tab=my-grainhack&subtab=applications',
    ...W(),
    ready: (page) => page.getByText("You're holding 2 of 2 assignment slots", { exact: false }),
    frame: region(ghTabs, ghContent),
  },
  {
    id: 'grainhack-rules-gates',
    page: 'contributors/grainhack-eligibility',
    url: '/dashboard?tab=my-grainhack&subtab=rules',
    ...W(),
    ready: rulesCard('Hard gates'),
    frame: region(rulesCard('Hard gates')),
  },

  // --- contributors/grainhack-apply ----------------------------------------------------------------
  {
    id: 'grainhack-apply-panel',
    page: 'contributors/grainhack-apply',
    url: '/dashboard?tab=osw',
    ...W({}, grainhackApplyApi()),
    steps: openApplyIssue,
    ready: (page) => ghPanel(page).getByRole('button', { name: 'Apply for this issue' }),
    frame: region(ghPanel, undefined, TIGHT),
  },
  {
    id: 'grainhack-apply-done',
    page: 'contributors/grainhack-apply',
    url: '/dashboard?tab=osw',
    ...W({}, grainhackApplyApi()),
    steps: async (page) => {
      await openApplyIssue(page)
      await ghPanel(page).getByRole('button', { name: 'Apply for this issue' }).click()
    },
    ready: (page) => ghPanel(page).getByText("You've applied. The draw runs when the window closes."),
    frame: region(ghPanel, undefined, TIGHT),
  },
  {
    id: 'grainhack-myapps',
    page: 'contributors/grainhack-apply',
    url: '/dashboard?tab=my-grainhack&subtab=applications',
    ...W(),
    ready: (page) => page.getByText('Waiting for the draw').first(),
    frame: region(ghTabs, ghContent),
  },

  // --- contributors/grainhack-draw ------------------------------------------------------------------
  {
    id: 'grainhack-rules-weights',
    page: 'contributors/grainhack-draw',
    url: '/dashboard?tab=my-grainhack&subtab=rules',
    ...W(),
    ready: rulesCard('Draw weights'),
    frame: region(rulesTop, rulesCard('Draw weights')),
  },
  {
    id: 'grainhack-event-newcomers',
    page: 'contributors/grainhack-draw',
    url: '/dashboard?tab=osw',
    ...W(),
    steps: openEvent('GrainHack Autumn 2026'),
    ready: (page) => page.getByText('Newcomers only').first(),
    frame: region(issuesCard),
  },

  // --- contributors/grainhack-assignment --------------------------------------------------------------
  {
    id: 'grainhack-assignments',
    page: 'contributors/grainhack-assignment',
    url: '/dashboard?tab=my-grainhack&subtab=assignments',
    ...W(),
    ready: (page) => page.getByRole('button', { name: 'Give this back' }).first(),
    frame: region(ghTabs, ghContent),
  },
  {
    id: 'grainhack-release-dialog',
    page: 'contributors/grainhack-assignment',
    url: '/dashboard?tab=my-grainhack&subtab=assignments',
    ...W(),
    steps: async (page) => {
      await page.getByRole('button', { name: 'Give this back' }).first().click()
    },
    ready: dialog('Give this assignment back?'),
    frame: aroundDialog('Give this assignment back?'),
  },

  // --- contributors/grainhack-results -------------------------------------------------------------------
  {
    id: 'grainhack-results',
    page: 'contributors/grainhack-results',
    url: '/dashboard?tab=my-grainhack&subtab=results',
    ...W(),
    ready: (page) => page.getByRole('button', { name: 'Appeal this result' }),
    frame: region(resultCard(), undefined, { padX: 8, padY: 10 }),
  },
  {
    id: 'grainhack-appeal-dialog',
    page: 'contributors/grainhack-results',
    url: '/dashboard?tab=my-grainhack&subtab=results',
    ...W(),
    steps: async (page) => {
      await page.getByRole('button', { name: 'Appeal this result' }).click()
      await dialog('Tell us what you think')(page).locator('textarea').fill('The review says no tests were added, but src/parser/parse_test.go covers the new branch.')
    },
    ready: (page) => dialog('Tell us what you think')(page).getByRole('button', { name: 'Submit appeal' }),
    frame: aroundDialog('Tell us what you think'),
  },
  {
    id: 'grainhack-appeal-pending',
    page: 'contributors/grainhack-results',
    url: '/dashboard?tab=my-grainhack&subtab=results',
    ...W(),
    ready: (page) => page.getByText('Appeal under review'),
    frame: region(resultCard('Appeal under review'), undefined, { padX: 8, padY: 10 }),
  },
]
