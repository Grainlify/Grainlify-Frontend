// Screenshots for the contributor pages about finding and doing work:
// Discover, Browse, Ecosystems, Search, the project page, the issue page,
// applying, after you apply, and the Contributors tab.

import { world, issueId } from '../world/index.mjs'
import { tideIssuesWithThirdApplicant, oneAppliedApplication, sortedContributedProjects, titleOnlyIssueSearch } from '../world/extra-contributors.mjs'

// --- Helpers (also used by shots/start-reference.mjs) -----------------------------

/** Bottom edge of the fixed dashboard header, per width (CSS px). */
const HEADER_BOTTOM = { 1440: 60, 390: 80 }
/** Left edge of the page content: the icon rail is fixed at 8-73px. */
const CONTENT_LEFT = 77

/** Waits until the page's text and loading indicators stop changing. */
export async function waitStable(page, maxMs = 15000) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(200)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin').length)
    if (n === last) {
      if (++same >= 3) return
    } else {
      same = 0
      last = n
    }
  }
}

/** The innermost element matching `selector` that contains `inner` (a locator). */
export const innermost = (page, selector, inner) => page.locator(selector, { has: inner }).last()

/** Union of several boxes. */
function union(boxes) {
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const r = Math.max(...boxes.map((b) => b.x + b.width))
  const btm = Math.max(...boxes.map((b) => b.y + b.height))
  return { x, y, width: r - x, height: btm - y }
}

/**
 * Frames the region spanned by one or more locators: scrolls its top to just
 * under the fixed header, makes the viewport taller if the region does not fit,
 * and returns a clip with `pad` around it (never over the icon rail). The
 * default pad is smaller on a phone, where cards sit 16px apart.
 */
export const region = (locators, { pad: padOpt, padX: padXOpt, rail = false, inHeader = false } = {}) => async (page, width) => {
  const pad = padOpt ?? (width === 390 ? 12 : 20)
  const padX = padXOpt ?? pad
  const list = () => [].concat(typeof locators === 'function' ? locators(page) : locators)
  const measure = async () => union(await Promise.all(list().map(async (l) => l.boundingBox())))
  await list()[0].scrollIntoViewIfNeeded()
  const top = HEADER_BOTTOM[width] + 24 + pad
  let b
  for (let i = 0; i < 5; i++) {
    b = await measure()
    // Scroll whichever box scrolls this content: some pages (the project
    // page) are sized to the viewport and scroll inside a column.
    await list()[0].evaluate((n, d) => {
      for (let p = n.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p)
        if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) {
          const before = p.scrollTop
          p.scrollTop += d
          d -= p.scrollTop - before
          break
        }
      }
      window.scrollBy(0, d)
    }, b.y - top)
    await page.waitForTimeout(150)
    b = await measure()
    const vp = page.viewportSize()
    // The lowest point that shows: the viewport, or the bottom of a column
    // that scrolls on its own and is sized to the viewport.
    const shown = await list()[list().length - 1].evaluate((n) => {
      for (let p = n.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p)
        if (/(auto|scroll|hidden)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p.getBoundingClientRect().bottom
      }
      return Infinity
    })
    const limit = Math.min(vp.height, shown)
    const bottom = Math.ceil(b.y + b.height + pad + 2)
    if (bottom <= limit) break
    await page.setViewportSize({ width: vp.width, height: vp.height + (bottom - limit) })
    await page.waitForTimeout(300)
  }
  b = await measure()
  const vp = page.viewportSize()
  const left = rail ? 0 : CONTENT_LEFT
  const x = Math.max(left, b.x - padX)
  const right = Math.min(vp.width, b.x + b.width + padX)
  // Never start inside the fixed header's shadow.
  const y = Math.max(inHeader ? 0 : HEADER_BOTTOM[width] + 12, b.y - pad)
  return { x, y, width: right - x, height: Math.min(vp.height, b.y + b.height + pad) - y }
}

