// The maintainer pages' screenshots: the Maintainers page (repository
// selector, setup, dashboard, issues and applications, pull requests), the
// organization page, a bounty on a maintainer's repository and GrainHack.
//
// Everything is captured as owen-maintains, who owns tidewater-labs/ledgerline
// and tide-sdk, with tidewater-labs/harbor-bridge still waiting for setup.
// GitHub's own pages (the app install, reviews, agent comments) are not
// captured: the docs describe them in words.

import { issueId } from '../world/index.mjs'
import { maintainerWorld, PENDING_GH_ISSUE_ID } from '../world/extra-maintainers.mjs'

const W = maintainerWorld()
const M = '/dashboard?tab=maintainers&view=maintainer'
const ISSUES = `${M}&subtab=Issues`
const issue = (n) => `${ISSUES}&mIssue=${issueId('p-ledger', n)}`
const DESKTOP = [1440]
const BOT_MESSAGE = 'This issue is open for applications on Grainlify. Open it there, choose **Apply for this issue**, and tell us how you would approach it.\n\nWe will assign one person here on GitHub once we have read the applications.'
const VIEW = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }

// --- Framing helpers ------------------------------------------------------------

/** Clamps a rectangle to the viewport. */
function clamp(r, width) {
  const v = VIEW[width] ?? VIEW[1440]
  const x = Math.max(0, Math.round(r.x))
  const y = Math.max(0, Math.round(r.y))
  return { x, y, width: Math.min(Math.round(r.width), v.width - x), height: Math.min(Math.round(r.height), v.height - y) }
}

/** The union of several locators' boxes, padded. */
const union = (locators, padX = 32, padY = 24) => async (page, width) => {
  const boxes = []
  for (const l of locators(page)) {
    const b = await l.first().boundingBox()
    if (b) boxes.push(b)
  }
  const x1 = Math.min(...boxes.map((b) => b.x)) - padX
  const y1 = Math.min(...boxes.map((b) => b.y)) - padY
  const x2 = Math.max(...boxes.map((b) => b.x + b.width)) + padX
  const y2 = Math.max(...boxes.map((b) => b.y + b.height)) + padY
  return clamp({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 }, width)
}

/** The box of the nearest ancestor of a locator whose class contains `fragment`, padded. */
async function ancestorBox(locator, fragment) {
  return locator.first().evaluate((node, frag) => {
    let n = node
    while (n && !String(n.className ?? '').includes(frag)) n = n.parentElement
    const r = (n ?? node).getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, fragment)
}
const pad = (b, px, py = px) => ({ x: b.x - px, y: b.y - py, width: b.width + px * 2, height: b.height + py * 2 })

/** A modal window (the shared Modal and the maintainers' own modals all carry a big shadow class). */
const modal = (heading, px = 24) => async (page, width) => clamp(pad(await ancestorBox(page.getByText(heading, { exact: true }), 'shadow-[0_'), px), width)

/** The right-hand issue detail panel. */
const detailPanel = (page) => page.getByRole('button', { name: 'Close issue detail' })
async function detailBox(page) {
  return ancestorBox(detailPanel(page), 'rounded-[24px]')
}

/** Waits for the page's text and skeletons to stop changing. */
async function stable(page, maxMs = 15000) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(200)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin').length)
    if (n === last) {
      if (++same >= 4) return
    } else {
      same = 0
      last = n
    }
  }
}

/** Expands the application card for `login` (the chevron beside the name). */
async function expandApplication(page, login) {
  const card = page.locator('div.p-6', { has: page.locator('h4', { hasText: login }) }).first()
  await card.waitFor()
  await card.locator('button').nth(1).click()
}

async function openSelector(page) {
  await page.getByRole('button', { name: 'Select repositories' }).click()
  await page.getByText('tidewater-labs', { exact: true }).first().click()
  await page.getByText('Complete setup').first().waitFor()
}

async function openSetupForm(page) {
  await openSelector(page)
  await page.getByText('Complete setup').first().click()
  await page.getByText('New Project Setup').waitFor()
  await stable(page)
}

/** The application cards in the issue panel, from the first to the last, across the panel's width. */
async function applicationsFrame(page, width) {
  const panel = await detailBox(page)
  const cards = page.locator('div.p-6', { has: page.locator('h4') })
  const first = await cards.first().boundingBox()
  const last = await cards.last().boundingBox()
  const bottom = Math.min(last.y + last.height + 28, panel.y + panel.height)
  return clamp({ x: panel.x, y: first.y - 28, width: panel.width, height: bottom - (first.y - 28) }, width)
}

