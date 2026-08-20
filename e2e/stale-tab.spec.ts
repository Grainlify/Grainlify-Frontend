import { test, expect } from './fixtures'

/**
 * A1, second hypothesis: the trigger is a DEPLOY, not the token.
 *
 * Vite content-hashes every lazy chunk. When the site redeploys, the old
 * hashed files stop existing. A tab left open still holds the old JS, so the
 * next tab-switch calls import() for a chunk that is now a 404. React.lazy
 * rejects, Suspense re-throws to the nearest error boundary, there is none
 * above <Routes>, and the whole tree unmounts.
 *
 * That is consistent with everything reported: it looks like "left it open too
 * long", reloading fixes the blankness (new index.html, new hashes) and lands
 * on sign-in because the token expired independently, and it has nothing to do
 * with 401 handling.
 */
const auth = async (page: any) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
    window.localStorage.setItem('theme', 'light')
  })
}

test('a lazy chunk that stopped existing blanks the page', async ({ page, setupMockAuth }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await setupMockAuth(); await auth(page)
  await page.route((url: URL) => url.pathname === '/notifications/', async (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [] }) }))

  await page.goto('/dashboard?tab=discover')
  await expect(page.locator('#root')).not.toBeEmpty()
  const before = (await page.locator('#root').innerHTML()).length
  console.log(`\n  loaded:              #root = ${before}`)

  // The site redeploys. Every chunk this tab has not already fetched is gone.
  await page.route(/\/assets\/.*\.js$/, async (route: any) => {
    await route.fulfill({ status: 404, contentType: 'text/html', body: 'Not Found' })
  })

  // The person clicks another section, exactly as they would on returning.
  // Clicked in-app, never re-navigated: a goto would refetch an index.html
  // whose scripts are all 404 now, which hangs the run and tests nothing.
  await page.locator('[data-tour-id="leaderboard"]').click()
  await page.waitForTimeout(3000)

  const after = (await page.locator('#root').innerHTML()).length
  console.log(`  after a stale chunk: #root = ${after}   ${after < 500 ? '<-- BLANK' : ''}`)
  console.log(`  uncaught errors: ${pageErrors.length}`)
  pageErrors.slice(0, 3).forEach((e) => console.log(`    ! ${e.slice(0, 160)}`))
  console.log(`  token still present: ${await page.evaluate(() => !!localStorage.getItem('patchwork_jwt'))}`)
  console.log(`  url: ${new URL(page.url()).pathname + new URL(page.url()).search}`)
  const alert = await page.getByRole('alert').count()
  console.log(`  boundary caught it: ${alert > 0 ? 'YES' : 'NO'}`)
  await page.screenshot({ path: `/tmp/shots/a2-boundary-${process.env.SHOT || 'light'}.png`, fullPage: true })
})
