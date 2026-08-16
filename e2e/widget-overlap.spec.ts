import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The support widget is `position: fixed` at the bottom-right of every page
 * (App.tsx mounts one instance for the whole app). Anything the page draws
 * underneath it is covered.
 *
 * This has now been reported twice - first a Save button, then the payout
 * settings tab. Both times the fix was applied to the page in the report,
 * which is how the second one happened: the bug is not a property of a page,
 * it is a property of every page that puts a control in that corner.
 *
 * WHAT IS ASSERTED, and why it is this and not something stricter:
 *
 * A fixed overlay covers whatever scrolls under it, so "never intersects at
 * any scroll offset" is unsatisfiable and would fail on every page with a long
 * list. What makes a control genuinely unreachable is being under the widget
 * when the user cannot scroll any further - at the very bottom of the page,
 * or when it is itself fixed or sticky. That is the condition checked here.
 *
 * Severity is reported alongside: an element whose CENTRE is occluded cannot
 * be clicked at all, which is worse than one merely clipped at a corner.
 */

const WIDGET = '[aria-label="Get help or report a problem"]'

// Every tab Dashboard renders, and every settings subtab. Enumerated rather
// than sampled: sampling is what produced a fix for one page.
const DASHBOARD_TABS = [
  'discover', 'browse', 'leaderboard', 'contributors', 'maintainers',
  'ecosystems', 'osw', 'blog', 'search', 'profile', 'data', 'org',
  'grainhack', 'my-grainhack', 'settings', 'admin',
]
const SETTINGS_SUBTABS = ['profile', 'notifications', 'referrals', 'rewards', 'payout', 'billing', 'terms']

// minInteractive is the number of interactive elements below which the page
// has plainly not rendered. Without it this suite passes on a blank page: the
// first version of it reported 26 green while 25 of the pages had white-
// screened on a mock that answered the wrong shape, and a page with nothing on
// it cannot collide with anything.
const PAGES: { name: string; url: string; minInteractive: number }[] = [
  { name: 'landing', url: '/', minInteractive: 20 },
  { name: 'signin', url: '/signin', minInteractive: 2 },
  { name: 'signup', url: '/signup', minInteractive: 4 },
  ...DASHBOARD_TABS.map((t) => ({ name: `tab=${t}`, url: `/dashboard?tab=${t}`, minInteractive: 10 })),
  ...SETTINGS_SUBTABS.map((s) => ({
    name: `settings/${s}`, url: `/dashboard?tab=settings&subtab=${s}`, minInteractive: 10,
  })),
]

interface Collision {
  label: string
  tag: string
  rect: { x: number; y: number; w: number; h: number }
  coveredFraction: number
  centreOccluded: boolean
}

interface Scan {
  interactiveCount: number
  widget: { x: number; y: number; w: number; h: number } | null
  collisions: Collision[]
}

async function scanForCollisions(page: Page): Promise<Scan> {
  return page.evaluate((widgetSelector) => {
    const widgetEl = document.querySelector(widgetSelector) as HTMLElement | null
    if (!widgetEl) return { interactiveCount: 0, widget: null, collisions: [] }
    const w = widgetEl.getBoundingClientRect()

    const SELECTOR = [
      'button', 'a[href]', 'input:not([type=hidden])', 'select', 'textarea',
      '[role=button]', '[role=link]', '[role=tab]', '[role=switch]', '[role=checkbox]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const isVisible = (el: Element) => {
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false
      if (s.pointerEvents === 'none') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }

    const inWidget = (el: Element | null) => {
      for (let n: Element | null = el; n; n = n.parentElement) if (n === widgetEl) return true
      return false
    }

    const all = Array.from(document.querySelectorAll(SELECTOR)).filter(isVisible).filter((el) => !inWidget(el))
    const collisions = []

    for (const el of all) {
      const r = el.getBoundingClientRect()
      // Only what is on screen: an element scrolled out of view is not
      // covered by anything.
      if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue

      const overlapW = Math.min(r.right, w.right) - Math.max(r.left, w.left)
      const overlapH = Math.min(r.bottom, w.bottom) - Math.max(r.top, w.top)
      if (overlapW <= 0 || overlapH <= 0) continue

      const area = r.width * r.height
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const atCentre = document.elementFromPoint(cx, cy)

      collisions.push({
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60) || '(no label)',
        tag: el.tagName.toLowerCase(),
        rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        coveredFraction: area > 0 ? (overlapW * overlapH) / area : 0,
        centreOccluded: inWidget(atCentre),
      })
    }

    return {
      interactiveCount: all.length,
      widget: { x: Math.round(w.left), y: Math.round(w.top), w: Math.round(w.width), h: Math.round(w.height) },
      collisions,
    }
  }, WIDGET)
}

async function settle(page: Page) {
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  // Lists that lazy-render on scroll need a second settle.
  await page.waitForTimeout(600)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
}

test.describe('support widget does not cover interactive elements', () => {
  for (const p of PAGES) {
    test(`${p.name}`, async ({ page, setupMockAuth, setupMockBrowse, setupMockOrgProfile }) => {
      await setupMockAuth()
      await setupMockBrowse()
      await setupMockOrgProfile()
      await page.addInitScript(() => {
        // The first-visit tour traps focus and covers the page; every test
        // here would otherwise be measuring the tour.
        window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
        // Without a token the API client never calls /me, the dashboard
        // renders a redirect instead of a page, and every assertion below
        // becomes vacuous - the first version of this test "passed" on 25
        // pages that had not rendered.
        window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
      })

      await page.goto(p.url)
      await settle(page)

      const scan = await scanForCollisions(page)
      expect(scan.widget, 'the support widget was not on the page at all').not.toBeNull()

      // A page that rendered nothing cannot collide with anything, and would
      // pass this test while proving nothing.
      expect(
        scan.interactiveCount,
        `${p.url} rendered only ${scan.interactiveCount} interactive elements - it has not loaded, ` +
          `so the collision check below would pass without testing anything`,
      ).toBeGreaterThanOrEqual(p.minInteractive)

      const blocked = scan.collisions
      if (blocked.length > 0) {
        const lines = blocked
          .sort((a, b) => b.coveredFraction - a.coveredFraction)
          .map((c) =>
            `  ${c.centreOccluded ? 'UNCLICKABLE' : 'clipped    '} <${c.tag}> "${c.label}" ` +
            `at ${c.rect.x},${c.rect.y} ${c.rect.w}x${c.rect.h} — ${(c.coveredFraction * 100).toFixed(0)}% covered`,
          )
        throw new Error(
          `${blocked.length} interactive element(s) under the support widget on ${p.url}\n` +
          `widget occupies ${scan.widget!.w}x${scan.widget!.h} at ${scan.widget!.x},${scan.widget!.y}\n` +
          lines.join('\n'),
        )
      }
    })
  }
})