/** Frames the viewport after scrolling an element to just under the header. */
export const viewportFrom = (locator) => async (page, width) => {
  const l = typeof locator === 'function' ? locator(page) : locator
  await l.scrollIntoViewIfNeeded()
  const b = await l.boundingBox()
  await page.evaluate((dy) => window.scrollBy(0, dy), b.y - HEADER_BOTTOM[width] - 16)
  await page.waitForTimeout(150)
  return 'viewport'
}

const click = async (loc) => {
  await loc.waitFor({ timeout: 15000 })
  await loc.click()
}

// --- Worlds -----------------------------------------------------------------------

const C = world('contributor')
const contributor = { persona: C.persona, api: C.api, agent: C.agent, init: C.init }
const withApi = (extra) => ({ ...contributor, api: { ...C.api, ...extra } })

// DESKTOP_ONLY_ISSUE_PAGE: below the lg breakpoint the issue page keeps its
// 450px issue list and squeezes the issue itself to nothing, so no phone
// screenshot of it can show what the docs describe. Those shots are desktop only.
const ISSUE = (pid, n) => `/dashboard?issue=${issueId(pid, n)}&iproject=${pid}`
// Issues used below.
const OWN_APPLICATION = ISSUE('p-tide', 57) // mira-dev has applied; noor-writes and felix-quay too
const THREE_APPLICANTS = ISSUE('p-ledger', 212) // good first issue, three applications, not mira-dev's
const TO_APPLY = ISSUE('p-quill', 88) // good first issue, one application, mira-dev can apply

/** The right-hand issue panel (the scrolling card beside the issue list). */
const issuePanel = (page) => innermost(page, 'div.overflow-y-auto', page.getByRole('heading', { level: 1 }))
/** An application card on the issue page. */
const applicationCard = (page, login) => page.locator('div.p-6', { has: page.locator('h4', { hasText: login }) }).first()

/** The first comment on the Discussions tab marked AUTHOR. */
const authorComment = (page) => innermost(page, 'div.rounded-\\[16px\\]', page.getByText('AUTHOR', { exact: true }).first())

/** The "Apply for this issue" dialog. */
const applyDialog = (page) => page.locator('div.fixed.inset-0 > div.border-2', { has: page.locator('textarea') })

/** Opens a collapsed application (the chevron beside the applicant). */
async function expandApplication(page, login) {
  const card = applicationCard(page, login)
  await card.waitFor({ timeout: 15000 })
  await card.locator('button').nth(1).click()
}

/**
 * Makes the viewport tall enough that `bottom` (a locator inside the issue
 * panel) is visible without scrolling the panel. The issue page is sized to
 * the viewport, so a taller viewport means a taller panel.
 */
async function growIssuePanelTo(page, bottom, pad = 24) {
  for (let i = 0; i < 3; i++) {
    const panel = await issuePanel(page).boundingBox()
    const b = await bottom.boundingBox()
    const need = b.y + b.height + pad - (panel.y + panel.height)
    if (need <= 0) return
    const vp = page.viewportSize()
    await page.setViewportSize({ width: vp.width, height: Math.ceil(vp.height + need) })
    await page.waitForTimeout(300)
  }
}

// --- Discover -------------------------------------------------------------------------

const recommendedProjects = (page) => innermost(page, 'div.rounded-\\[24px\\]', page.getByRole('heading', { name: /^Recommended Projects/ }))
const recommendedIssues = (page) => innermost(page, 'div.rounded-\\[24px\\]', page.getByRole('heading', { name: 'Recommended Issues' }))

// --- Browse -----------------------------------------------------------------------------

