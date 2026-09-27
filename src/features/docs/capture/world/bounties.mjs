// Grainlify Bounties: the bounty agent's public API (answered under /agent)
// and the Grainlify-side endpoints around it (wallet link, my applications,
// the admin draw controls).
//
// The agent is on a devnet test run, so every bounty pays test USDC and the
// status line is the agent's own devnet wording.

import { ago, ahead, uuidFor } from './util.mjs'
import { personas } from './people.mjs'

const MIRA = personas.contributor.login
const ADA = personas.admin.login

export const STATUS = {
  network: 'solana-devnet',
  mainnetLive: false,
  inferenceMode: 'mock',
  statusLine: 'Devnet test run so far. Bounties pay test tokens with no value; mainnet bounties are not live yet.',
}

export const SOLANA_ADDRESS = '7Qm9YtVx3sLhE2pWcNaK5dRfG8uB4jZ6oTnHqPiXkM1s'

const TX = {
  perch: '4kPq8sWn2VbXr7TzYh3JdC6mLfA9eGuN1oRiK5wQ2tBxZc8vM3nD7yH4jS6aF9pL2qE5rT8uW1xY3zA6bC9dE2fG',
  sandbox: '2hJk5LmN8pQr3StU6vWx9YzA2bCd5EfG8hIj1KlM4nOp7QrS0tUv3WxY6zAb9CdE2fGh5IjK8lMn1OpQ4rSt7Uv',
  anchor: '5tRe9WqAs2DfGh6JkLz3XcVb8NmQw1ErTy4UiOp7AsDf0GhJk3LzXc6VbNm9QwEr2TyUi5OpAs8DfGh1JkLz4Xc',
}
const txUrl = (sig) => `https://solscan.io/tx/${sig}?cluster=devnet`
const short = (s) => `${s.slice(0, 5)}…${s.slice(-4)}`

const B = (key, repo, issueNumber, issueTitle, usdc, status, postedDaysAgo, extra = {}) => ({
  id: uuidFor('bounty:' + key),
  repo,
  issueNumber,
  issueTitle,
  issueUrl: `https://github.com/${repo}/issues/${issueNumber}`,
  amountMinor: String(usdc * 1_000_000),
  decimals: 6,
  currency: 'USDC',
  network: 'solana-devnet',
  status,
  postedAt: ago(postedDaysAgo),
  payout: null,
  isTest: false,
  waivedRules: [],
  applicationsOpenAt: null,
  applicationsCloseAt: null,
  applicationState: 'none',
  assignedTo: null,
  assignmentStaleAt: null,
  reservedForNewcomers: false,
  applicantBucket: null,
  applicantCount: null,
  ...extra,
})

