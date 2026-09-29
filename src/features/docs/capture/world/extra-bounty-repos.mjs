// Extra data for the bounty-repository screenshots (shots/bounty-repos.mjs):
// the admin Bounty Repositories section, and the maintainer Bounties tab.
// Nothing else in the world uses it.
//
// Admin (world('admin') plus the answer to the Bounty Repositories list):
//   tidewater-labs/ledgerline   registered, bounties on, switched on by ada-admin
//   tidewater-labs/tide-sdk     registered, bounties on
//   northfield-oss/quill-docs   registered, bounties off
//   saltmarsh/brine-indexer     bounties still on, but the GitHub App has been
//                               removed, so it is no longer registered
//   northfield-oss/signet       not verified and no App: the button is disabled
//   Grainlify/grainlify-agent-sandbox   known to the agent only, the test carve-out
//
// Maintainer (world('maintainer') with two more bounties on owen-maintains'
// repositories, so the tab shows all three phases):
//   tide-sdk #68     applications open, a few applicants: a band, no names
//   ledgerline #247  window closed, not drawn yet: the full list with gate outcomes
//   ledgerline #240  drawn (the world's existing bounty): winner and ticket breakdown
//   tide-sdk #61     drawn (the world's existing payable bounty)

import { world, BOUNTIES } from './index.mjs'
import { ago, ahead, uuidFor } from './util.mjs'
import { personas } from './people.mjs'

const ADA = personas.admin.login
const idOf = (key) => uuidFor('bounty:' + key)

// --- Admin: which repositories may have bounties ----------------------------------------

const project = (id, full_name, { verified = true, app = true } = {}) => ({
  project_id: id,
  full_name,
  verified,
  github_app_installation_id: app ? 50000000 + full_name.length : null,
  registered_project: verified && app,
})

const agentRepo = (fullName, o = {}) => {
  const s = {
    fullName, allowlisted: true, bountiesEnabled: false, registeredProject: true, testCarveOut: false,
    lastChangedBy: null, lastChangedAt: null, ...o,
  }
  const ok = s.allowlisted && s.bountiesEnabled && (s.registeredProject || s.testCarveOut)
  return { ...s, mayHaveBounties: ok, whyNot: ok ? null : 'not eligible' }
}

export const REPO_PROJECTS = [
  project('p-perch', 'kestrel-data/perch'),
  project('p-quill', 'northfield-oss/quill-docs'),
  project('p-signet', 'northfield-oss/signet', { verified: false, app: false }),
  project('p-brine', 'saltmarsh/brine-indexer', { app: false }),
  project('p-ledger', 'tidewater-labs/ledgerline'),
  project('p-tide', 'tidewater-labs/tide-sdk'),
]

export const AGENT_REPOS = [
  agentRepo('Grainlify/grainlify-agent-sandbox', { registeredProject: false, testCarveOut: true, bountiesEnabled: true, lastChangedBy: ADA, lastChangedAt: ago(30) }),
  agentRepo('kestrel-data/perch', { bountiesEnabled: true, lastChangedBy: ADA, lastChangedAt: ago(21) }),
  agentRepo('northfield-oss/quill-docs', { bountiesEnabled: false, lastChangedBy: ADA, lastChangedAt: ago(3) }),
  agentRepo('saltmarsh/brine-indexer', { bountiesEnabled: true, registeredProject: false, lastChangedBy: ADA, lastChangedAt: ago(12) }),
  agentRepo('tidewater-labs/ledgerline', { bountiesEnabled: true, lastChangedBy: ADA, lastChangedAt: ago(18) }),
  agentRepo('tidewater-labs/tide-sdk', { bountiesEnabled: true, lastChangedBy: ADA, lastChangedAt: ago(14) }),
]

function adminExtra() {
  return {
    'GET /admin/bounty-repos': { projects: REPO_PROJECTS, agent: AGENT_REPOS },
    'POST /admin/bounty-repos': { ok: true, repos: AGENT_REPOS },
  }
}

/** world('admin') plus the Bounty Repositories list. Spread it into a shot entry. */
export function adminBountyReposWorld() {
  const w = world('admin')
  return { ...w, api: { ...w.api, ...adminExtra() } }
}

// --- Maintainer: the Bounties tab ------------------------------------------------------------

const base = (key, repo, issueNumber, issueTitle, usdc, extra) => ({
  id: idOf(key), repo, issueNumber, issueTitle, issueUrl: `https://github.com/${repo}/issues/${issueNumber}`,
  amountMinor: String(usdc * 1_000_000), decimals: 6, currency: 'USDC', network: 'solana-devnet', status: 'posted',
  postedAt: ago(0, 3), payout: null, isTest: false, waivedRules: [], applicationsOpenAt: null, applicationsCloseAt: null,
  applicationState: 'none', assignedTo: null, assignmentStaleAt: null, reservedForNewcomers: false, applicantBucket: null,
  applicantCount: null, ...extra,
})

