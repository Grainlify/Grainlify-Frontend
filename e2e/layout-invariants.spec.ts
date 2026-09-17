import { test, expect } from './fixtures'

/**
 * Layout properties that only a real browser can check.
 *
 * Every one of these was reported from production while the unit suite was
 * green, because jsdom has no layout: it cannot tell you that two cards render
 * at different heights, that a page cannot be scrolled, or that a badge is a
 * rectangle. These need boxes, so they live here.
 */

const auth = async (page: any) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })
}

// A project carrying three labels made its whole grid row taller than the row
// above it. The card is what must be fixed - any container showing one
// inherits it - so the assertion is about cards, not the grid.
test('every recommended project card is the same height, whatever it carries', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await auth(page)

  // Deliberately lopsided: no labels, one, and four.
  await page.route((url) => url.pathname === '/projects/recommended', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        // Eight DISTINCT owners (the grid dedupes to one card per owner), and
        // the heavy card carries an ecosystem name PLUS two tags - three chips.
        // DiscoverPage already slices tags to two, so a fourth tag changes
        // nothing; the third chip is the ecosystem. Without it, reverting the
        // fix produced identical heights and this test could not fail.
        //
        // Measured pre-fix: 233px against 273px, at every width from 640 to
        // 1600 except 900.
        // Eight DISTINCT owners. The grid dedupes to one card per owner, so
        // eight repos under one org rendered a single card and the count
        // assertion below caught it.
        // Eight, so the grid produces two rows at the widest breakpoint.
        // Three cards was a single row, and grid stretches items within a row
        // to equal height on its own - so the first version of this test
        // passed with the fix reverted. The bug lives ACROSS rows, because
        // each row sizes independently.
        projects: [
          { id: 'p1', github_full_name: 'orgbare/repo', language: null, tags: [], stars_count: 1, forks_count: 1 },
          { id: 'p2', github_full_name: 'orgB/r', language: 'TypeScript', tags: [], ecosystem_name: 'Stellar', stars_count: 2, forks_count: 2 },
          { id: 'p3', github_full_name: 'orgC/r', language: 'Go', tags: [], ecosystem_name: 'Stellar', stars_count: 3, forks_count: 3 },
          { id: 'p4', github_full_name: 'orgD/r', language: 'Rust', tags: [], stars_count: 4, forks_count: 4 },
          // Three chips: ecosystem + two tags. This is the card that wrapped to
          // a second label line and made its whole grid row 40px taller.
          { id: 'p5', github_full_name: 'orgE/r', language: 'Rust', tags: ['open-source', 'soroban-sdk'], ecosystem_name: 'Stellar', stars_count: 5, forks_count: 5 },
          { id: 'p6', github_full_name: 'orgF/r', language: null, tags: [], stars_count: 6, forks_count: 6 },
          { id: 'p7', github_full_name: 'orgG/r', language: 'Python', tags: [], ecosystem_name: 'Stellar', stars_count: 7, forks_count: 7 },
          { id: 'p8', github_full_name: 'orgH/r', language: null, tags: [], stars_count: 8, forks_count: 8 },
        ],
      }),
    })
  })

  await page.goto('/dashboard?tab=discover')
  await page.waitForTimeout(1200)

  // The card itself, by test id. The first version matched on a utility class
  // and picked up the grid wrapper instead - which grid stretches to equal
  // heights within a row regardless, so the assertion could not fail.
  const heights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid="discover-project-card"]'))
      .map((el) => Math.round(el.getBoundingClientRect().height)))

  // Enough cards for two rows, or the test cannot see the bug it exists for.
  expect(heights.length, 'need at least 5 cards to produce a second grid row').toBeGreaterThanOrEqual(5)
  const unique = [...new Set(heights)]
  expect(unique, `cards rendered at ${unique.join(', ')}px - a card with more labels is taller than one with fewer`)
    .toHaveLength(1)
})

// The page was its own scroll container sized to a parent with no height, so
// everything past the fold was unreachable. Checked at a SHORT viewport,
// because at a tall one there may be nothing below the fold to miss.
test('the ecosystem page scrolls at a short viewport', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await auth(page)
  await page.setViewportSize({ width: 1280, height: 500 })

  await page.goto('/dashboard?tab=ecosystems')
  await page.waitForTimeout(1200)

  const before = await page.evaluate(() => window.scrollY)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => ({
    y: window.scrollY,
    scrollable: document.body.scrollHeight > window.innerHeight,
  }))

  test.skip(!after.scrollable, 'page is shorter than the viewport; nothing below the fold')
  expect(after.y, 'the document did not move - content below the fold is unreachable')
    .toBeGreaterThan(before)
})

