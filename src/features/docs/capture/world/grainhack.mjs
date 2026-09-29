// GrainHack: events in every phase, their issues, draws, verdicts and
// appeals, and the contributor's own assignments, applications and results.
//
// Events, by phase at the capture clock (2026-09-21):
//   GrainHack Autumn 2026      live               (Sep 14 - Sep 28)
//   GrainHack Harbor Sprint    application_period (projects applying)
//   GrainHack Ledger Week      issue_prep         (starts Sep 28)
//   GrainHack Midyear 2026     closed             (ended Sep 12, judging)
//   GrainHack Summer 2026      results_published  (appeal window open)
//   GrainHack Winter 2026      draft              (admin only)

import { ago, ahead, avatar, query } from './util.mjs'
import { personas } from './people.mjs'
import { CONFIG_DEFINITIONS } from './grainhack-config.mjs'
import { projectById, issueId } from './projects.mjs'

const MIRA = personas.contributor.login
const MIRA_ID = personas.contributor.id
const OWEN = personas.maintainer.login
const ADA = personas.admin.login
const uid = (login) => (login === MIRA ? MIRA_ID : login === OWEN ? personas.maintainer.id : `u-${login}`)

const money = (sponsor, feePct) => {
  const total = Number(sponsor)
  const fee = (total * feePct) / 100
  const net = total - fee
  const contributor = net * 0.8
  const maintainer = net * 0.2
  const f = (n) => n.toFixed(2)
  return {
    sponsor_total_usdc: f(total), platform_fee_usdc: f(fee), platform_fee_rate_pct: f(feePct),
    contributor_prize_pool: f(contributor), maintainer_prize_pool: f(maintainer), net_pool_usdc: f(net),
  }
}

export const HACKATHONS = [
  {
    id: 'hk-autumn-26', name: 'GrainHack Autumn 2026', phase: 'live',
    announced_at: ago(40), application_period_start: ago(38), application_period_end: ago(24), issue_prep_start: ago(23),
    starts_at: ago(7), ends_at: ahead(7), merge_grace_period_hours: 48, ...money(12000, 5), created_at: ago(45),
  },
  {
    id: 'hk-harbor-26', name: 'GrainHack Harbor Sprint', phase: 'application_period',
    announced_at: ago(8), application_period_start: ago(6), application_period_end: ahead(14), issue_prep_start: ahead(15),
    starts_at: ahead(29), ends_at: ahead(43), merge_grace_period_hours: 48, ...money(8000, 5), created_at: ago(10),
  },
  {
    id: 'hk-ledgerweek-26', name: 'GrainHack Ledger Week', phase: 'issue_prep',
    announced_at: ago(30), application_period_start: ago(28), application_period_end: ago(12), issue_prep_start: ago(11),
    starts_at: ahead(7), ends_at: ahead(14), merge_grace_period_hours: 24, ...money(5000, 5), created_at: ago(32),
  },
  {
    id: 'hk-midyear-26', name: 'GrainHack Midyear 2026', phase: 'closed',
    announced_at: ago(70), application_period_start: ago(68), application_period_end: ago(52), issue_prep_start: ago(51),
    starts_at: ago(23), ends_at: ago(9), merge_grace_period_hours: 48, ...money(10000, 5), created_at: ago(72),
  },
  {
    id: 'hk-summer-26', name: 'GrainHack Summer 2026', phase: 'results_published',
    announced_at: ago(95), application_period_start: ago(93), application_period_end: ago(77), issue_prep_start: ago(76),
    starts_at: ago(50), ends_at: ago(36), merge_grace_period_hours: 48, ...money(15000, 5), created_at: ago(98),
    results_published_at: ago(4),
  },
  {
    id: 'hk-winter-26', name: 'GrainHack Winter 2026', phase: 'draft',
    announced_at: null, application_period_start: null, application_period_end: null, issue_prep_start: null,
    starts_at: null, ends_at: null, merge_grace_period_hours: 48, sponsor_total_usdc: null, platform_fee_usdc: null, platform_fee_rate_pct: null,
    contributor_prize_pool: null, maintainer_prize_pool: null, net_pool_usdc: null, created_at: ago(1),
  },
]
const byId = Object.fromEntries(HACKATHONS.map((h) => [h.id, h]))
const PUBLIC_HACKATHONS = HACKATHONS.filter((h) => h.phase !== 'draft')

// --- Issues --------------------------------------------------------------------

const GI = (id, hackathon, projectId, number, title, tier, language, criteria, opts = {}) => ({
  id, hackathon, projectId, number, title, tier, language, criteria, status: 'published', reserved: false, assigned: false,
  opens: ago(1), closes: ahead(0, 18), flagged: false, ...opts,
})