export const BOUNTIES = [
  // Open: applications running, apply button shown.
  B('sieve-17', 'kestrel-data/sieve', 17, 'Document the filter DSL', 25, 'posted', 0.2, {
    applicationsOpenAt: ago(0, 5), applicationsCloseAt: ahead(0, 5), applicationState: 'open', applicantBucket: 'few',
  }),
  // Open and reserved for newcomers.
  B('orbit-41', 'saltmarsh/orbit-wallet', 41, 'Show token balances with the correct decimals', 15, 'posted', 0.1, {
    applicationsOpenAt: ago(0, 2), applicationsCloseAt: ahead(0, 4), applicationState: 'open', applicantBucket: 'none', reservedForNewcomers: true,
  }),
  // Posted, window not opened yet.
  B('brine-29', 'saltmarsh/brine-indexer', 29, 'Retry failed checkpoint writes', 30, 'posted', 0.05),
  // Drawn: held by the winner, pull request due.
  B('ledger-240', 'tidewater-labs/ledgerline', 240, 'Add a `ledgerline inspect` CLI subcommand', 40, 'posted', 2, {
    applicationsOpenAt: ago(2), applicationsCloseAt: ago(1, 18), applicationState: 'closed', applicantCount: 5,
    assignedTo: 'jun-okafor', assignmentStaleAt: ahead(1, 18),
  }),
  // A pull request is in review.
  B('anchor-132', 'northfield-oss/anchorage', 132, 'Reject expired SEP-10 challenges early', 30, 'in_review', 4, {
    applicationsOpenAt: ago(4), applicationsCloseAt: ago(3, 18), applicationState: 'closed', applicantCount: 3, assignedTo: 'dara-loop', assignmentStaleAt: null,
  }),
  // Passed every gate, waiting for a person to approve the payout.
  B('tide-61', 'tidewater-labs/tide-sdk', 61, 'Support custom commitment levels in the client', 35, 'payable', 6, {
    applicationsOpenAt: ago(6), applicationsCloseAt: ago(5, 18), applicationState: 'closed', applicantCount: 4, assignedTo: 'felix-quay',
  }),
  // Paid, with the devnet transaction.
  B('perch-7', 'kestrel-data/perch', 7, 'Add a fee histogram notebook', 25, 'paid', 9, {
    applicationsOpenAt: ago(9), applicationsCloseAt: ago(8, 18), applicationState: 'closed', applicantCount: 6,
    payout: { txSignature: TX.perch, txUrl: txUrl(TX.perch), paidAt: ago(6, 3), recipientLogin: MIRA },
  }),
  B('anchor-109', 'northfield-oss/anchorage', 109, 'Log SEP-10 failures with the client domain', 20, 'paid', 16, {
    applicationsOpenAt: ago(16), applicationsCloseAt: ago(15, 18), applicationState: 'closed', applicantCount: 2,
    payout: { txSignature: TX.anchor, txUrl: txUrl(TX.anchor), paidAt: ago(13, 5), recipientLogin: 'priya-kern' },
  }),
  // A test bounty that exercised the pipeline end to end.
  B('sandbox-1', 'tidewater-labs/agent-sandbox', 1, 'Fix the spelling of "Wellcome" in GREETING.md', 20, 'paid', 20, {
    isTest: true, waivedRules: ['block_org_members'], applicationsOpenAt: ago(20), applicationsCloseAt: ago(19, 18), applicationState: 'closed', applicantCount: 1,
    payout: { txSignature: TX.sandbox, txUrl: txUrl(TX.sandbox), paidAt: ago(19, 2), recipientLogin: 'lena-marsh' },
  }),
]
export const bountyByKey = Object.fromEntries(BOUNTIES.map((b) => [b.id, b]))
const idOf = (key) => uuidFor('bounty:' + key)

// --- Ledger ----------------------------------------------------------------------

const fmt = (b) => `${(Number(b.amountMinor) / 10 ** b.decimals).toFixed(2)} test ${b.currency}`
const hex = (s) => uuidFor(s).replace(/-/g, '').slice(0, 8)

function ledgerEvents() {
  const ev = []
  for (const b of BOUNTIES) {
    const posted = new Date(b.postedAt)
    ev.push({ at: new Date(posted.getTime() - 900).toISOString(), kind: 'inference', bountyId: b.id, test: true, detail: 'price · gpt-oss-120b', amount: null, proof: { label: `quote ${hex('price' + b.id)}`, url: null } })
    ev.push({ at: b.postedAt, kind: 'bounty_posted', bountyId: b.id, test: true, detail: `${b.repo} #${b.issueNumber}`, amount: fmt(b), proof: { label: `issue #${b.issueNumber}`, url: b.issueUrl } })
    if (['in_review', 'payable', 'paid'].includes(b.status)) {
      const pr = b.issueNumber + 3
      const reviewAt = new Date(posted.getTime() + 36 * 3600_000).toISOString()
      ev.push({ at: reviewAt, kind: 'inference', bountyId: b.id, test: true, detail: 'review · claude-sonnet-4-6', amount: null, proof: { label: `quote ${hex('review' + b.id)}`, url: null } })
      if (b.status !== 'in_review') {
        ev.push({ at: new Date(posted.getTime() + 37 * 3600_000).toISOString(), kind: 'gate_passed', bountyId: b.id, test: true, detail: `${b.repo} PR #${pr}`, amount: null, proof: { label: `PR #${pr}`, url: `https://github.com/${b.repo}/pull/${pr}` } })
      }
    }
    if (b.payout) {
      ev.push({ at: b.payout.paidAt, kind: 'payout', bountyId: b.id, test: true, detail: `${b.repo} #${b.issueNumber} → ${b.payout.recipientLogin}`, amount: fmt(b), proof: { label: short(b.payout.txSignature), url: b.payout.txUrl } })
    }
  }
  // A refused pull request on the anchorage bounty: the first attempt did not pass the gate.
  const anchor = bountyByKey[idOf('anchor-132')]
  ev.push({ at: ago(2, 20), kind: 'gate_refused', bountyId: anchor.id, test: true, detail: `${anchor.repo} PR #134`, amount: null, proof: { label: 'PR #134', url: `https://github.com/${anchor.repo}/pull/134` } })
  return ev.sort((a, b) => b.at.localeCompare(a.at))
}

