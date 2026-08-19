import { test, expect } from './fixtures'

/**
 * Layout properties of the notifications page that only a real browser can
 * check.
 *
 * The whole point of this redesign was visual — density, a reading column, and
 * controls that appear only when there is enough to control. jsdom computes no
 * layout, so the 765 unit tests say nothing about any of it. The density claim
 * in particular ("152px down to about 90px") is a measurement, and a
 * measurement has to be measured.
 */

const auth = async (page: any) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })
}

const note = (i: number, over: Record<string, unknown> = {}) => ({
  id: `n${i}`,
  type: 'kyc_reset',
  title: `Your verification was reset (${i})`,
  body: 'An admin cleared your verification status. You can verify again.',
  link_path: '/dashboard?tab=settings&subtab=billing',
  read_at: i % 2 === 0 ? new Date().toISOString() : null,
  created_at: new Date(Date.now() - i * 3600_000).toISOString(),
  ...over,
})

/** Serves `count` notifications, and an unread badge, over the fixtures. */
async function seed(page: any, count: number) {
  await page.route((url: URL) => url.pathname === '/notifications/', async (route: any) => {
    const q = new URL(route.request().url()).searchParams
    const all = Array.from({ length: count }, (_, i) => note(i))
    const filtered = q.get('unread_only') === 'true' ? all.filter((n) => !n.read_at) : all
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ notifications: filtered }),
    })
  })
  await page.route((url: URL) => url.pathname === '/notifications/unread-count', async (route: any) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ count: Math.ceil(count / 2) }),
    })
  })
}

const open = async (page: any) => {
  await page.goto('/dashboard?tab=notifications')
  await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible()
}

test.describe('notifications page layout', () => {
  test('a row with a one-line body is about 90px, not 150', async ({ page, setupMockAuth }) => {
    await setupMockAuth(); await auth(page); await seed(page, 5)
    await open(page)

    const rows = page.locator('li[id^="notification-"]')
    await expect(rows).toHaveCount(5)

    const heights: number[] = []
    for (let i = 0; i < 5; i++) {
      const box = await rows.nth(i).boundingBox()
      heights.push(box!.height)
    }
    // The claim was ~90px. Allow real-browser slack, but fail loudly if the
    // old ~152px row comes back.
    for (const h of heights) expect(h).toBeLessThan(115)
    console.log('row heights:', heights.map((h) => Math.round(h)).join(', '))
  })

  test('rows sit in one card per date group, not one card each', async ({ page, setupMockAuth }) => {
    await setupMockAuth(); await auth(page)
    // Two groups: three from today, two from three weeks ago.
    await page.route((url: URL) => url.pathname === '/notifications/', async (route: any) => {
      const old = new Date(Date.now() - 21 * 864e5).toISOString()
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          notifications: [note(0), note(1), note(2), note(3, { created_at: old }), note(4, { created_at: old })],
        }),
      })
    })
    await page.route((url: URL) => url.pathname === '/notifications/unread-count', async (route: any) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 2 }) }))
    await open(page)

    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Earlier' })).toBeVisible()
    // Two list containers for five rows - the old build rendered five.
    await expect(page.locator('ul:has(> li[id^="notification-"])')).toHaveCount(2)
  })

  test('the reading column is centred rather than pinned left', async ({ page, setupMockAuth }) => {
    await setupMockAuth(); await auth(page); await seed(page, 3)
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page)

    const list = page.locator('ul:has(> li[id^="notification-"])').first()
    const column = (await list.boundingBox())!
    const main = (await page.locator('main').boundingBox())!
    const leftGap = column.x - main.x
    const rightGap = main.x + main.width - (column.x + column.width)
    // Left-aligned at max-w-3xl inside a 1400px area left ~630px of dead space
    // on one side and none on the other. Centred means the two agree.
    expect(Math.abs(leftGap - rightGap)).toBeLessThan(40)
  })

  test('controls stay away below the threshold and appear above it', async ({ page, setupMockAuth }) => {
    await setupMockAuth(); await auth(page); await seed(page, 8)
    await open(page)
    await expect(page.getByRole('textbox', { name: /search/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Unread' })).toHaveCount(0)

    await seed(page, 9)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Unread' })).toBeVisible()
  })

  /** The trap, in a real browser: filtering must not remove the filter. */
  test('the way back survives a filter that empties the list', async ({ page, setupMockAuth }) => {
    await setupMockAuth(); await auth(page); await seed(page, 9)
    await open(page)
    await page.getByRole('button', { name: 'Unread' }).click()
    // exact: 'All' is also a substring of 'Mark all as read'.
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible()
  })

  test('the page never scrolls sideways', async ({ page, setupMockAuth }) => {
    await setupMockAuth(); await auth(page); await seed(page, 12)
    for (const width of [1440, 1024, 768]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page)
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1)
    }
  })

  test('screenshots, for review', async ({ page, setupMockAuth }, testInfo) => {
    await setupMockAuth(); await auth(page); await seed(page, 6)
    await page.setViewportSize({ width: 1440, height: 1000 })
    for (const theme of ['light', 'dark'] as const) {
      await page.addInitScript((t) => window.localStorage.setItem('theme', t), theme)
      await open(page)
      await page.waitForTimeout(400)
      await testInfo.attach(`notifications-${theme}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
      await page.screenshot({ path: `/tmp/shots/notifications-${theme}.png`, fullPage: true })
    }
  })
})