export const GH_ISSUES = [
  GI('hi-ledger-224', 'hk-autumn-26', 'p-ledger', 224, 'Benchmark snapshot writes under load', 'advanced', 'Rust',
    '- A Criterion benchmark in `benches/snapshot_under_load.rs` writes snapshots while appends continue on another thread\n- p50 and p99 write latency are reported\n- A results table is added to `docs/performance.md`',
    { opens: ago(0, 20), closes: ahead(0, 6) }),
  GI('hi-quill-93', 'hk-autumn-26', 'p-quill', 93, 'Render admonitions in Markdown output', 'easy', 'TypeScript',
    '- `> [!NOTE]`, `> [!WARNING]` and `> [!TIP]` render as styled callouts\n- Each variant has a snapshot test\n- The syntax is documented in the authoring guide',
    { reserved: true, opens: ago(0, 30), closes: ahead(0, 18) }),
  GI('hi-orbit-63', 'hk-autumn-26', 'p-orbit', 63, 'Warn before signing unknown messages', 'standard', 'TypeScript',
    '- Unknown message types show a full-screen warning with the raw bytes\n- The user must type the dApp origin to continue\n- Known transaction types are unaffected',
    { assigned: true, opens: ago(5), closes: ago(3, 12) }),
  GI('hi-sieve-31', 'hk-autumn-26', 'p-sieve', 31, 'Add a filter for token transfers', 'standard', 'Go',
    '- Filter transfer instructions by mint\n- Optional min and max amount\n- Table-driven tests for each operator',
    { assigned: true, opens: ago(6), closes: ago(4, 12) }),
  GI('hi-brine-22', 'hk-autumn-26', 'p-brine', 22, 'Index module events by handle', 'standard', 'Rust',
    '- Index on (account, handle, sequence)\n- `GET /events/:account/:handle` with cursor pagination',
    { assigned: true, opens: ago(2), closes: ago(0, 2) }),
  GI('hi-anchor-140', 'hk-autumn-26', 'p-anchor', 140, 'Rate-limit anchor callbacks per account', 'advanced', 'Go',
    '- Per-account token bucket with configurable rate and burst\n- 429 responses carry `Retry-After`\n- Limits are logged with the account id',
    { opens: ahead(0, 10), closes: ahead(1, 10) }),
  // Summer: all drawn and done.
  GI('hi-quill-71', 'hk-summer-26', 'p-quill', 71, 'Link checker ignores anchors', 'easy', 'TypeScript', '- `#anchor` links are checked against headings on the target page', { assigned: true, opens: ago(52), closes: ago(51) }),
  GI('hi-anchor-116', 'hk-summer-26', 'p-anchor', 116, 'Validate memo length before submission', 'easy', 'Go', '- Memos over 28 bytes are rejected with a clear error', { assigned: true, opens: ago(52), closes: ago(51) }),
  GI('hi-tide-45', 'hk-summer-26', 'p-tide', 45, 'Typed channel events', 'standard', 'TypeScript', '- Every channel event has a discriminated union type\n- The old untyped emitter is deprecated, not removed', { assigned: true, opens: ago(50), closes: ago(49) }),
  GI('hi-ledger-201', 'hk-summer-26', 'p-ledger', 201, 'Streaming snapshot reader', 'advanced', 'Rust', '- Snapshots are read without loading the whole file\n- Memory stays under 64 MiB for a 2 GiB snapshot', { assigned: true, opens: ago(50), closes: ago(49) }),
  // Midyear: event over, judging in progress.
  GI('hi-orbit-52', 'hk-midyear-26', 'p-orbit', 52, 'Lock the wallet after inactivity', 'standard', 'TypeScript', '- Configurable timeout, default 15 minutes', { assigned: true, opens: ago(22), closes: ago(21) }),
  GI('hi-brine-17', 'hk-midyear-26', 'p-brine', 17, 'Backfill from a checkpoint', 'standard', 'Rust', '- Resume from the last committed checkpoint', { assigned: true, opens: ago(22), closes: ago(20) }),
  GI('hi-anchor-118', 'hk-midyear-26', 'p-anchor', 118, 'Configurable SEP-24 timeouts', 'easy', 'Go', '- Timeouts read from config, with defaults documented', { assigned: false, opens: ago(22), closes: ago(21) }),
]
const giById = Object.fromEntries(GH_ISSUES.map((i) => [i.id, i]))

const publicIssue = (i) => ({
  id: i.id, project_id: i.projectId, repo_full_name: projectById[i.projectId].github_full_name, issue_number: i.number, issue_title: i.title,
  difficulty_tier: i.tier, acceptance_criteria: i.criteria, reserved: i.reserved, application_window_opens_at: i.opens,
  application_window_closes_at: i.closes, assigned: i.assigned,
})

const adminIssue = (i) => ({
  id: i.id, hackathon_id: i.hackathon, hackathon_name: byId[i.hackathon].name, project_id: i.projectId, issue_number: i.number,
  org_login: projectById[i.projectId].github_full_name.split('/')[0], status: i.status, acceptance_criteria: i.criteria,
  difficulty_tier: i.tier, primary_language: i.language, flagged_for_admin: i.flagged, flagged_reason: i.flagged ? 'Assigned on GitHub outside the draw twice.' : null,
  synced_at: ago(0, 2), published_at: i.opens,
})

// --- The contributor's own GrainHack ----------------------------------------------

const ASSIGN = (id, issue, status, extra) => {
  const i = giById[issue]
  return {
    id, hackathon_id: i.hackathon, hackathon_name: byId[i.hackathon].name, hackathon_issue_id: i.id, repo_full_name: projectById[i.projectId].github_full_name,
    issue_number: i.number, github_login: MIRA, status, holds_slot: false, assigned_at: ago(3), stale_at: null, release_reason: null, abandon_recorded: false,
    qualifying_pr_number: null, ...extra,
  }
}

export const MY_ASSIGNMENTS = [
  ASSIGN('as-orbit-63', 'hi-orbit-63', 'active', { holds_slot: true, assigned_at: ago(3, 12), stale_at: ahead(1, 5) }),
  ASSIGN('as-sieve-31', 'hi-sieve-31', 'pr_submitted', { assigned_at: ago(4, 12), qualifying_pr_number: 34 }),
  ASSIGN('as-quill-71', 'hi-quill-71', 'completed', { assigned_at: ago(51), qualifying_pr_number: 75 }),
  ASSIGN('as-anchor-118', 'hi-anchor-118', 'released_voluntary', { assigned_at: ago(21), release_reason: 'Released by the contributor inside the 48-hour grace period, so no abandon was recorded.' }),
]