const EVENTS = ledgerEvents()

export const LEDGER = {
  status: STATUS,
  totals: {
    bountiesPosted: BOUNTIES.length,
    bountiesPaidMainnet: 0,
    bountiesPaidTest: BOUNTIES.filter((b) => b.payout).length,
    inferenceCalls: EVENTS.filter((e) => e.kind === 'inference').length,
    inferenceSpendMicro: null,
    inferenceCeilingMicro: 5_000_000,
    feesInMicro: null,
  },
  budget: [
    { phase: 'P1', allocationMicro: 500000, spentMicro: 0 },
    { phase: 'P2P3', allocationMicro: 1000000, spentMicro: 0 },
    { phase: 'P4', allocationMicro: 1500000, spentMicro: 0 },
    { phase: 'LIVE', allocationMicro: 2000000, spentMicro: 0 },
  ],
  events: EVENTS,
}

// --- Rules (the published draw settings) -------------------------------------------

const DRAW_SETTINGS = [
  ['application_window_hours', 'int', '6', 'Window', 'How long applications stay open after a bounty is posted, before the draw runs.'],
  ['auto_draw_enabled', 'bool', 'true', 'Window', 'Run the draw automatically when a window closes. Off means every draw is run by hand from this page.'],
  ['empty_window_extension_hours', 'int', '6', 'Window', 'If a window closes with no applicants, extend it by this many hours instead of leaving the bounty unassignable.'],
  ['max_window_extensions', 'int', '3', 'Window', 'How many times a window may be extended for lack of applicants before the bounty is left alone for a human to look at.'],
  ['applicant_count_visibility', 'enum', 'bucketed', 'Window', 'How much of the applicant pool contributors see while a window is open. Exact counts are always released once it closes.'],
  ['assignment_stale_hours', 'int', '72', 'Assignment', 'How long a winner has to open a pull request before the assignment goes stale and the bounty can be drawn again.'],
  ['reservation_fallback_to_open_pool', 'bool', 'true', 'Newcomer reservation', 'If a reserved bounty attracts no newcomers, draw from everyone rather than leaving it unassigned. An unassignable bounty helps nobody, least of all a newcomer.'],
  ['block_org_members', 'bool', 'true', 'Hard gates', "Members of the bounty repository's own org cannot apply. A bounty may waive this individually; nothing else about a bounty can be waived."],
  ['min_account_age_days', 'int', '30', 'Hard gates', 'Minimum GitHub account age to apply. The payout gate checks this again independently at merge time.'],
  ['require_linked_wallet_to_apply', 'bool', 'true', 'Hard gates', 'Require a linked Solana wallet before applying, so nobody wins a bounty they cannot be paid for.'],
  ['max_active_assignments_per_person', 'int', '1', 'Hard gates', 'How many bounties one person may hold at once. Holding several while finishing none is the main way a draw gets gamed.'],
  ['ai_fit_assessment_enabled', 'bool', 'false', 'Fit assessment', 'Buy a fit assessment per application. Off means every applicant counts as "plausible" — a full ticket — which is the documented correct answer for most newcomers, so the draw runs unchanged with no model spend.'],
  ['fit_difficulty_tier', 'enum', 'standard', 'Fit assessment', 'The difficulty the fit assessment judges against when a bounty does not state its own.'],
  ['weight_fit_strong', 'float', '2.0', 'Weights', 'Ticket multiplier when the fit assessment says the applicant is a strong match.'],
  ['weight_fit_plausible', 'float', '1.0', 'Weights', 'Ticket multiplier for a plausible match. This is also what an unassessed application gets.'],
  ['weight_fit_weak', 'float', '0.25', 'Weights', 'Ticket multiplier for a weak match. Never zero: a weak match still has a chance.'],
  ['weight_difficulty_above', 'float', '0.5', 'Weights', 'Multiplier when the issue looks harder than the applicant has taken on before. Only "above" is penalised.'],
  ['weight_prior_completion', 'float', '1.5', 'Weights', 'Per completed bounty, compounding, capped at two so accumulated wins cannot outrank capability.'],
  ['weight_first_ever_application', 'float', '1.5', 'Weights', 'Bonus for someone who has never been assigned a bounty. Anchored to assignments, not applications.'],
  ['weight_per_abandon', 'float', '0.5', 'Weights', 'Per assignment released for silence, compounding. A rejected pull request is not an abandon.'],
]
// Two settings an admin has changed, with who and when.
const OVERRIDDEN = { application_window_hours: ['12', ago(9)], assignment_stale_hours: ['96', ago(4)] }

