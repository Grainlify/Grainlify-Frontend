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
})
