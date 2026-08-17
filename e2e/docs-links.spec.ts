import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'

/**
 * Every docs.grainlify.com URL the product links to must resolve.
 *
 * Four links on the support page 404'd in production. They had not moved and
 * were not archived - they never existed. They were written by deriving a path
 * pattern (/docs/founding-pool, /docs/reference/kyc) instead of reading the
 * live site, whose structure is /docs/contributors/... and /docs/maintainers/...
 *
 * A unit test cannot catch this: the URLs are correct strings, correctly
 * rendered. Only asking the docs site can. So this collects them from the
 * source rather than from a hand-maintained list - a list would drift the
 * moment somebody adds a link without updating it.
 */

// Collected from source, so a new link is covered the day it is added.
function docsUrlsInSource(): string[] {
  const out = execSync(
    `git grep -hoE "https://docs\\.grainlify\\.com[A-Za-z0-9/._#?=-]*" -- 'src/**' || true`,
    { encoding: 'utf8', cwd: process.cwd() },
  )
  return [...new Set(out.split('\n').map((s) => s.trim()).filter(Boolean))]
    // Strip a trailing anchor: the server answers for the page either way.
    .map((u) => u.split('#')[0].replace(/[.,)]+$/, ''))
    .filter((u, i, a) => a.indexOf(u) === i)
}

const URLS = docsUrlsInSource()

test('the product links to at least the known docs pages', () => {
  // Guards against the grep silently matching nothing, which would make every
  // assertion below vacuous - the failure mode this repo keeps hitting.
  expect(URLS.length, 'no docs URLs found in src/ - the collector is broken, not the links')
    .toBeGreaterThanOrEqual(5)
})

for (const url of URLS) {
  test(`docs link resolves: ${url.replace('https://docs.grainlify.com', '') || '/'}`, async ({ request }) => {
    const res = await request.get(url, { maxRedirects: 5, timeout: 20000 })
    expect(
      res.status(),
      `${url} returned ${res.status()}. If the page moved in a docs restructure, point the link at ` +
      `its new home; if the topic has no page, remove the link rather than aiming it at the nearest ` +
      `thing - a link that does not answer the question is worse than no link.`,
    ).toBe(200)
  })
}
