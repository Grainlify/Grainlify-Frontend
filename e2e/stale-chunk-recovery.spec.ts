import { test, expect } from './fixtures'

/**
 * A1 end to end: a tab open across a deploy recovers by itself, and a failure
 * a reload cannot fix does NOT loop.
 *
 * The first spec is faithful to the real event rather than convenient: the
 * stale chunk 404s only until the tab reloads, because a reload is exactly
 * what fetches the new index.html and the new hashes. A fixture that kept
 * 404-ing after the reload would be testing a different failure.
 */
const auth = async (page: any) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
    window.localStorage.setItem('theme', 'light')
    // Counts real DOCUMENT loads. Playwright's framenavigated also fires on
    // SPA history writes, and the dashboard rewrites its URL on every tab
    // change - counting those reported four "reloads" for one.
    const n = Number(sessionStorage.getItem('__loads') || '0')
    sessionStorage.setItem('__loads', String(n + 1))
  })
}
const loads = (page: any) => page.evaluate(() => Number(sessionStorage.getItem('__loads') || '0'))
const quietApi = async (page: any) => {
  await page.route((url: URL) => url.pathname === '/notifications/', async (r: any) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [] }) }))
}

test('a tab open across a deploy recovers itself', async ({ page, setupMockAuth }) => {
  await setupMockAuth(); await auth(page); await quietApi(page)
  await page.goto('/dashboard?tab=discover')
  await expect(page.locator('#root')).not.toBeEmpty()

  // The deploy: chunks this tab has not fetched are gone - until it reloads.
  let deployed = true
  await page.route(/\/assets\/.*\.js$/, async (route: any) => {
    if (deployed) return route.fulfill({ status: 404, contentType: 'text/html', body: 'Not Found' })
    return route.fallback()
  })
  page.once('framenavigated', () => { deployed = false })

  await page.locator('[data-tour-id="leaderboard"]').click()
  await page.waitForTimeout(4000)

  const root = (await page.locator('#root').innerHTML()).length
  const documentLoads = await loads(page)
  console.log(`\n  document loads: ${documentLoads} (1 initial + 1 reload)   #root after recovery: ${root}`)
  console.log(`  flag set: ${await page.evaluate(() => sessionStorage.getItem('grainlify_chunk_reloaded'))}`)
  expect(documentLoads).toBe(2)                 // the initial load plus exactly one reload
  expect(root).toBeGreaterThan(5000)            // a real page, not the fallback
  await page.screenshot({ path: '/tmp/shots/a1-recovered.png', fullPage: true })
})

/** The guard, in a real browser, on the realistic version of "a reload cannot
 *  fix this": ONE chunk stays broken while the entry bundle is fine - a failed
 *  upload, a proxy blocking one path. The reload is spent, the app boots, and
 *  the second attempt gets a card that says so instead of another reload. */
test('a failure a reload cannot fix does not loop', async ({ page, setupMockAuth }) => {
  await setupMockAuth(); await auth(page); await quietApi(page)
  await page.goto('/dashboard?tab=discover')
  await expect(page.locator('#root')).not.toBeEmpty()

  // One chunk permanently broken. The entry bundle keeps working, so the app
  // still boots after the reload.
  await page.route(/\/assets\/LeaderboardPage-.*\.js$/, async (route: any) =>
    route.fulfill({ status: 404, contentType: 'text/html', body: 'Not Found' }))

  await page.locator('[data-tour-id="leaderboard"]').click()
  // No second click needed: the reload lands back on ?tab=leaderboard and the
  // app retries that chunk by itself, which is the retry under test. (Clicking
  // the rail again would sit for its full 30s default timeout, because the
  // boundary has replaced the rail.)
  await page.waitForTimeout(6000)

  const documentLoads = await loads(page)
  const root = (await page.locator('#root').innerHTML()).length
  console.log(`  document loads with one permanently broken chunk: ${documentLoads}   #root: ${root}`)
  // Initial load plus at most one reload. Unguarded this climbs without bound.
  expect(documentLoads).toBeLessThanOrEqual(2)
  // And the person is left with a page, not a blank one.
  expect(root).toBeGreaterThan(1000)
  await page.screenshot({ path: '/tmp/shots/a1-no-loop.png', fullPage: true })
})

/** The cost, stated rather than hidden. Offline, a reload fetches nothing, so
 *  it would replace an explanation with a blank page. It is suppressed. */
test('offline, it explains instead of reloading', async ({ page, setupMockAuth, context }) => {
  await setupMockAuth(); await auth(page); await quietApi(page)
  await page.goto('/dashboard?tab=discover')
  await expect(page.locator('#root')).not.toBeEmpty()

  await page.route(/\/assets\/.*\.js$/, async (route: any) =>
    route.fulfill({ status: 404, contentType: 'text/html', body: 'Not Found' }))
  await context.setOffline(true)

  await page.locator('[data-tour-id="leaderboard"]').click()
  await page.waitForTimeout(3500)

  const documentLoads = await loads(page)
  console.log(`  offline document loads: ${documentLoads} (must stay 1)`)
  expect(documentLoads).toBe(1)
  await expect(page.getByRole('alert')).toBeVisible()
  await context.setOffline(false)
  await page.screenshot({ path: '/tmp/shots/a1-offline.png', fullPage: true })
})