const APP = (id, issue, status, extra) => {
  const i = giById[issue]
  return {
    id, hackathon_id: i.hackathon, hackathon_name: byId[i.hackathon].name, hackathon_issue_id: i.id, project_id: i.projectId,
    repo_full_name: projectById[i.projectId].github_full_name, issue_number: i.number, status, gate_failure_reason: null, fit: null,
    application_window_closes_at: i.closes, created_at: ago(1), ...extra,
  }
}

export const MY_APPLICATIONS = [
  APP('ap-quill-93', 'hi-quill-93', 'applied', { created_at: ago(0, 9) }),
  APP('ap-orbit-63', 'hi-orbit-63', 'won', { fit: 'strong', created_at: ago(4, 20) }),
  APP('ap-sieve-31', 'hi-sieve-31', 'won', { fit: 'plausible', created_at: ago(5, 6) }),
  APP('ap-brine-22', 'hi-brine-22', 'lost', { fit: 'plausible', created_at: ago(1, 14) }),
  APP('ap-brine-17', 'hi-brine-17', 'rejected_gate', { gate_failure_reason: "You're holding 2 of 2 assignment slots. Submit a PR to free one.", created_at: ago(21, 4) }),
  APP('ap-anchor-118', 'hi-anchor-118', 'withdrawn', { created_at: ago(21, 8) }),
]

// --- Verdicts -----------------------------------------------------------------------

const DIFF = (files, added, removed, tests, extra = {}) => ({
  files_changed: files, lines_added: added, lines_removed: removed, generated_lines: 0, lockfile_lines: 0, test_lines: tests,
  tests_added: tests > 0, touches_core_paths: extra.core ?? false, meaningful_lines: added + removed - tests / 2, docs_only: extra.docs ?? false,
})

const VERDICT = (id, hackathon, issue, login, pr, bucket, payload, extra = {}) => {
  const i = giById[issue]
  const p = projectById[i.projectId]
  const units = { rejected: 0, accepted: 1, substantial: 3, exceptional: 5 }[bucket]
  return {
    id, hackathon_id: hackathon, hackathon_issue_id: i.id, project_id: i.projectId, repo_full_name: p.github_full_name, pr_number: pr,
    issue_number: i.number, github_login: login, prefilter_status: 'passed', prefilter_reason: null, diff_stats: extra.diff ?? DIFF(4, 120, 18, 40),
    duplicate_of_verdict_id: null, duplicate_similarity: null, duplicate_flagged: false,
    judge_bucket: bucket, judge_confidence: payload.confidence, judge_payload: { ...payload, bucket }, judge_model: 'claude-sonnet-4-6',
    cross_check_bucket: extra.cross ?? bucket, cross_check_payload: extra.crossPayload ?? { ...payload, bucket: extra.cross ?? bucket, reasoning: 'Independent read agrees with the criteria assessment.' },
    cross_check_model: 'gpt-oss-120b', escalation_bucket: null, escalation_payload: null,
    needs_human_review: extra.review ?? false, review_reason: extra.review ? 'Judge and cross-check disagree on the bucket.' : null,
    final_bucket: extra.final ?? bucket, final_source: extra.finalSource ?? 'judge', overridden_by: extra.overriddenBy ?? null, override_reason: extra.overrideReason ?? null, overridden_at: extra.overriddenBy ? ago(5) : null,
    units: extra.final ? { rejected: 0, accepted: 1, substantial: 3, exceptional: 5 }[extra.final] : units, payout_amount: extra.payout ?? null,
    created_at: ago(8), updated_at: extra.updated ?? ago(4), merge_commit_sha: extra.sha ?? '9f2c4e1a7b3d5f6081a2c3e4d5f60718293a4b5c',
  }
}