// Numbers must not be silently truncated.
//
// #1004 pinned the org header's left column to the rank badge's height and
// made the title and stats rows share it. That squeezed the stat tiles to
// 109px against 153px of content, and their overflow-hidden - which exists for
// a decorative blur orb - clipped the number instead of spilling visibly.
// Measured before the fix: 109 rendered, 153 needed.
//
// The assertion is about clipping rather than exact alignment on purpose. The
// "the two sides must match exactly" requirement is what caused this: a
// layout that truncates data is worse than one that is 44px out of alignment.
// The badge stays a fixed square and centres; the column is min-height.
test('no org stat tile clips its own content', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard?tab=org&org=grainlify')
  await page.waitForTimeout(1500)

  const tiles = await page.evaluate(() => {
    const labels = ['Repositories', 'Stars', 'Contributors', 'Merged PRs']
    return Array.from(document.querySelectorAll('div'))
      .filter((d) => labels.includes(d.textContent?.trim() ?? ''))
      .map((d) => d.parentElement)
      .filter((el): el is HTMLElement => !!el)
      .map((el) => ({
        label: el.querySelector('div:nth-of-type(2)')?.textContent?.trim() ?? '?',
        rendered: Math.round(el.getBoundingClientRect().height),
        needed: el.scrollHeight,
      }))
  })

  // A page that rendered no tiles would pass the loop below without testing
  // anything.
  expect(tiles.length, 'no stat tiles rendered - the check below would be vacuous')
    .toBeGreaterThanOrEqual(4)

  for (const t of tiles) {
    expect(
      t.rendered,
      `a stat tile renders at ${t.rendered}px but needs ${t.needed}px, and it has ` +
      `overflow-hidden - the number is being cut off`,
    ).toBeGreaterThanOrEqual(t.needed)
  }
})

// The badge is a fixed square, and stays one. It was a verbatim copy of
// ProfilePage's markup that the flex row stretched into a tall rectangle;
// RankBadgeCard replaced it precisely so its shape stops depending on whatever
// sits beside it.
test('the org rank badge is square', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard?tab=org&org=grainlify')
  await page.waitForTimeout(1500)

  const badge = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find((d) => {
      const r = d.getBoundingClientRect()
      return r.width > 250 && r.width < 350 && /CONQUEROR|BRONZE|SILVER|GOLD|Unranked|\dst|\dnd|\drd|\dth/i.test(d.textContent ?? '')
    })
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  })

  expect(badge, 'the rank badge was not found on the page').not.toBeNull()
  expect(
    Math.abs(badge!.w - badge!.h),
    `the badge is ${badge!.w}x${badge!.h} - it is stretching to its neighbour instead of staying square`,
  ).toBeLessThanOrEqual(2)
})

// Repository cards, same property and same cause as the Discover cards.
//
// A repo carrying nine topics wrapped to four label lines and made its whole
// grid row taller than the rows around it. Measured before the fix: 304px
// against 434px, 466px and 499px depending on viewport width - the narrower
// the column, the worse it got.
//
// Written the way the Discover assertion finally worked: the mismatch was
// reproduced with real measurements first, and the mock below is the setup
// that produced it. Earlier attempts at that test passed with the fix removed
// because they measured the grid wrapper, used a single row, or used repos the
// page deduped away.
test('every repository card is the same height, whatever it carries', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })

  const mk = (i: number, tags: string[]) => ({
    id: `r${i}`, github_full_name: `org${i}/repo`, language: 'TypeScript',
    tags, category: 'Backend', stars_count: i, forks_count: i,
    contributors_count: i, open_issues_count: i, description: 'a repository',
  })
  await page.route((url) => url.pathname === '/projects', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          mk(1, []), mk(2, ['stellar']), mk(3, ['stellar']), mk(4, []), mk(5, []),
          // The heavy one, deliberately in a later row: rows stretch their own
          // items to equal height, so a single row cannot show this bug.
          mk(6, ['blockchain-security', 'cybersecurity', 'osint', 'phishing-protection',
                 'security', 'soroban', 'stellar', 'threat-intelligence', 'web3']),
          mk(7, ['stellar']), mk(8, []), mk(9, ['stellar']), mk(10, []),
        ],
      }),
    })
  })

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/dashboard?tab=browse')
  await page.waitForTimeout(900)
  // Browse opens on Organizations; the repo grid is the other toggle.
  const repos = page.getByRole('button', { name: /^Repositories$/i }).first()
  if (await repos.count()) { await repos.click(); await page.waitForTimeout(900) }

  const heights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid="project-card"]'))
      .map((el) => Math.round(el.getBoundingClientRect().height)))

  expect(heights.length, 'need several cards across at least two rows to see the bug')
    .toBeGreaterThanOrEqual(6)
  const unique = [...new Set(heights)]
  expect(unique, `cards rendered at ${unique.join(', ')}px - a repo with more topics is taller than one with fewer`)
    .toHaveLength(1)
})

