import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/** The route list is an allowlist, and adding to it is a decision.
 *
 *  # What this would have caught
 *
 *  `/notifications` was added as a top-level route for a signed-in surface.
 *  Nothing failed. The convention it broke is written down — in the backend's
 *  own link builder, `internal/notifications/links.go`:
 *
 *      DashboardPath is the only routed path the app serves for signed-in
 *      surfaces. Everything else is a query parameter on it.
 *
 *  — and it was read, that same day, while repairing 43 notification links that
 *  pointed at a route which did not exist. Reading a rule while doing a
 *  different task does not install it. So the repair is not "read more
 *  carefully": it is that the convention should fail from the place a violation
 *  occurs, which is this file.
 *
 *  The symptom was cosmetic — a page with no sidebar or nav, reading as
 *  somewhere else rather than somewhere deeper. The cause was architectural, and
 *  the next one might not be cosmetic.
 *
 *  # Why an allowlist rather than a rule
 *
 *  "Signed-in surfaces must be ?tab=" cannot be checked from a route string: a
 *  path does not say whether what it renders needs an account. What CAN be
 *  checked is that the set of routes is the set somebody agreed to. Adding one
 *  then requires editing this list, which is the moment to ask whether it should
 *  be a tab instead.
 *
 *  A parse of App.tsx rather than an import of the router: importing would drag
 *  in every lazy page and their providers, and this needs one fact.
 */
describe('top-level routes', () => {
  const ALLOWED: Record<string, string> = {
    '/': 'landing, anonymous',
    '/signin': 'anonymous',
    '/signup': 'anonymous',
    '/auth/callback': 'anonymous, OAuth return',
    '/support': 'deliberately anonymous — the person who most needs it may have no account',
    '/dashboard': 'every signed-in surface, selected by ?tab=',
    '/notifications': 'ALIAS ONLY — redirects to /dashboard?tab=notifications so a typed URL works',
    '/bounties': 'ALIAS ONLY — redirects to /dashboard?tab=bounties (the dashboard guard handles sign-in)',
    '/bounties/ledger': 'ALIAS ONLY — redirects to /dashboard?tab=bounties&subtab=ledger, the in-dashboard ledger',
    '/bounties/link': 'signed-in, behind ProtectedRoute — its own page because it opens inside a wallet app browser',
    '/bounties/rules': 'deliberately anonymous — the published draw rules; one you must sign in to read is not published',
    '/docs/*': 'deliberately anonymous — the public documentation; each page is also prerendered to static HTML',
    '*': 'the not-found page, public and LAST so it only gets what nothing else claims',
  }

  it('are exactly the agreed set', () => {
    const src = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
    const found = [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1])
    const unexpected = found.filter((p) => !(p in ALLOWED))

    expect(
      unexpected,
      'A new top-level route was added. Signed-in surfaces belong on /dashboard as ?tab=, ' +
        'which is what gives them the sidebar and nav. If this really is a new anonymous ' +
        'surface or an alias, add it to ALLOWED with the reason.',
    ).toEqual([])
  })

  it('declares every allowed route, so a removed one is noticed too', () => {
    const src = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
    const found = new Set([...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]))
    const missing = Object.keys(ALLOWED).filter((p) => !found.has(p))
    expect(missing, 'A route in the allowlist no longer exists. Remove it here too.').toEqual([])
  })

  // The alias must stay an alias. If somebody later renders a page at
  // /notifications instead of redirecting, the sidebar disappears again and the
  // allowlist above would still pass.
  it('keeps /notifications a redirect rather than a surface', () => {
    const src = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
    const block = src.slice(src.indexOf('path="/notifications"'), src.indexOf('path="/dashboard"'))
    expect(block).toMatch(/Navigate\s+to="\/dashboard\?tab=notifications"/)
  })

  it('keeps the Bounties aliases redirects into the dashboard', () => {
    const src = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
    const block = (from: string, to: string) => src.slice(src.indexOf(`path="${from}"`), src.indexOf(`path="${to}"`))
    expect(block('/bounties', '/bounties/ledger')).toMatch(/Navigate\s+to="\/dashboard\?tab=bounties"/)
    expect(block('/bounties/ledger', '/bounties/link')).toMatch(/Navigate\s+to="\/dashboard\?tab=bounties&subtab=ledger"/)
  })

  it('keeps /bounties/link behind the sign-in guard', () => {
    const src = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
    const block = src.slice(src.indexOf('path="/bounties/link"'), src.indexOf('path="/notifications"'))
    expect(block).toMatch(/<ProtectedRoute>\s*<WalletLinkPage \/>\s*<\/ProtectedRoute>/)
  })

  it('declares the not-found route last', () => {
    const src = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
    const found = [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1])
    expect(found[found.length - 1]).toBe('*')
  })

  // The server half of "not found": vercel.json sends only these paths to the
  // app with a 200; everything else gets 404.html and a 404 status. A route
  // added here but not there would load, but as a 404; one left there after
  // being removed here would answer 200 for a page that no longer exists.
  it('matches the paths vercel.json serves with a 200', () => {
    const vercel = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8')) as { rewrites: { source: string; destination: string }[] }
    // Proxy rewrites send a path to another service rather than to the app.
    // They are not routes and must not be counted as ones.
    const proxies = vercel.rewrites.filter((r) => /^https?:\/\//.test(r.destination))
    const spa = vercel.rewrites.filter((r) => !/^https?:\/\//.test(r.destination))

    // The agent is proxied through this origin so the browser never makes a
    // cross-origin call to it: wallet extensions break those, and the page
    // then reports the agent as unreachable while it is answering correctly.
    expect(proxies).toEqual([{ source: '/agent/:path*', destination: 'https://agent.grainlify.com/:path*' }])
    // It must come first, because a rewrite list is evaluated in order.
    expect(vercel.rewrites[0]).toEqual(proxies[0])

    const served = new Set<string>()
    for (const r of spa) {
      expect(r.destination).toBe('/index.html')
      if (r.source === '/') served.add('/')
      const m = /^\/\(([^)]+)\)\/?$/.exec(r.source)
      if (m) for (const p of m[1].split('|')) served.add('/' + p)
    }
    // /docs/* is served by files, not by a rewrite: the build writes
    // dist/docs/<page>/index.html for every published page, and Vercel serves a
    // file before it applies rewrites. A rewrite here would answer 200 for a
    // docs page that does not exist; without one, it gets 404.html and a 404.
    const servedAsFiles = new Set(['/docs/*'])
    const routes = Object.keys(ALLOWED).filter((p) => p !== '*' && !servedAsFiles.has(p))
    expect([...served].sort()).toEqual(routes.sort())
    // Every alternation appears with and without a trailing slash.
    const groups = spa.map((r) => r.source).filter((x) => x !== '/')
    expect(groups.map((g) => g.replace(/\/$/, ''))).toEqual([groups[0], groups[0]])
  })
})