export const VERDICTS = [
  VERDICT('vd-quill-75', 'hk-summer-26', 'hi-quill-71', MIRA, 75, 'substantial', {
    criteria: [
      { text: '`#anchor` links are checked against headings on the target page', met: true, evidence: 'Headings are slugged and collected per page in src/links/anchors.ts:14-41, and each anchor is looked up in src/links/check.ts:88-102.' },
      { text: 'Missing anchors fail the build with the page and anchor named', met: true, evidence: 'The error names both in src/links/check.ts:110, covered by test/links/anchors.test.ts:22-58.' },
      { text: 'Anchors inside code blocks are ignored', met: true, evidence: 'Code fences are skipped in src/links/anchors.ts:52-60.' },
    ],
    criteria_met: 3, criteria_total: 3, scope: 'in_scope', substance: 'core_logic', confidence: 'high', concerns: [],
    reasoning: 'Implements anchor checking in the link checker core, with tests for present, missing and code-fenced anchors. Clean, in scope, and more than a routine change.',
  }, { payout: '412.50', diff: DIFF(6, 214, 31, 96, { core: true }), sha: '3b7e9d21c04f5a6b8c9d0e1f2a3b4c5d6e7f8091' }),
  VERDICT('vd-anchor-122', 'hk-summer-26', 'hi-anchor-116', MIRA, 122, 'accepted', {
    criteria: [
      { text: 'Memos over 28 bytes are rejected with a clear error', met: true, evidence: 'Length check added in internal/memo/validate.go:17-24 with the byte count in the message.' },
      { text: 'Multi-byte characters are counted in bytes, not runes', met: false, evidence: 'The check in internal/memo/validate.go:19 uses utf8.RuneCountInString, so a 20-character memo with emoji passes at 34 bytes.' },
    ],
    criteria_met: 1, criteria_total: 2, scope: 'in_scope', substance: 'routine', confidence: 'medium', concerns: ['Counts runes rather than bytes, which the protocol limit is defined in.'],
    reasoning: 'The validation exists and is tested, but one criterion is not met: the limit is applied to runes rather than bytes.',
  }, { payout: '137.50', diff: DIFF(3, 46, 4, 22) }),
  VERDICT('vd-tide-47', 'hk-summer-26', 'hi-tide-45', MIRA, 47, 'rejected', {
    criteria: [
      { text: 'Every channel event has a discriminated union type', met: false, evidence: 'Only 3 of 7 events are typed; src/events/types.ts:1-38 leaves ChannelClosed, Settled, Disputed and Refunded as `any`.' },
      { text: 'The old untyped emitter is deprecated, not removed', met: true, evidence: 'Marked @deprecated in src/events/emitter.ts:9.' },
    ],
    criteria_met: 1, criteria_total: 2, scope: 'partial', substance: 'routine', confidence: 'high', concerns: ['Most events remain untyped.'],
    reasoning: 'Partial implementation: the core requirement, typing every event, is not met.',
  }, { diff: DIFF(2, 58, 6, 0) }),
  // Other contributors' verdicts, for the admin view.
  VERDICT('vd-ledger-209', 'hk-summer-26', 'hi-ledger-201', 'priya-kern', 209, 'exceptional', {
    criteria: [
      { text: 'Snapshots are read without loading the whole file', met: true, evidence: 'Streaming reader in src/snapshot/reader.rs:40-155 uses a fixed 64 KiB buffer.' },
      { text: 'Memory stays under 64 MiB for a 2 GiB snapshot', met: true, evidence: 'Benchmark in benches/snapshot_read.rs:12-60 records a 9.8 MiB peak.' },
    ],
    criteria_met: 2, criteria_total: 2, scope: 'in_scope', substance: 'core_logic', confidence: 'high', concerns: [],
    reasoning: 'Rewrites the reader to stream, with a benchmark proving the memory bound. Exceptional depth for the tier.',
  }, { payout: '687.50', diff: DIFF(9, 412, 187, 140, { core: true }) }),
  VERDICT('vd-anchor-119', 'hk-summer-26', 'hi-anchor-116', 'dara-loop', 119, 'accepted', {
    criteria: [{ text: 'Memos over 28 bytes are rejected with a clear error', met: true, evidence: 'internal/memo/validate.go:12-20' }],
    criteria_met: 1, criteria_total: 1, scope: 'in_scope', substance: 'routine', confidence: 'low', concerns: ['Duplicate of an earlier submission?'],
    reasoning: 'Meets the single criterion; low confidence because it closely resembles another PR.',
  }, { cross: 'rejected', review: true, final: 'accepted', finalSource: 'human_override', overriddenBy: ADA, overrideReason: 'Submitted independently two hours before the similar PR; commit history confirms it.', payout: '137.50' }),
]
const verdictById = Object.fromEntries(VERDICTS.map((v) => [v.id, v]))

const APPEAL = (id, verdict, login, reason, status, extra = {}) => ({
  id, verdict_id: verdict, github_login: login, reason, status, decision_reason: extra.decision ?? null, decided_bucket: extra.bucket ?? null,
  decided_at: status === 'pending' ? null : ago(1), created_at: extra.created ?? ago(2),
})

export const APPEALS = [
  APPEAL('apl-anchor-122', 'vd-anchor-122', MIRA, 'The protocol doc I followed (linked in the issue) defines the memo limit in characters for text memos. I have added a byte check as well in a follow-up commit; please re-review against both.', 'pending', { created: ago(1, 5) }),
  APPEAL('apl-tide-47', 'vd-tide-47', MIRA, 'The four untyped events are emitted by a module the issue said not to touch.', 'rejected', {
    decision: 'The issue lists all seven events in its acceptance criteria and does not exclude that module. The original result stands.', created: ago(3),
  }),
  APPEAL('apl-ledger-209', 'vd-ledger-209', 'tomas-rivet', 'My PR #207 implemented the same streaming approach first.', 'rejected', { decision: 'PR #207 was a batching change, not a streaming reader. No overlap found.', created: ago(3, 8) }),
]

const appealWindow = { days: 7, opens_at: ago(4), closes_at: ahead(3), open: true, closed_out_at: null }

// --- Draws ----------------------------------------------------------------------------

const CAND = (login, fit, weights, newcomer = false) => ({
  user_id: uid(login), github_login: login, fit, is_newcomer: newcomer, weights,
  tickets: Object.values(weights).reduce((p, w) => p * w, 1),
})

const DRAW = (id, issue, seed, pool, winner, created, extra = {}) => {
  const i = giById[issue]
  return {
    id, hackathon_issue_id: i.id, repo_full_name: projectById[i.projectId].github_full_name, issue_number: i.number, seed, pool, pool_size: pool.length,
    winner_user_id: winner ? uid(winner) : null, winner_login: winner, used_weak_pool: false, reservation_applied: extra.reserved ?? false,
    reservation_fell_back: false, first_come_fallback: false, no_winner_reason: null, is_simulation: extra.simulation ?? false, created_at: created,
  }
}

