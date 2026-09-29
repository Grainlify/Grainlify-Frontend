// The fixture world: one invented, consistent set of API answers that makes
// every screen of the app render with real content under openPage().
//
//   import { world } from './world/index.mjs'
//   const { page, unanswered } = await openPage(browser, { base, theme, width, ...world('contributor') })
//
// or piece by piece:
//
//   openPage(browser, { base, theme, width, persona: personas.maintainer, api: apiFor('maintainer'), agent, init: initFor('maintainer') })
//
// `init` matters: a few endpoints must answer 404 (an issue that is not in a
// GrainHack, an event with no KeeperHub run, no payout address yet), and
// lib.mjs can only answer 200. initFor() patches fetch in the page to return
// those 404s; without it the GrainHack panels on an ordinary issue fail.
//
// Options (all optional), for the states a page can be in:
//   wallet:        'linked' (default) | 'unlinked'          Solana wallet for bounties
//   follow:        'approved' (default) | 'none' | 'pending' | 'rejected'   social-follow proof
//   readiness:     'ready' (default) | 'register_now' | 'not_applicable' | 'excluded_from_published'
//   payoutAddress: true (default) | false                   Aptos payout address registered
//   claim:         false (default) | true                   a published Founding Pool claim waiting on the payout tab

import { personas } from './people.mjs'
import { projectsApi } from './projects.mjs'
import { grainhackApi } from './grainhack.mjs'
import { bountiesApi, agent, walletVariants, SOLANA_ADDRESS, DRAW_DEMO_BOUNTY_ID, BOUNTIES } from './bounties.mjs'
import { accountApi, followVariants, APTOS_ADDRESS } from './account.mjs'
import { adminApi } from './admin.mjs'

export { personas, agent, walletVariants, followVariants, SOLANA_ADDRESS, APTOS_ADDRESS, DRAW_DEMO_BOUNTY_ID, BOUNTIES }
export { PROJECTS, ISSUES, PRS, ECOSYSTEMS, issueId, PENDING_PROJECT } from './projects.mjs'
export { HACKATHONS, GH_ISSUES } from './grainhack.mjs'

/** The API map for a persona: shared data plus that persona's own /me, profile, applications and notifications. */
export function apiFor(personaKey, opts = {}) {
  if (!personas[personaKey]) throw new Error(`Unknown persona "${personaKey}". Known: ${Object.keys(personas).join(', ')}`)
  return {
    ...projectsApi(personaKey),
    ...grainhackApi(personaKey),
    ...bountiesApi(personaKey, opts),
    ...accountApi(personaKey, opts),
    ...(personaKey === 'admin' ? adminApi() : {}),
  }
}

// Endpoints whose "nothing here" answer is a 404, and the body the app reads.
const NOT_FOUND = [
  // The issue page asks every issue whether it is in a GrainHack.
  { method: 'GET', pattern: '^/projects/[^/]+/grainhack/\\d+$', body: { error: 'not_a_hackathon_issue' } },
  { method: 'GET', pattern: '^/projects/[^/]+/hackathon-issues/\\d+$', body: { error: 'not_a_hackathon_issue' } },
  // No KeeperHub payout run for any event in this world.
  { method: 'GET', pattern: '^/admin/hackathons/[^/]+/keeperhub/run$', body: { error: 'not_found' } },
  // No payout address on a chain the world does not register one for.
  { method: 'GET', pattern: '^/me/payout-address$', body: { error: 'no_payout_address' } },
]

/** Runs in the page before the app: answers the NOT_FOUND endpoints with a 404 unless the map has them. */
function patchFetch(rules) {
  const original = window.fetch
  window.fetch = function (input, init) {
    try {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(raw, location.href)
      const method = String((init && init.method) || (typeof input === 'object' && input && 'method' in input ? input.method : 'GET')).toUpperCase()
      if (url.host === 'localhost:8080' || url.host === 'api.grainlify.com') {
        for (const r of rules) {
          if (r.method === method && new RegExp(r.pattern).test(url.pathname) && !r.except.includes(url.pathname)) {
            return Promise.resolve(new Response(JSON.stringify(r.body), { status: 404, headers: { 'content-type': 'application/json' } }))
          }
        }
      }
    } catch {
      // Fall through to the real request; lib.mjs answers it.
    }
    return original.apply(this, arguments)
  }
}

/** The init scripts openPage() needs for this persona's world (see the note at the top). */
export function initFor(personaKey, opts = {}) {
  const api = apiFor(personaKey, opts)
  // Only GET answers exempt a path: a POST to the same path says nothing about a GET.
  const paths = Object.keys(api).filter((k) => !/^(POST|PUT|DELETE) /.test(k)).map((k) => k.replace(/^GET /, '').split('?')[0])
  const rules = NOT_FOUND.map((r) => ({ ...r, except: paths.filter((p) => new RegExp(r.pattern).test(p)) }))
  return [{ fn: patchFetch, arg: rules }]
}

/** Everything openPage() takes for a persona: { persona, api, agent, init }. Spread it into the options. */
export function world(personaKey, opts = {}) {
  return { persona: personas[personaKey], api: apiFor(personaKey, opts), agent, init: initFor(personaKey, opts) }
}