export const drawSettings = () =>
  DRAW_SETTINGS.map(([key, type, def, section, description]) => ({
    key, type, section, description, default: def,
    value: OVERRIDDEN[key]?.[0] ?? def,
    overridden: key in OVERRIDDEN,
    updatedAt: OVERRIDDEN[key]?.[1] ?? null,
    updatedBy: key in OVERRIDDEN ? ADA : null,
  }))

export const RULES = {
  status: STATUS,
  structural: {
    priorCompletionCap: 2,
    priorCompletionCapNote:
      'A win multiplies your tickets, but only for your first 2 completed bounties. It is a constant in the code, not a setting, so nobody can raise it mid-programme: it is what stops accumulated wins from overtaking capability for the bounty actually in front of you.',
    neverWeighted: ['total pull request count', 'merge rate', 'follower count', 'stars', 'total contributions', 'how well the application is written'],
    neverWeightedNote: 'All of these are farmable and all of them penalise newcomers. They are absent by omission: there is no code path in the draw that can read them.',
  },
  sections: [...new Set(DRAW_SETTINGS.map((s) => s[3]))],
  settings: drawSettings(),
}

// --- The agent map (keyed by path; lib.mjs strips the /agent prefix) -------------

export const agent = {
  '/public/status': STATUS,
  '/public/bounties': { status: STATUS, bounties: BOUNTIES },
  '/public/ledger': LEDGER,
  '/public/rules': RULES,
  '/link/session': { linked: true, wallet: SOLANA_ADDRESS, githubLogin: MIRA, replaced: null, unchanged: false },
  '/link/session/read': { linked: true, wallet: SOLANA_ADDRESS, linkedAt: ago(12), githubLogin: MIRA },
  ...Object.fromEntries(BOUNTIES.map((b) => [`/public/bounties/${b.id}`, { status: STATUS, bounty: b }])),
}

// --- Grainlify-side endpoints ------------------------------------------------------

/** Whether mira-dev has linked a Solana wallet. */
export const walletVariants = {
  linked: {
    'GET /me/bounty-wallet/link': { linked: true, wallet: SOLANA_ADDRESS, linked_at: ago(12) },
  },
  unlinked: {
    'GET /me/bounty-wallet/link': { linked: false, wallet: null, linked_at: null },
  },
}

const challenge = (login) => ({
  message: `Grainlify: link this wallet to my GitHub account\nGitHub: ${login} (id 90412277)\nWallet: ${SOLANA_ADDRESS}\nNonce: 3f9c2a71d04b4e18a6c5f0e2b7d91c44\nIssued: 2026-09-21T09:02:00Z\nExpires: 2026-09-21T09:12:00Z`,
  countersignature: 'Q09VTlRFUlNJR04=',
  expires_at: ahead(0, 0, 10),
})

export function bountiesApi(personaKey, { wallet = 'linked' } = {}) {
  const login = personas[personaKey].login
  const mine = personaKey === 'contributor'
    ? {
        githubLogin: login,
        applications: {
          [idOf('sieve-17')]: { status: 'applied', gateFailureReason: null, appliedAt: ago(0, 3) },
          [idOf('ledger-240')]: { status: 'lost', gateFailureReason: null, appliedAt: ago(1, 22) },
          [idOf('perch-7')]: { status: 'won', gateFailureReason: null, appliedAt: ago(8, 22) },
        },
        assignments: {},
      }
    : { githubLogin: login, applications: {}, assignments: {} }

  const api = {
    ...(wallet === 'linked' ? walletVariants.linked : walletVariants.unlinked),
    'POST /me/bounty-wallet/link': { linked: true, wallet: SOLANA_ADDRESS, githubLogin: login, replaced: null, unchanged: false },
    'POST /me/bounty-wallet/challenge': challenge(login),
    'POST /me/bounty-wallet/read-challenge': challenge(login),
    '/me/bounty-applications': mine,
    '/admin/bounty-draw/settings': { settings: drawSettings() },
    'POST /admin/bounty-draw/settings': { ok: true, settings: drawSettings() },
    'POST /admin/bounty-draw/settings/reset': { ok: true, settings: drawSettings() },
  }
  for (const b of BOUNTIES) {
    api[`POST /bounties/${b.id}/apply`] = { applied: true, applicationId: uuidFor('application:' + b.id), closesAt: b.applicationsCloseAt }
    api[`/admin/bounty-draw/${b.id}/state`] = drawState(b)
    api[`POST /admin/bounty-draw/${b.id}/run`] = drawRun(b)
  }
  return api
}