export const DRAWS = [
  DRAW('dr-orbit-63', 'hi-orbit-63', 918273645, [
    CAND(MIRA, 'strong', { fit_strong: 2, first_ever_application: 1.5 }),
    CAND('wren-codes', 'plausible', { fit_plausible: 1, prior_completion: 1.5 }),
    CAND('ike-nwosu', 'plausible', { fit_plausible: 1, difficulty_above: 0.5 }),
    CAND('zoe-lattice', 'weak', { fit_weak: 0.25 }),
  ], MIRA, ago(3, 12)),
  DRAW('dr-sieve-31', 'hi-sieve-31', 552019384, [
    CAND(MIRA, 'plausible', { fit_plausible: 1, prior_completion: 1.5 }),
    CAND('mateo-rook', 'plausible', { fit_plausible: 1 }),
    CAND('elif-stack', 'strong', { fit_strong: 2, per_abandon: 0.5 }),
  ], MIRA, ago(4, 12)),
  DRAW('dr-brine-22', 'hi-brine-22', 740011923, [
    CAND('ravi-forge', 'strong', { fit_strong: 2, prior_completion: 1.5 }),
    CAND(MIRA, 'plausible', { fit_plausible: 1, prior_completion: 1.5 }),
    CAND('hana-grid', 'plausible', { fit_plausible: 1 }),
    CAND('arun-patch', 'plausible', { fit_plausible: 1, first_ever_application: 1.5 }, true),
    CAND('yuki-tern', 'weak', { fit_weak: 0.25, first_ever_application: 1.5 }, true),
  ], 'ravi-forge', ago(0, 2)),
  DRAW('dr-quill-71', 'hi-quill-71', 118204433, [
    CAND(MIRA, 'strong', { fit_strong: 2, first_ever_application: 1.5 }, true),
    CAND('ines-byte', 'plausible', { fit_plausible: 1, first_ever_application: 1.5 }, true),
    CAND('tomas-rivet', 'plausible', { fit_plausible: 1, first_ever_application: 1.5 }, true),
  ], MIRA, ago(51), { reserved: true }),
  DRAW('dr-ledger-201', 'hi-ledger-201', 402291876, [
    CAND('priya-kern', 'strong', { fit_strong: 2, prior_completion: 1.5 }),
    CAND('jun-okafor', 'strong', { fit_strong: 2, prior_completion: 2.25 }),
    CAND('tomas-rivet', 'plausible', { fit_plausible: 1, difficulty_above: 0.5 }),
  ], 'priya-kern', ago(49)),
  DRAW('dr-anchor-116', 'hi-anchor-116', 330912457, [
    CAND(MIRA, 'plausible', { fit_plausible: 1, prior_completion: 1.5 }),
    CAND('dara-loop', 'plausible', { fit_plausible: 1 }),
  ], MIRA, ago(51)),
  DRAW('dr-tide-45', 'hi-tide-45', 671104532, [
    CAND(MIRA, 'plausible', { fit_plausible: 1 }),
    CAND('sol-mendes', 'weak', { fit_weak: 0.25 }),
  ], MIRA, ago(49)),
  DRAW('dr-brine-17', 'hi-brine-17', 290017734, [
    CAND('ravi-forge', 'strong', { fit_strong: 2 }),
    CAND('bram-oster', 'plausible', { fit_plausible: 1 }),
  ], 'ravi-forge', ago(20)),
  DRAW('dr-sim-ledger-224', 'hi-ledger-224', 19283746, [
    CAND('priya-kern', 'strong', { fit_strong: 2, prior_completion: 2.25 }),
    CAND('arun-patch', 'plausible', { fit_plausible: 1, first_ever_application: 1.5 }, true),
    CAND('jun-okafor', 'strong', { fit_strong: 2, prior_completion: 2.25, per_abandon: 0.5 }),
  ], 'priya-kern', ago(0, 3), { simulation: true }),
]

const drawResult = (d) => ({
  draw_id: `${d.id}-sim-${Date.now() % 1000}`, hackathon_issue_id: d.hackathon_issue_id, seed: d.seed + 17, pool: d.pool, winner_user_id: d.winner_user_id,
  winner_login: d.winner_login ?? undefined, used_weak_pool: false, reservation_applied: d.reservation_applied, reservation_fell_back: false,
  first_come_fallback: false, is_simulation: true,
})

// --- Project applications (maintainers applying to take part) ----------------------

const PAPP = (id, hackathon, projectId, status, desc, goal, count, contact, extra = {}) => ({
  id, hackathon_id: hackathon, hackathon_name: byId[hackathon].name, project_id: projectId, project_full_name: projectById[projectId].github_full_name,
  short_description: desc, goal, expected_issue_count: count, maintainer_contact: contact, status, review_reason: extra.reason ?? null,
  reviewed_at: status === 'pending' ? null : ago(3), created_at: extra.created ?? ago(4),
})

export const PROJECT_APPLICATIONS = [
  PAPP('pa-quill-harbor', 'hk-harbor-26', 'p-quill', 'pending', 'Docs generator that tests every code example.', 'Ship tabbed examples and admonitions, and clear our docs-bug backlog.', 8, 'telegram: @hana_grid', { created: ago(5) }),
  PAPP('pa-orbit-harbor', 'hk-harbor-26', 'p-orbit', 'pending', 'Auditable browser wallet for Aptos.', 'Harden signing prompts before our 1.0 security review.', 6, 'zoe@saltmarsh.example', { created: ago(3, 6) }),
  PAPP('pa-perch-harbor', 'hk-harbor-26', 'p-perch', 'pending', 'Analytics notebooks for ledger health.', 'Add five new network-health charts and an HTML export.', 4, 'discord: elif.stack', { created: ago(1, 2) }),
  PAPP('pa-ledger-harbor', 'hk-harbor-26', 'p-ledger', 'accepted', 'Append-only ledger for payment channels.', 'Performance work on snapshots and compaction.', 10, 'owen@tidewater.example', { created: ago(6) }),
  PAPP('pa-sieve-harbor', 'hk-harbor-26', 'p-sieve', 'more_info_requested', 'Stream filters for on-chain events.', 'Filters for the new token program.', 5, 'mateo@kestrel.example', { reason: 'Please link the issues you plan to label, so we can check they are sized for the event.', created: ago(5, 4) }),
]

