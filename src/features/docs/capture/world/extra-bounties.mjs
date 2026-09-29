// Extra fixture data for the bounties and GrainHack contributor screenshots
// (shots/bounties-grainhack.mjs). Nothing else in the world uses it: each
// export is an API map merged over world('contributor').api for one shot.
//
// Two of these are stateful (apply, then see the applied state). The state is
// kept per browser page, so every theme/width variant starts fresh.

import { ago } from './util.mjs'
import { uuidFor } from './util.mjs'
import { apiFor } from './index.mjs'
import { HACKATHONS } from './grainhack.mjs'

const idOf = (key) => uuidFor('bounty:' + key)
const pageOf = (req) => {
  try {
    return req.frame().page()
  } catch {
    return null
  }
}

/** The open bounty the apply shots use: kestrel-data/sieve #17 (window open, a few applicants). */
export const APPLY_BOUNTY_ID = idOf('sieve-17')

/**
 * Bounties where mira-dev has NOT yet applied to sieve-17, until she clicks
 * Apply for this bounty on that page; after that the server says 'applied'.
 */
export function bountyApplyApi() {
  const base = apiFor('contributor')['/me/bounty-applications']
  const applied = new WeakSet()
  const without = { ...base, applications: { ...base.applications } }
  delete without.applications[APPLY_BOUNTY_ID]
  return {
    '/me/bounty-applications': (req) =>
      applied.has(pageOf(req))
        ? { ...base, applications: { ...base.applications, [APPLY_BOUNTY_ID]: { status: 'applied', gateFailureReason: null, appliedAt: ago(0) } } }
        : without,
    [`POST /bounties/${APPLY_BOUNTY_ID}/apply`]: (req) => {
      applied.add(pageOf(req))
      return { applied: true, applicationId: uuidFor('application:' + APPLY_BOUNTY_ID), closesAt: null }
    },
  }
}

/** mira-dev applied to sieve-17 before linking a wallet, and was refused for it (use with wallet: 'unlinked'). */
export function bountyRefusedApi() {
  const base = apiFor('contributor', { wallet: 'unlinked' })['/me/bounty-applications']
  return {
    '/me/bounty-applications': {
      ...base,
      applications: { ...base.applications, [APPLY_BOUNTY_ID]: { status: 'rejected_gate', gateFailureReason: 'no_linked_wallet', appliedAt: ago(0, 1) } },
    },
  }
}

/** The public events list with one more event, already settled, so every phase after announcement shows. */
export function eventsWithSettledApi() {
  const spring = {
    id: 'hk-spring-26', name: 'GrainHack Spring 2026', phase: 'settled',
    announced_at: ago(160), application_period_start: ago(158), application_period_end: ago(142), issue_prep_start: ago(141),
    starts_at: ago(125), ends_at: ago(111), merge_grace_period_hours: 48,
    sponsor_total_usdc: '6000.00', platform_fee_usdc: '300.00', platform_fee_rate_pct: '5.00',
    contributor_prize_pool: '4560.00', maintainer_prize_pool: '1140.00', net_pool_usdc: '5700.00',
    created_at: ago(165), results_published_at: ago(80),
  }
  return { '/hackathons': { hackathons: [...HACKATHONS.filter((h) => h.phase !== 'draft'), spring] } }
}

/** The GrainHack issue the apply shots use: ledgerline #224 in GrainHack Autumn 2026. */
export const APPLY_GH = { projectId: 'p-ledger', number: 224, issueId: 'hi-ledger-224' }

/** ledgerline #224 with no application from mira-dev until she applies on that page. */
export function grainhackApplyApi() {
  const path = `/projects/${APPLY_GH.projectId}/grainhack/${APPLY_GH.number}`
  const base = apiFor('contributor')[path]
  const applied = new WeakSet()
  const mine = {
    id: 'ap-new-ledger-224', hackathon_id: base.issue.hackathon_id, hackathon_name: base.issue.hackathon_name, hackathon_issue_id: APPLY_GH.issueId,
    project_id: APPLY_GH.projectId, repo_full_name: 'tidewater-labs/ledgerline', issue_number: APPLY_GH.number, status: 'applied',
    gate_failure_reason: null, fit: null, application_window_closes_at: base.issue.application_window_closes_at, created_at: ago(0),
  }
  return {
    [path]: (req) => ({ ...base, my_application: applied.has(pageOf(req)) ? mine : null }),
    [`POST /hackathon-issues/${APPLY_GH.issueId}/apply`]: (req) => {
      applied.add(pageOf(req))
      return { id: mine.id, status: 'applied' }
    },
  }
}