// --- Admin draw state for a bounty -----------------------------------------------------

const APPLICANTS = [
  ['jun-okafor', 88114201, 'applied', null, 'plausible', { weight_prior_completion: 1.5 }, 1.5],
  ['arun-patch', 90733410, 'applied', null, 'plausible', { weight_first_ever_application: 1.5 }, 1.5],
  [MIRA, 90412277, 'applied', null, 'plausible', { weight_prior_completion: 1.5 }, 1.5],
  ['tomas-rivet', 91208833, 'applied', null, 'plausible', { weight_first_ever_application: 1.5, weight_per_abandon: 0.5 }, 0.75],
  ['wren-codes', 92011245, 'applied', null, 'plausible', {}, 1],
  ['owen-maintains', 70011002, 'rejected_gate', 'org_member', null, {}, 0],
  ['new-account-7', 99990001, 'rejected_gate', 'account_too_new', null, {}, 0],
]

function applicantsFor(b) {
  const n = b.applicantCount ?? (b.applicantBucket === 'few' ? 3 : b.applicantBucket === 'many' ? 7 : 0)
  return APPLICANTS.slice(0, n + (n >= 5 ? 2 : 0))
}

function poolFor(rows) {
  const eligible = rows.filter((r) => r[2] !== 'rejected_gate')
  const total = eligible.reduce((s, r) => s + r[6], 0)
  return eligible.map(([githubLogin, githubUserId, , , fit, weights, tickets]) => ({ githubLogin, githubUserId, fit, tickets, weights, share: total ? tickets / total : 0 }))
}

function drawState(b) {
  const rows = applicantsFor(b)
  const pool = poolFor(rows)
  const winnerLogin = b.assignedTo ?? b.payout?.recipientLogin ?? null
  const winner = pool.find((c) => c.githubLogin === winnerLogin) ?? pool[0]
  const draws = winnerLogin && pool.length
    ? [{
        drawId: uuidFor('draw:' + b.id), seed: 734019284, simulation: false, triggeredBy: 'scheduler', poolSize: pool.length, pool,
        winner: { githubLogin: winnerLogin, githubUserId: winner.githubUserId, tickets: winner.tickets },
        firstComeFallback: false, noWinnerReason: null, assignmentId: uuidFor('assignment:' + b.id), staleAt: b.assignmentStaleAt,
        ranAt: b.applicationsCloseAt ?? b.postedAt, winnerLogin,
        configSnapshot: Object.fromEntries(drawSettings().map((s) => [s.key, s.value])),
      }]
    : []
  return {
    applications: {
      total: rows.length,
      eligible: pool.length,
      refused: rows.length - pool.length,
      fitCost: { assessed: 0, totalMicro: 0, perApplicationMicro: null },
      applications: rows.map(([githubLogin, githubUserId, status, gateFailureReason, fit], i) => ({
        githubLogin, githubUserId,
        status: status === 'applied' && winnerLogin ? (githubLogin === winnerLogin ? 'won' : 'lost') : status,
        gateFailureReason, fit, difficultyMatch: fit ? 'at_level' : null, fitEvidence: null, fitConcerns: [], fitCostMicro: null, appliedAt: ago(1, 23 - i),
      })),
    },
    draws,
  }
}

function drawRun(b) {
  const pool = poolFor(applicantsFor(b.applicantCount || b.applicantBucket ? b : { ...b, applicantCount: 5 }))
  const pick = pool[2] ?? pool[0]
  return {
    drawId: uuidFor('sim:' + b.id), seed: 1928374650, simulation: true, triggeredBy: ADA, poolSize: pool.length, pool,
    winner: pick ? { githubLogin: pick.githubLogin, githubUserId: pick.githubUserId, tickets: pick.tickets } : null,
    firstComeFallback: false, noWinnerReason: pick ? null : 'No eligible applicants.', assignmentId: null, staleAt: null,
  }
}

/** The bounty the admin draw screenshots select: several applicants, two refused, one draw run. */
export const DRAW_DEMO_BOUNTY_ID = idOf('ledger-240')