const SIGNALS = {
  'pa-quill-harbor': { repo_created_at: '2025-10-21T10:00:00Z', had: true, commits: 184, contributors: 27, prior: ['GrainHack Summer 2026'], review: 11.5 },
  'pa-orbit-harbor': { repo_created_at: '2026-01-12T10:00:00Z', had: true, commits: 96, contributors: 19, prior: [], review: 26.0 },
  'pa-perch-harbor': { repo_created_at: '2026-03-10T10:00:00Z', had: true, commits: 41, contributors: 9, prior: [], review: null },
}
const signalsFor = (id) => {
  const s = SIGNALS[id] ?? SIGNALS['pa-quill-harbor']
  return {
    repo_created_at: { computed: true, value: s.repo_created_at },
    had_commits_before_announced: { computed: true, value: s.had },
    commit_activity_90d: { computed: true, value: s.commits },
    distinct_contributors: { computed: true, value: s.contributors },
    prior_grainhack_participation: { computed: true, value: s.prior },
    median_time_to_first_review_hours: s.review == null ? { computed: false, note: 'Too few reviewed PRs in the last 90 days to compute a median.' } : { computed: true, value: s.review },
    prior_flagged_associations: { computed: true, value: [] },
  }
}

// --- Config, audit and rules -----------------------------------------------------------

const OVERRIDES = {
  'hk-autumn-26': { slots_per_contributor: '2', application_window_hours: '18', reserved_pct_easy: '60', stale_assignment_days: '4' },
  'hk-summer-26': { appeal_window_days: '7', payout_floor: '75', ai_judging_enabled: 'true', judging_shadow_mode: 'false' },
  'hk-harbor-26': { max_issues_per_org: '12', min_account_age_days: '60' },
}
const GLOBAL_OVERRIDES = { platform_fee_pct: '5', ai_fit_assessment_enabled: 'false', ai_judging_enabled: 'true', judging_shadow_mode: 'false', model_cross_check: 'gpt-oss-120b' }
const UNENFORCED = new Set(['unclaimed_sweep_days', 'unclaimed_sweep_destination', 'empty_chain_pool_disposition', 'contract_upgrade_policy'])

function settingsFor(hackathonId) {
  const over = hackathonId ? OVERRIDES[hackathonId] ?? {} : {}
  return CONFIG_DEFINITIONS.map((d) => {
    const base = GLOBAL_OVERRIDES[d.key] ?? d.default
    const value = over[d.key] ?? base
    return { ...d, default: hackathonId ? base : d.default, value, overridden: hackathonId ? d.key in over : d.key in GLOBAL_OVERRIDES }
  })
}

const AUDIT = [
  ['hk-autumn-26', 'reserved_pct_easy', '50', '60', 6],
  ['hk-autumn-26', 'application_window_hours', '24', '18', 8],
  ['hk-autumn-26', 'stale_assignment_days', '5', '4', 8],
  ['hk-summer-26', 'payout_floor', '50', '75', 40],
  ['hk-summer-26', 'judging_shadow_mode', 'true', 'false', 5],
  ['hk-harbor-26', 'min_account_age_days', '90', '60', 6],
  ['hk-harbor-26', 'max_issues_per_org', '50', '12', 7],
  [null, 'platform_fee_pct', '0', '5', 60],
  [null, 'model_cross_check', '', 'gpt-oss-120b', 30],
  [null, 'ai_judging_enabled', 'false', 'true', 12],
].map(([h, key, oldV, newV, d], i) => ({
  id: `audit-${i + 1}`, hackathon_id: h, key, old_value: oldV, new_value: newV, actor_user_id: personas.admin.id, actor_login: ADA, created_at: ago(d, i),
}))

function rules(req) {
  const id = query(req).get('hackathon_id')
  const h = id ? byId[id] : null
  const values = settingsFor(h?.id ?? null)
  const frozen = h && ['live', 'closed', 'results_published', 'settled'].includes(h.phase)
  return {
    source: !h ? 'global_defaults' : frozen ? 'snapshot' : 'not_yet_frozen',
    hackathon_id: h?.id ?? null,
    hackathon_name: h?.name ?? '',
    phase: h?.phase ?? '',
    rules: values.map((s) => ({
      key: s.key, value: UNENFORCED.has(s.key) ? '' : s.value, type: s.type, section: s.section, description: s.description,
      ...(s.valid_range ? { valid_range: s.valid_range } : {}), active: s.active,
      ...(UNENFORCED.has(s.key) ? { unenforced: 'fixed in the escrow contract at deployment; no escrow is deployed yet, so there is no value to publish' } : {}),
    })),
    section_order: ['Hackathon setup', 'Issue intake', 'Contributor slots and caps', 'Slot-freeing definition', 'Hard gates', 'Application window and draw', 'Newcomer reservation', 'Draw weights', 'Judging and payout', 'Maintainer pool', 'Platform fee', 'Founding pool', 'Chains', 'Models'],
    structural: {
      prior_completion_cap: 2,
      prior_completion_cap_note: 'Prior completions raise your tickets, but only for your first two completed GrainHack issues. It is a constant in the code, not a setting, so it cannot be raised mid-event: it is what stops accumulated wins from outranking capability for the issue in front of you.',
    },
  }
}