/** The Select repositories dropdown panel. */
const selectorPanel = (page) => ancestorBox(page.getByRole('heading', { name: 'Select repositories' }), 'w-[380px]')

// --- Shots ----------------------------------------------------------------------

export const SHOTS = [
  {
    id: 'maint-role-switcher',
    page: 'maintainers',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    ready: (page) => page.getByText('Pull Requests Merged'),
    frame: union((page) => [page.getByRole('button', { name: 'CONTRIBUTOR', exact: true }), page.getByRole('button', { name: 'MAINTAINER', exact: true })], 96, 24),
  },
  {
    id: 'maint-quickstart-assign',
    page: 'maintainers',
    url: `${ISSUES}&mIssue=${issueId('p-tide', 57)}`,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await expandApplication(page, 'mira-dev')
      await page.getByRole('button', { name: 'Assign', exact: true }).first().scrollIntoViewIfNeeded()
    },
    ready: (page) => page.getByRole('button', { name: 'Assign', exact: true }).first(),
    frame: applicationsFrame,
  },
  {
    id: 'maint-repo-selector-open',
    page: 'maintainers/add-repositories',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    steps: openSelector,
    ready: (page) => page.getByText('Add a repository'),
    frame: async (page, width) => clamp(pad(await selectorPanel(page), 24), width),
  },
  {
    id: 'maint-install-app-modal',
    page: 'maintainers/add-repositories',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByRole('button', { name: 'Select repositories' }).click()
      await page.getByText('Add a repository').click()
    },
    ready: (page) => page.getByText('Required permissions'),
    frame: modal('Required permissions'),
  },
  {
    id: 'maint-setup-after-install',
    page: 'maintainers/add-repositories',
    url: `${M}&subtab=Dashboard&github_app_installed=true`,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByText('Pull Requests Merged').waitFor()
      await page.clock.runFor(3000)
      await page.getByText('New Project Setup').waitFor()
      await stable(page)
    },
    ready: (page) => page.getByText('tidewater-labs/harbor-bridge').last(),
    frame: modal('New Project Setup'),
  },
  {
    id: 'maint-selector-setup-and-edit',
    page: 'maintainers/project-setup',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    steps: openSelector,
    ready: (page) => page.getByText('Complete setup'),
    frame: async (page, width) => {
      const panel = await selectorPanel(page)
      const add = await page.getByText('Add a repository').boundingBox()
      return clamp({ x: panel.x - 24, y: panel.y - 24, width: panel.width + 48, height: add.y - 20 - (panel.y - 24) }, width)
    },
  },
  {
    id: 'maint-setup-form',
    page: 'maintainers/project-setup',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await openSetupForm(page)
      await page.getByPlaceholder('e.g., Payments, DeFi, Tooling').fill('Bridges, Payments')
      await page.getByPlaceholder('e.g., Frontend, Backend').fill('Backend')
      await page.evaluate(() => document.activeElement?.blur())
    },
    ready: (page) => page.getByText('New Project Setup'),
    frame: modal('New Project Setup'),
  },
  {
    id: 'maint-setup-ecosystem-list',
    page: 'maintainers/project-setup',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await openSetupForm(page)
      await page.getByRole('button', { name: /Solana|Select an ecosystem/ }).first().click()
    },
    ready: (page) => page.getByRole('listbox'),
    frame: modal('New Project Setup'),
  },
  {
    id: 'maint-dashboard-stats',
    page: 'maintainers/maintainer-dashboard',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    ready: (page) => page.getByText('Pull Requests Merged'),
    frame: async (page, width) => clamp(pad(await ancestorBox(page.getByText('Repository Views').first(), 'grid-cols-5'), 20), width),
  },
  {
    id: 'maint-dashboard-activity',
    page: 'maintainers/maintainer-dashboard',
    url: `${M}&subtab=Dashboard`,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByText('View more').waitFor()
      await page.getByText('Last activity').evaluate((n) => n.scrollIntoView({ block: 'start' }))
      await page.evaluate(() => window.scrollBy(0, -100))
    },
    ready: (page) => page.getByText('View more'),
    frame: union((page) => [page.getByText('Last activity'), page.getByText('View more')], 40, 32),
  },
  {
    id: 'maint-issues-filters',
    page: 'maintainers/managing-applications',
    url: ISSUES,
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByText('Document the snapshot format').first().waitFor()
      await filterButton(page).click()
      await page.getByText('All Filters').waitFor()
      await filterOption(page, 'Applicants', 'Yes').click()
      await filterOption(page, 'Assignee', 'No').click()
    },
    ready: (page) => page.getByText('All Filters'),
    frame: () => 'viewport',
  },
  {
    id: 'maint-application-expanded',
    page: 'maintainers/managing-applications',
    url: issue(212),
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await expandApplication(page, 'jun-okafor')
      await page.getByRole('button', { name: 'Reject', exact: true }).first().scrollIntoViewIfNeeded()
    },
    ready: (page) => page.getByRole('button', { name: 'Reject', exact: true }).first(),
    frame: applicationsFrame,
  },
  {
    id: 'maint-application-assigned',
    page: 'maintainers/managing-applications',
    url: issue(219),
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await expandApplication(page, 'mira-dev')
      await page.getByRole('button', { name: 'Unassign' }).first().scrollIntoViewIfNeeded()
    },
    ready: (page) => page.getByRole('button', { name: 'Unassign' }).first(),
    frame: applicationsFrame,
  },
  {
    id: 'maint-bot-message-button',
    page: 'maintainers/bot-message',
    url: issue(212),
    ...W,
    widths: DESKTOP,
    ready: (page) => page.getByRole('button', { name: 'Post Grainlify bot message' }),
    frame: async (page, width) => {
      const panel = await detailBox(page)
      const btn = await page.getByRole('button', { name: 'Post Grainlify bot message' }).boundingBox()
      return clamp({ x: panel.x, y: panel.y, width: panel.width, height: btn.y + btn.height + 56 - panel.y }, width)
    },
  },
  {
    id: 'maint-bot-message-modal',
    page: 'maintainers/bot-message',
    url: issue(212),
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByRole('button', { name: 'Post Grainlify bot message' }).click()
      // The docs tell maintainers to rewrite the standard announcement, so the shot shows an edited one.
      const box = page.locator('textarea').last()
      await box.fill(BOT_MESSAGE)
      await box.evaluate((n) => n.blur())
    },
    ready: (page) => page.getByRole('button', { name: 'Post comment' }),
    frame: async (page, width) => clamp(pad(await ancestorBox(page.getByRole('button', { name: 'Post comment' }), 'max-h-[90vh]'), 24), width),
  },
  {
    id: 'maint-prs-list',
    page: 'maintainers/reviewing-pull-requests',
    url: `${M}&subtab=Pull%20Requests`,
    ...W,
    ready: (page) => page.getByText('Retry channel close with capped backoff'),
    frame: () => 'viewport',
  },
  {
    id: 'maint-prs-state-filter',
    page: 'maintainers/reviewing-pull-requests',
    url: `${M}&subtab=Pull%20Requests`,
    ...W,
    // At phone width the state menu opens leftwards under the rail, so its
    // options are cut off. Desktop only until the menu is anchored on screen.
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByText('Retry channel close with capped backoff').waitFor()
      await page.getByRole('button', { name: /All states/ }).click()
    },
    ready: (page) => page.getByText('Draft', { exact: true }),
    frame: async (page, width) => {
      const search = await page.getByPlaceholder('Search pull request by title or author name...').boundingBox()
      const second = await page.getByText('Typed RpcTimeoutError').boundingBox()
      const panel = await ancestorBox(page.getByText('Typed RpcTimeoutError'), 'rounded-[')
      const x = search.x - 32
      return clamp({ x, y: search.y - 20, width: 1440 - 24 - x, height: panel.y + panel.height + 24 - (search.y - 20) }, width)
    },
  },
  {
    id: 'maint-sync-discussions',
    page: 'maintainers/keeping-projects-in-sync',
    url: issue(212),
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByRole('button', { name: 'Discussions' }).click()
    },
    ready: (page) => page.getByText('Applied for this contribution').first(),
    frame: async (page, width) => clamp(await detailBox(page), width),
  },
  {
    id: 'org-page-header',
    page: 'maintainers/organization-page',
    url: '/dashboard?tab=org&org=tidewater-labs&view=maintainer',
    ...W,
    widths: DESKTOP,
    ready: (page) => page.getByRole('button', { name: /Edit links/ }),
    frame: async (page, width) => {
      const head = await ancestorBox(page.getByRole('heading', { name: 'tidewater-labs' }), 'rounded-[24px]')
      const tile = await ancestorBox(page.getByText('Merged PRs', { exact: true }), 'rounded-[')
      const x = head.x - 16
      return clamp({ x, y: head.y - 24, width: VIEW[width].width - x, height: tile.y + tile.height + 24 - (head.y - 24) }, width)
    },
  },
  {
    id: 'org-edit-links-modal',
    page: 'maintainers/organization-page',
    url: '/dashboard?tab=org&org=tidewater-labs&view=maintainer',
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      await page.getByRole('button', { name: /Edit links/ }).click()
    },
    ready: (page) => page.getByRole('button', { name: 'Save links' }),
    frame: modal('Edit community links'),
  },
  {
    id: 'org-reviews',
    page: 'maintainers/organization-page',
    url: '/dashboard?tab=org&org=tidewater-labs&view=maintainer',
    ...W,
    widths: DESKTOP,
    steps: async (page) => {
      const h = page.getByRole('heading', { name: 'Reviews', exact: true })
      await h.waitFor()
      await page.getByText('Fast, kind reviews').first().waitFor()
      await stable(page)
      await h.evaluate((n) => (n.closest('[class*="rounded-[24px]"]') ?? n).scrollIntoView({ block: 'end' }))
      await page.evaluate(() => window.scrollBy(0, 32))
      await page.waitForTimeout(300)
    },
    ready: (page) => page.getByText('Fast, kind reviews').first(),
    frame: async (page, width) => clamp(pad(await ancestorBox(page.getByRole('heading', { name: 'Reviews', exact: true }), 'rounded-[24px]'), 20), width),
  },
  {
    id: 'bounties-maintainer-row',
    page: 'maintainers/bounties',
    url: '/dashboard?tab=bounties',
    ...W,
    steps: async (page) => {
      const row = page.getByText('Add a `ledgerline inspect` CLI subcommand').first()
      await row.waitFor()
      await row.evaluate((n) => n.scrollIntoView({ block: 'center' }))
    },
    ready: (page) => page.getByText('Assigned to').first(),
    frame: async (page, width) => {
      const title = page.getByText('Add a `ledgerline inspect` CLI subcommand').first()
      const b = await ancestorBox(title, 'rounded-[')
      return clamp(pad(b, width === 390 ? 12 : 24, 16), width)
    },
  },
  {
    id: 'maint-grainhack-panel-pending',
    page: 'maintainers/grainhack',
    url: `${ISSUES}&mIssue=${PENDING_GH_ISSUE_ID}`,
    ...W,
    widths: DESKTOP,
    ready: (page) => page.getByText('Missing before this publishes'),
    frame: async (page, width) => {
      const panel = await detailBox(page)
      const gh = await ancestorBox(page.getByText('GrainHack: GrainHack Autumn 2026'), 'rounded-[16px]')
      return clamp({ x: panel.x, y: panel.y, width: panel.width, height: gh.y + gh.height + 16 - panel.y }, width)
    },
  },
  {
    id: 'maint-grainhack-panel-published',
    page: 'maintainers/grainhack',
    url: issue(224),
    ...W,
    widths: DESKTOP,
    ready: (page) => page.getByText('GrainHack: GrainHack Autumn 2026'),
    frame: async (page, width) => clamp(pad(await ancestorBox(page.getByText('GrainHack: GrainHack Autumn 2026'), 'rounded-[16px]'), 16), width),
  },
  {
    id: 'grainhack-rules-maintainer-pool',
    page: 'maintainers/grainhack',
    url: '/dashboard?tab=my-grainhack&subtab=rules',
    ...W,
    steps: async (page) => {
      const h = page.getByText('Maintainer pool', { exact: true }).first()
      await h.waitFor()
      await h.evaluate((n) => {
        const t = n.closest('section, [class*="rounded-[24px]"], [class*="rounded-[16px]"]') ?? n
        t.scrollIntoView({ block: 'start' })
        window.scrollBy(0, -96)
      })
    },
    ready: (page) => page.getByText('Maintainer pool', { exact: true }).first(),
    frame: async (page, width) => {
      const b = await ancestorBox(page.getByText('Maintainer pool', { exact: true }).first(), 'rounded-[')
      const p = width === 390 ? 10 : 20
      return clamp({ x: b.x - p, y: b.y - p, width: b.width + p * 2, height: b.height + p * 2 }, width)
    },
  },
]

function filterButton(page) {
  // The funnel button to the right of Search in the issue list.
  return page.getByPlaceholder('Search', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"flex-1")][1]/following-sibling::button[1]')
}

function filterOption(page, group, option) {
  return page.locator('div', { has: page.getByRole('heading', { name: group, exact: true }) }).last().getByRole('button', { name: option, exact: true })
}