const OPEN = base('tide-68', 'tidewater-labs/tide-sdk', 68, 'Add a timeout option to subscribe()', 20, {
  postedAt: ago(0, 1), applicationsOpenAt: ago(0, 1), applicationsCloseAt: ahead(0, 5), applicationState: 'open', applicantBucket: 'few',
})
const CLOSED = base('ledger-247', 'tidewater-labs/ledgerline', 247, 'Compact snapshots in the background', 30, {
  postedAt: ago(0, 7), applicationsOpenAt: ago(0, 7), applicationsCloseAt: ago(0, 0, 20), applicationState: 'closed', applicantCount: 4,
})

const bountyOf = (key) => BOUNTIES.find((b) => b.id === idOf(key))
const LEDGER_240 = bountyOf('ledger-240')
const TIDE_61 = bountyOf('tide-61')

const common = (b) => ({ bountyId: b.id, repo: b.repo, issueNumber: b.issueNumber, applicationsCloseAt: b.applicationsCloseAt, canAssign: false, assignmentIsByDraw: true })
const app = (githubLogin, status, fit = 'plausible', gateFailureReason = null, h = 3) => ({ githubLogin, status, gateFailureReason, fit, appliedAt: ago(0, h) })

function pool(rows) {
  const total = rows.reduce((s, r) => s + r[2], 0)
  return rows.map(([githubLogin, githubUserId, tickets, weights]) => ({ githubLogin, githubUserId, fit: 'plausible', tickets, weights, share: tickets / total }))
}

const VIEWS = {
  // Open: the band, no names.
  [OPEN.id]: { ...common(OPEN), windowOpen: true, applicantBucket: 'few', applicantCount: null, applications: null, draw: null },
  // Closed, not drawn yet: everyone, with each gate outcome.
  [CLOSED.id]: {
    ...common(CLOSED), windowOpen: false, applicantBucket: null, applicantCount: 4, draw: null,
    applications: [
      app('arun-patch', 'applied', 'plausible', null, 6),
      app('wren-codes', 'applied', 'plausible', null, 5),
      app('yuki-tern', 'applied', 'plausible', null, 3),
      app('dara-loop', 'applied', 'plausible', null, 2),
      app('new-account-7', 'rejected_gate', null, 'account_too_new', 4),
    ],
  },
  // Drawn: the winner and the ticket breakdown.
  [LEDGER_240.id]: {
    ...common(LEDGER_240), windowOpen: false, applicantBucket: null, applicantCount: 5,
    applications: [
      app('jun-okafor', 'won', 'plausible', null, 44),
      app('arun-patch', 'lost', 'plausible', null, 43),
      app('mira-dev', 'lost', 'plausible', null, 42),
      app('tomas-rivet', 'lost', 'plausible', null, 41),
      app('wren-codes', 'lost', 'plausible', null, 40),
      app('new-account-7', 'rejected_gate', null, 'account_too_new', 39),
    ],
    draw: {
      winnerLogin: 'jun-okafor', seed: 734019284, ranAt: LEDGER_240.applicationsCloseAt, noWinnerReason: null,
      pool: pool([
        ['jun-okafor', 88114201, 1.5, { weight_prior_completion: 1.5 }],
        ['arun-patch', 90733410, 1.5, { weight_first_ever_application: 1.5 }],
        ['mira-dev', 90412277, 1.5, { weight_prior_completion: 1.5 }],
        ['tomas-rivet', 91208833, 0.75, { weight_first_ever_application: 1.5, weight_per_abandon: 0.5 }],
        ['wren-codes', 92011245, 1, {}],
      ]),
    },
  },
  [TIDE_61.id]: {
    ...common(TIDE_61), windowOpen: false, applicantBucket: null, applicantCount: 4,
    applications: [app('felix-quay', 'won', 'plausible', null, 140), app('ike-nwosu', 'lost', 'plausible', null, 139), app('lena-marsh', 'lost', 'plausible', null, 138), app('bram-oster', 'lost', 'plausible', null, 137)],
    draw: {
      winnerLogin: 'felix-quay', seed: 1120394857, ranAt: TIDE_61.applicationsCloseAt, noWinnerReason: null,
      pool: pool([
        ['felix-quay', 93011874, 1.5, { weight_first_ever_application: 1.5 }],
        ['ike-nwosu', 93502216, 1, {}],
        ['lena-marsh', 93877105, 1.5, { weight_prior_completion: 1.5 }],
        ['bram-oster', 94100329, 1, {}],
      ]),
    },
  },
}

/** The three bounties the maintainer shots frame, by phase. */
export const PHASE_BOUNTY = { open: OPEN, closed: CLOSED, drawn: LEDGER_240 }

/** world('maintainer') plus two more bounties and the maintainer view of each. Spread it into a shot entry. */
export function maintainerBountiesWorld() {
  const w = world('maintainer')
  const bounties = [OPEN, CLOSED, ...BOUNTIES]
  const agent = {
    ...w.agent,
    '/public/bounties': { ...w.agent['/public/bounties'], bounties },
    [`/public/bounties/${OPEN.id}`]: { status: w.agent['/public/status'], bounty: OPEN },
    [`/public/bounties/${CLOSED.id}`]: { status: w.agent['/public/status'], bounty: CLOSED },
  }
  const api = { ...w.api }
  for (const [id, view] of Object.entries(VIEWS)) api[`GET /maintainer/bounties/${id}/applications`] = view
  return { ...w, api, agent }
}