// --- Admin view of one event --------------------------------------------------------------

const NEXT = { draft: 'application_period', application_period: 'issue_prep', issue_prep: 'live', live: 'closed', closed: 'results_published', results_published: 'settled' }
const BLOCKING = {
  'hk-winter-26': [{ field: 'announced_at', message: 'Set an announcement date before opening applications.' }, { field: 'contributor_prize_pool', message: 'Set the sponsor total so the prize pools can be published.' }],
  'hk-harbor-26': [{ field: 'accepted_projects', message: '3 project applications are still pending review.' }],
  'hk-ledgerweek-26': [{ field: 'issues', message: '2 issues are missing acceptance criteria.' }],
  'hk-autumn-26': [{ field: 'ends_at', message: 'The event ends in 7 days; it can be closed after that.' }],
  'hk-midyear-26': [{ field: 'verdicts', message: '4 verdicts still need human review.' }],
  'hk-summer-26': [{ field: 'appeals', message: '1 appeal is still pending.' }, { field: 'appeal_window', message: 'The appeal window closes in 3 days.' }],
}

function verdictStats(list) {
  const both = list.filter((v) => v.judge_bucket && v.cross_check_bucket)
  const dis = both.filter((v) => v.judge_bucket !== v.cross_check_bucket)
  const pairs = {}
  for (const v of dis) pairs[`${v.judge_bucket} -> ${v.cross_check_bucket}`] = (pairs[`${v.judge_bucket} -> ${v.cross_check_bucket}`] ?? 0) + 1
  return {
    total: list.length, both_judged: both.length, disagreements: dis.length, disagreement_rate: both.length ? (100 * dis.length) / both.length : null,
    expected_range_low: 5, expected_range_high: 15, needs_review: list.filter((v) => v.needs_human_review).length,
    overridden: list.filter((v) => v.final_source === 'human_override').length, prefiltered_out: list.filter((v) => v.prefilter_status === 'rejected').length,
    cross_checked: both.length, injection_flagged: 0, disagreement_by_pair: pairs,
  }
}

function adminAssignments(hid) {
  return DRAWS.filter((d) => !d.is_simulation && d.winner_login && giById[d.hackathon_issue_id].hackathon === hid).map((d) => {
    const i = giById[d.hackathon_issue_id]
    const mine = MY_ASSIGNMENTS.find((a) => a.hackathon_issue_id === i.id)
    return {
      id: mine?.id ?? `as-${i.id}`, hackathon_issue_id: i.id, repo_full_name: d.repo_full_name, issue_number: d.issue_number, github_login: d.winner_login,
      org_login: projectById[i.projectId].github_full_name.split('/')[0], status: mine?.status ?? 'completed', holds_slot: mine?.holds_slot ?? false,
      assigned_at: d.created_at, stale_at: mine?.stale_at ?? null, qualifying_pr_number: mine?.qualifying_pr_number ?? null, release_reason: null, abandon_recorded: false,
      prior_association: { shared_org: false, merged_prs_by_maintainer: 1, frequent_merge_relation: false, prior_grainhack_co_occurrence: 0, accounts_created_within_7_days: false, score: 0.1 },
    }
  })
}

// --- The API map ----------------------------------------------------------------------------