// Landing directly on ?tab=maintainers as a contributor.
//
// This is the reload path, not the toggle path. The toggle already worked: the
// rail entry was gated on activeRole. The PAGE was not, and activeRole was
// plain useState with no persistence while currentPage read ?tab= - so every
// reload put a maintainer back in contributor mode on a URL that still said
// tab=maintainers, and the full maintainer dashboard rendered under a pill
// reading CONTRIBUTOR.
//
// It also meant a maintainer's route to their own application queue vanished
// on every page load, which is the likeliest reason 15 active maintainers have
// resolved one application between them.
test('landing on ?tab=maintainers as a contributor does not render the maintainer dashboard', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard?tab=maintainers')
  await page.waitForTimeout(1500)

  const body = (await page.textContent('body')) ?? ''

  // The fallback is shown, and it offers the remedy.
  expect(
    body,
    'no maintainer-view fallback rendered; a blank area cannot be told apart from a crash',
  ).toContain('viewing as a contributor')

  // And the maintainer surface itself is absent. "Select repositories" is the
  // maintainer dashboard's own control, so it is the honest marker for it.
  expect(
    body,
    'the maintainer dashboard rendered while the view was contributor - gating the rail entry ' +
    'is not the same as gating the page',
  ).not.toContain('Select repositories')
})

// The other half: the view survives a reload, so the queue stays reachable.
test('maintainer view persists across a reload', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard?tab=maintainers&view=maintainer')
  await page.waitForTimeout(1200)
  await page.reload()
  await page.waitForTimeout(1200)

  expect(
    await page.textContent('body'),
    'the view reset to contributor on reload - this is what made a maintainer lose their own queue every page load',
  ).not.toContain('viewing as a contributor')
})

// The fixed header and the page under it are one column. The header used to be
// right-anchored with width calc(100vw - 97px), so its left edge sat 8px right
// of <main> at every width; and page content started at 76px while the header
// ends at 80px below lg, so the first card slid under it on phones.
for (const [width, height] of [[390, 844], [1440, 900]] as const) {
  test(`the header lines up with the page and clears it at ${width}px`, async ({
    page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
  }) => {
    await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
    await page.addInitScript(() => {
      window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
      window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
    })
    await page.setViewportSize({ width, height })
    await page.goto('/dashboard?tab=settings&subtab=profile')
    await page.waitForTimeout(1200)

    const box = await page.evaluate(() => {
      const header = document.querySelector('[data-tour-id="search"]')?.parentElement
      const main = document.querySelector('main')
      // The settings tab bar: the first thing on the page, below the header.
      const profileTab = [...document.querySelectorAll('main button')].find((b) => b.textContent?.trim() === 'Profile')
      const tabs = profileTab?.closest('div.space-y-6')?.firstElementChild
      const r = (el: Element | null | undefined) => (el ? el.getBoundingClientRect() : null)
      return { header: r(header), main: r(main), tabs: r(tabs) }
    })
    expect(box.header && box.main && box.tabs, 'layout landmarks not found').toBeTruthy()
    expect(Math.abs(box.header!.left - box.main!.left), 'header left edge vs page').toBeLessThanOrEqual(0.5)
    expect(Math.abs(box.header!.right - box.main!.right), 'header right edge vs page').toBeLessThanOrEqual(0.5)
    expect(box.tabs!.top, 'first content starts under the fixed header').toBeGreaterThanOrEqual(box.header!.bottom)
  })
}