async function openRepositories(page) {
  await click(page.getByRole('button', { name: 'Repositories', exact: true }))
  await page.getByText('orbit-wallet').first().waitFor({ timeout: 15000 })
}
/** A repository card in Browse or an ecosystem's Projects tab. */
const repoCard = (page, name) => page.locator('div.rounded-\\[16px\\].border.p-5', { has: page.getByText(name, { exact: true }) }).first()
/** The open value list of the Browse filter. */
const filterList = (page) => page.locator('div.w-\\[340px\\]').first()
async function tick(page, type, button, value) {
  await click(page.getByRole('button', { name: type, exact: true }))
  await click(page.getByRole('button', { name: button }))
  // Options carry an icon whose SVG <title> repeats the name, so match the button.
  await click(filterList(page).locator('button', { hasText: value }).first())
  await waitStable(page)
}

// --- Ecosystems -------------------------------------------------------------------------

async function openSolana(page) {
  await click(page.getByRole('heading', { name: 'Solana', exact: true }).first())
  await page.getByText('Payments infrastructure').first().waitFor({ timeout: 15000 })
}

// --- Project page -------------------------------------------------------------------------

async function openLedgerline(page) {
  await openRepositories(page)
  await click(page.getByText('ledgerline', { exact: true }).first())
  await page.getByText('Document the snapshot format').first().waitFor({ timeout: 15000 })
  await waitStable(page)
}

// --- Contributors tab -----------------------------------------------------------------------

/** A column of the Contributions board (on a phone, the stacked section), whichever is shown. */
const column = (page, name) =>
  page.locator('div.rounded-\\[16px\\].border', { has: page.locator('h3', { hasText: new RegExp('^' + name) }) }).filter({ visible: true }).last()
const subTabs = (page) => page.locator('div.inline-flex', { has: page.getByRole('button', { name: 'Contributions', exact: true }) }).last()