export function grainhackApi(personaKey) {
  const api = {
    '/hackathons': { hackathons: PUBLIC_HACKATHONS },
    '/grainhack/rules': rules,
    '/hackathon-assignments/me': { assignments: personaKey === 'contributor' ? MY_ASSIGNMENTS : [] },
    '/hackathon-issue-applications/me': { applications: personaKey === 'contributor' ? MY_APPLICATIONS : [] },
    '/grainhack/my-verdicts': {
      verdicts: personaKey === 'contributor'
        ? VERDICTS.filter((v) => v.github_login === MIRA).map((v) => ({ verdict: v, phase: byId[v.hackathon_id].phase, ...(APPEALS.find((a) => a.verdict_id === v.id) ? { appeal: APPEALS.find((a) => a.verdict_id === v.id) } : {}) }))
        : [],
    },
    '/hackathon-applications/me': { applications: personaKey === 'maintainer' ? PROJECT_APPLICATIONS.filter((a) => projectById[a.project_id].owner === 'maintainer') : [] },
    '/admin/hackathons': { hackathons: HACKATHONS },
    'POST /admin/hackathons': { id: 'hk-new' },
    '/admin/hackathon-config': (req) => ({ settings: settingsFor(query(req).get('hackathon_id')) }),
    'PUT /admin/hackathon-config': { ok: true },
    'POST /admin/hackathon-config/reset': { ok: true },
    '/admin/hackathon-config/audit': (req) => {
      const h = query(req).get('hackathon_id')
      return { entries: AUDIT.filter((e) => (h ? e.hackathon_id === h : true)) }
    },
  }
  for (const h of HACKATHONS) {
    if (h.phase !== 'draft') {
      api[`/hackathons/${h.id}`] = h
      api[`/hackathons/${h.id}/issues`] = { issues: GH_ISSUES.filter((i) => i.hackathon === h.id && i.status === 'published').map(publicIssue) }
    }
    api[`/admin/hackathons/${h.id}`] = { hackathon: h, next_phase: NEXT[h.phase] ?? '', blocking_reasons: BLOCKING[h.id] ?? [] }
    api[`PUT /admin/hackathons/${h.id}`] = { ok: true }
    api[`POST /admin/hackathons/${h.id}/transition`] = { ok: true }
    api[`/admin/hackathons/${h.id}/applications`] = (req) => {
      const status = query(req).get('status') ?? 'pending'
      return { applications: PROJECT_APPLICATIONS.filter((a) => a.hackathon_id === h.id && a.status === status) }
    }
    api[`/admin/hackathons/${h.id}/issues`] = (req) => {
      const q = query(req)
      return { issues: GH_ISSUES.filter((i) => i.hackathon === h.id && (!q.get('status') || i.status === q.get('status')) && (!q.get('flagged') || i.flagged)).map(adminIssue) }
    }
    api[`/admin/hackathons/${h.id}/draws`] = (req) => {
      const sims = query(req).get('include_simulations') === 'true'
      return { draws: DRAWS.filter((d) => giById[d.hackathon_issue_id].hackathon === h.id && (sims || !d.is_simulation)) }
    }
    api[`/admin/hackathons/${h.id}/assignments`] = { assignments: adminAssignments(h.id) }
    api[`/admin/hackathons/${h.id}/verdicts`] = (req) => {
      const q = query(req)
      const status = q.get('status')
      const all = VERDICTS.filter((v) => v.hackathon_id === h.id)
      const list = all.filter((v) => (!status || (status === 'needs_review' ? v.needs_human_review : status === 'overridden' ? v.final_source === 'human_override' : true)) && (!q.get('bucket') || v.final_bucket === q.get('bucket')))
      return { verdicts: list, shadow_mode: false, stats: all.length ? verdictStats(all) : null }
    }
    api[`/admin/hackathons/${h.id}/appeals`] = (req) => {
      const status = query(req).get('status')
      const list = APPEALS.filter((a) => verdictById[a.verdict_id].hackathon_id === h.id && (!status || a.status === status)).map((a) => ({ ...a, verdict: verdictById[a.verdict_id] }))
      return { appeals: list, appeal_window: h.phase === 'results_published' ? appealWindow : { days: 7, opens_at: null, closes_at: null, open: false, closed_out_at: null } }
    }
  }
  for (const a of PROJECT_APPLICATIONS) {
    api[`/admin/hackathons/applications/${a.id}/signals`] = signalsFor(a.id)
    for (const action of ['accept', 'reject', 'request-more-info']) api[`POST /admin/hackathons/applications/${a.id}/${action}`] = { ok: true }
  }
  for (const v of VERDICTS) {
    api[`/admin/hackathon-verdicts/${v.id}`] = { verdict: v, shadow_mode: false }
    api[`POST /admin/hackathon-verdicts/${v.id}/override`] = { ok: true, final_bucket: v.final_bucket }
    api[`/grainhack/verdicts/${v.id}/appeal-window`] = appealWindow
    api[`POST /grainhack/verdicts/${v.id}/appeal`] = { id: `apl-new-${v.id}` }
  }
  for (const a of APPEALS) api[`POST /admin/hackathon-appeals/${a.id}/decide`] = { ok: true }
  for (const d of DRAWS) api[`POST /admin/hackathon-issues/${d.hackathon_issue_id}/simulate-draw`] = drawResult(d)
  for (const i of GH_ISSUES) {
    const p = projectById[i.projectId]
    api[`POST /hackathon-issues/${i.id}/apply`] = { id: `ap-new-${i.id}`, status: 'applied' }
    const mine = personaKey === 'contributor' ? MY_APPLICATIONS.find((a) => a.hackathon_issue_id === i.id) ?? null : null
    // The contributor-facing lookup behind the issue page's apply panel.
    api[`/projects/${i.projectId}/grainhack/${i.number}`] = {
      issue: {
        id: i.id, hackathon_id: i.hackathon, hackathon_name: byId[i.hackathon].name, project_id: i.projectId, issue_number: i.number, status: i.status,
        acceptance_criteria: i.criteria, difficulty_tier: i.tier, primary_language: i.language, reserved: i.reserved,
        application_window_opens_at: i.opens, application_window_closes_at: i.closes,
      },
      applicant_count: null, applicant_bucket: i.id === 'hi-quill-93' ? 'many' : 'few', applicant_visibility: 'bucketed', my_application: mine,
    }
    // The maintainer/admin shape, for the GrainHack fields panel.
    if (p.owner === personaKey || personaKey === 'admin') {
      api[`/projects/${i.projectId}/hackathon-issues/${i.number}`] = adminIssue(i)
      api[`PUT /projects/${i.projectId}/hackathon-issues/${i.number}`] = adminIssue(i)
    }
  }
  for (const pid of Object.keys(projectById)) {
    api[`/projects/${pid}/hackathon-issues`] = { issues: GH_ISSUES.filter((i) => i.projectId === pid).map(adminIssue) }
  }
  for (const a of MY_ASSIGNMENTS) api[`POST /hackathon-assignments/${a.id}/release`] = { ok: true, abandon_recorded: false }
  for (const h of PUBLIC_HACKATHONS) api[`POST /hackathons/${h.id}/applications`] = { application_ids: ['pa-new-1'] }
  return api
}

/** The GrainHack issues that exist, as [projectId, number] - every other issue answers 404 not_a_hackathon_issue. */
export const GRAINHACK_ISSUE_KEYS = GH_ISSUES.map((i) => [i.projectId, i.number])
export { issueId }