export const SHOTS = [
  // Discover ------------------------------------------------------------------------------
  {
    id: 'discover-recommended-projects',
    page: 'contributors/discover',
    url: '/dashboard?tab=discover',
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('tidewater-labs').first(),
    frame: region((page) => recommendedProjects(page)),
  },
  {
    id: 'discover-recommended-issues',
    page: 'contributors/discover',
    url: '/dashboard?tab=discover',
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('good first issue').first(),
    frame: region((page) => recommendedIssues(page)),
  },
  {
    id: 'discover-grainhack-card',
    page: 'contributors/discover',
    url: '/dashboard?tab=discover',
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByRole('button', { name: /Let's go/ }),
    frame: region((page) => innermost(page, 'div.rounded-\\[24px\\]', page.getByRole('button', { name: /Let's go/ }))),
  },

  // Browse --------------------------------------------------------------------------------
  {
    id: 'browse-organizations',
    page: 'contributors/browse',
    url: '/dashboard?tab=browse',
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('kestrel-data').first(),
    // On a computer the four cards fill one row: stop below it rather than
    // showing an empty page.
    frame: async (page, width) => {
      if (width === 390) return 'viewport'
      const card = await page.locator('div.rounded-\\[16px\\].border.p-6', { has: page.getByText('tidewater-labs', { exact: true }) }).first().boundingBox()
      return { x: 0, y: 0, width: 1440, height: Math.ceil(card.y + card.height + 40) }
    },
  },
  {
    id: 'browse-language-filter',
    page: 'contributors/browse',
    url: '/dashboard?tab=browse',
    ...contributor,
    steps: async (page) => {
      await openRepositories(page)
      await tick(page, 'Language', 'Select languages', 'TypeScript')
    },
    ready: (page) => page.getByPlaceholder('Search languages...'),
    frame: async (page, width) => {
      if (width === 390) {
        // The 340px list is wider than a phone's content column, and focusing
        // its search box scrolls the page sideways under the rail. Put it back.
        await page.evaluate(() => {
          for (const el of [document.scrollingElement, ...document.querySelectorAll('body *')]) if (el && el.scrollLeft > 0) el.scrollLeft = 0
        })
        await page.waitForTimeout(150)
        return 'viewport'
      }
      const list = await filterList(page).boundingBox()
      return { x: 0, y: 0, width: 1440, height: Math.min(900, Math.ceil(list.y + list.height + 40)) }
    },
  },
  {
    id: 'browse-active-filters',
    page: 'contributors/browse',
    url: '/dashboard?tab=browse',
    ...contributor,
    steps: async (page) => {
      await openRepositories(page)
      await tick(page, 'Language', 'Select languages', 'TypeScript')
      await page.keyboard.press('Escape')
      await page.mouse.click(1, 400)
      await tick(page, 'Tag', 'Select tags', 'good first issue')
      await page.mouse.click(1, 400)
      await waitStable(page)
    },
    ready: (page) => page.getByText('orbit-wallet').first(),
    frame: region((page) => [
      page.locator('span.rounded-full', { hasText: 'TypeScript' }).first(),
      page.getByRole('button', { name: 'Organizations', exact: true }),
      repoCard(page, 'orbit-wallet'),
    ]),
  },

  // Ecosystems ----------------------------------------------------------------------------
  {
    id: 'ecosystems-list',
    page: 'contributors/ecosystems',
    url: '/dashboard?tab=ecosystems',
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('Aptos').first(),
    frame: region((page) => [innermost(page, 'div.bg-gradient-to-br', page.getByRole('heading', { name: 'Explore Ecosystems' })), page.locator('div.grid', { has: page.getByText('Aptos') }).last()]),
  },
  {
    id: 'ecosystems-detail-overview',
    page: 'contributors/ecosystems',
    url: '/dashboard?tab=ecosystems',
    ...contributor,
    steps: async (page) => {
      await page.getByText('Aptos').first().waitFor({ timeout: 15000 })
      await openSolana(page)
      await waitStable(page)
    },
    ready: (page) => page.getByText('Technologies').first(),
    // On a phone the left column comes first; start at the tabs so the counts
    // and About section are what shows.
    frame: async (page, width) => (width === 390 ? viewportFrom(page.getByRole('button', { name: 'Overview', exact: true }).first())(page, width) : 'viewport'),
  },
  {
    id: 'ecosystems-detail-projects',
    page: 'contributors/ecosystems',
    url: '/dashboard?tab=ecosystems',
    ...contributor,
    steps: async (page) => {
      await page.getByText('Aptos').first().waitFor({ timeout: 15000 })
      await openSolana(page)
      await click(page.getByRole('button', { name: 'Projects', exact: true }).first())
      await waitStable(page)
    },
    ready: (page) => page.getByText('tide-sdk').first(),
    frame: async (page, width) => (width === 390 ? viewportFrom(page.getByRole('button', { name: 'Projects', exact: true }).first())(page, width) : 'viewport'),
  },

  // Search ----------------------------------------------------------------------------------
  {
    id: 'search-header-bar',
    page: 'contributors/search',
    url: '/dashboard?tab=discover',
    ...contributor,
    widths: [1440],
    ready: (page) => page.locator('button[data-tour-id="search"]'),
    frame: region((page) => page.locator('button[data-tour-id="search"]'), { pad: 12, inHeader: true }),
  },
  {
    id: 'search-results',
    page: 'contributors/search',
    url: '/dashboard?tab=search',
    ...withApi(titleOnlyIssueSearch(C.api)),
    steps: async (page) => {
      const input = page.getByPlaceholder('Search issues, projects, contributors...')
      await input.waitFor({ timeout: 15000 })
      await input.click()
      await input.fill('code')
      await page.getByText('wren-codes').first().waitFor({ timeout: 15000 })
      await waitStable(page)
    },
    ready: (page) => page.getByText(/Search Results \(\d+\)/),
    frame: region((page) => [
      page.locator('div.h-\\[64px\\]', { has: page.getByPlaceholder('Search issues, projects, contributors...') }),
      page.locator('div.mb-12', { has: page.getByText(/Search Results/) }),
    ]),
  },
  {
    id: 'search-empty',
    page: 'contributors/search',
    url: '/dashboard?tab=search',
    ...contributor,
    ready: (page) => page.getByText('Search suggestions'),
    frame: () => 'viewport',
  },

  // Project page ------------------------------------------------------------------------------
  {
    id: 'project-header',
    // Below the lg breakpoint the project page shows only its side column;
    // the header and Issues sit off-screen to the right.
    widths: [1440],
    page: 'contributors/project-page',
    url: '/dashboard?tab=browse',
    ...contributor,
    steps: openLedgerline,
    ready: (page) => page.getByRole('button', { name: /Back to Browse/ }),
    frame: region((page) => [
      page.getByRole('button', { name: /Back to Browse/ }),
      innermost(page, 'div.rounded-\\[24px\\], div.rounded-\\[20px\\]', page.getByRole('button', { name: /Copy link/ })),
    ]),
  },
  {
    id: 'project-issues',
    // Below the lg breakpoint the project page shows only its side column;
    // the header and Issues sit off-screen to the right.
    widths: [1440],
    page: 'contributors/project-page',
    url: '/dashboard?tab=browse',
    ...contributor,
    steps: openLedgerline,
    ready: (page) => page.getByRole('button', { name: /^All issues/ }),
    frame: region((page) => innermost(page, 'div.rounded-\\[24px\\], div.rounded-\\[20px\\], div.rounded-\\[16px\\]', page.getByRole('button', { name: /^All issues/ }))),
  },
  {
    id: 'project-sidebar',
    page: 'contributors/project-page',
    url: '/dashboard?tab=browse',
    ...contributor,
    steps: openLedgerline,
    ready: (page) => page.getByText(/\d+ contributors/).first(),
    frame: region((page) => [
      innermost(page, 'div.rounded-\\[24px\\]', page.getByRole('heading', { name: 'Community', exact: true })),
      innermost(page, 'div.rounded-\\[24px\\]', page.getByRole('heading', { name: 'Contributors', exact: true })),
    ]),
  },

  // Issue page ---------------------------------------------------------------------------------
  {
    id: 'issue-page-overview',
    page: 'contributors/issue-page',
    url: OWN_APPLICATION,
    ...withApi(tideIssuesWithThirdApplicant),
    widths: [1440],
    steps: (page) => waitStable(page),
    ready: (page) => page.getByRole('heading', { level: 1, name: 'Typed errors for RPC timeouts' }),
    frame: () => 'viewport',
  },
  {
    id: 'issue-page-applications',
    widths: [1440], // the issue page has no phone layout (see DESKTOP_ONLY_ISSUE_PAGE)
    page: 'contributors/issue-page',
    url: THREE_APPLICANTS,
    ...contributor,
    steps: async (page) => {
      await applicationCard(page, 'tomas-rivet').waitFor({ timeout: 15000 })
      await growIssuePanelTo(page, applicationCard(page, 'tomas-rivet'))
    },
    ready: (page) => page.getByRole('button', { name: 'Apply for this issue' }),
    frame: region((page) => issuePanel(page), { pad: 16 }),
  },
  {
    id: 'issue-page-discussions',
    widths: [1440], // the issue page has no phone layout (see DESKTOP_ONLY_ISSUE_PAGE)
    page: 'contributors/issue-page',
    url: THREE_APPLICANTS,
    ...contributor,
    steps: async (page) => {
      await click(page.getByRole('button', { name: 'Discussions' }))
      await page.getByText('AUTHOR', { exact: true }).first().waitFor({ timeout: 15000 })
      // Show the thread down to the issue author's comment (the third), past
      // the first application.
      await growIssuePanelTo(page, authorComment(page))
    },
    ready: (page) => page.getByText('Applied for this contribution').first(),
    // The panel from the issue title down to the author's comment.
    frame: async (page, width) => {
      const clip = await region((page) => issuePanel(page), { pad: 16 })(page, width)
      const a = await authorComment(page).boundingBox()
      return { ...clip, height: Math.min(clip.height, Math.ceil(a.y + a.height + 24 - clip.y)) }
    },
  },

  // Applying ------------------------------------------------------------------------------------
  {
    id: 'apply-button',
    widths: [1440], // the issue page has no phone layout (see DESKTOP_ONLY_ISSUE_PAGE)
    page: 'contributors/applying-to-issues',
    url: TO_APPLY,
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByRole('button', { name: 'Apply for this issue' }),
    frame: region((page) => [page.getByRole('heading', { level: 1, name: 'Support tabs in code examples' }), innermost(page, 'div.rounded-\\[16px\\]', page.getByRole('button', { name: 'Apply for this issue' }))]),
  },
  {
    id: 'apply-dialog',
    widths: [1440], // the issue page has no phone layout (see DESKTOP_ONLY_ISSUE_PAGE)
    page: 'contributors/applying-to-issues',
    url: TO_APPLY,
    ...contributor,
    steps: async (page) => {
      await click(page.getByRole('button', { name: 'Apply for this issue' }))
      const box = applyDialog(page).locator('textarea')
      await box.waitFor({ timeout: 15000 })
      await box.fill("I'd start by reproducing this with a failing test, then fix the parser. I fixed a similar bug in my own CLI last month.")
    },
    ready: (page) => page.getByRole('button', { name: 'Submit application' }),
    frame: region((page) => applyDialog(page), { pad: 16 }),
  },
  {
    id: 'apply-submitted',
    widths: [1440], // the issue page has no phone layout (see DESKTOP_ONLY_ISSUE_PAGE)
    page: 'contributors/applying-to-issues',
    url: OWN_APPLICATION,
    ...withApi(tideIssuesWithThirdApplicant),
    steps: async (page) => {
      await expandApplication(page, 'mira-dev')
      await page.getByRole('button', { name: 'Withdraw' }).waitFor({ timeout: 15000 })
      await growIssuePanelTo(page, applicationCard(page, 'felix-quay'))
    },
    ready: (page) => page.getByRole('button', { name: 'Withdraw' }),
    frame: region((page) => [applicationCard(page, 'mira-dev'), applicationCard(page, 'noor-writes'), applicationCard(page, 'felix-quay')]),
  },

  // After you apply / Contributors tab ---------------------------------------------------------
  {
    id: 'after-applied-column',
    page: 'contributors/after-you-apply',
    url: '/dashboard?tab=contributors',
    ...withApi(oneAppliedApplication),
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('Typed errors for RPC timeouts').filter({ visible: true }).first(),
    frame: region((page) => column(page, 'Applied')),
  },
  {
    id: 'track-contributions-board',
    page: 'contributors/track-contributions',
    url: '/dashboard?tab=contributors',
    ...contributor,
    steps: (page) => waitStable(page),
    ready: (page) => page.getByText('Typed errors for RPC timeouts').filter({ visible: true }).first(),
    frame: region((page) => [subTabs(page), column(page, 'Applied'), column(page, 'Complete')]),
  },
  {
    id: 'track-projects-tab',
    page: 'contributors/track-contributions',
    url: '/dashboard?tab=contributors',
    ...withApi(sortedContributedProjects(C.api)),
    steps: async (page) => {
      await click(page.getByRole('button', { name: 'Projects', exact: true }))
      await page.getByText(/anchorage/).filter({ visible: true }).first().waitFor({ timeout: 15000 })
      await waitStable(page)
    },
    ready: (page) => page.getByText(/anchorage/).filter({ visible: true }).first(),
    frame: region((page) => [subTabs(page), page.locator('div.md\\:block:has(table), div.md\\:hidden.space-y-3').filter({ visible: true }).first()]),
  },
]
