// Extra admin data for the docs screenshots in shots/admins.mjs, layered on
// top of world('admin'). Nothing else imports it, so the contributor and
// maintainer screens are unchanged.
//
//   const W = world('admin')
//   openPage(browser, { ...W, api: { ...W.api, ...extraAdminApi(W.api) } })
//
// What it adds:
//   - Ecosystem logos that are real images (the world's logos are generated
//     avatars drawn from the URL path, so every card showed the letter "E"),
//     and one ecosystem (Aptos) with no logo, for the letter fallback.
//   - A bounty-draw weight overridden by ada-admin.
//   - Two more real draws on GrainHack Autumn 2026, one newcomer-reserved and
//     one from a weak pool, and a re-run that keeps the draw's own seed.
//   - On GrainHack Summer 2026: a verdict that needs review and has not been
//     overridden yet, and a pending appeal against a rejected verdict.
//   - Phase transitions in the audit trail, and the trail sorted newest first.
//   - The draft event (GrainHack Winter 2026) blocked by exactly what the server
//     checks before Application period: the announcement and application dates.

import { ago } from './util.mjs'
import { personas } from './people.mjs'
import { projectById } from './projects.mjs'
import { drawSettings } from './bounties.mjs'
import { DRAWS, VERDICTS, APPEALS, HACKATHONS } from './grainhack.mjs'

const ADA = personas.admin

// --- Ecosystem logos -------------------------------------------------------------------

const svg = (body) => 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${body}</svg>`).toString('base64')

const LOGOS = {
  // Abstract marks, not any real project's logo.
  'eco-solana': svg('<rect width="96" height="96" fill="#1f1a2e"/><path d="M22 30h44l8-8H30zM22 52h44l8-8H30zM22 74h44l8-8H30z" fill="#c9983a"/>'),
  'eco-stellar': svg('<rect width="96" height="96" fill="#0f2a3a"/><circle cx="48" cy="48" r="24" fill="none" stroke="#e8dfd0" stroke-width="6"/><path d="M16 60 80 36" stroke="#e8dfd0" stroke-width="6" stroke-linecap="round"/>'),
  'eco-aptos': null,
  'eco-lumen': svg('<rect width="96" height="96" fill="#3a2f1c"/><circle cx="48" cy="48" r="14" fill="#f2c14e"/><g stroke="#f2c14e" stroke-width="5" stroke-linecap="round"><path d="M48 14v10M48 72v10M14 48h10M72 48h10M24 24l7 7M65 65l7 7M24 72l7-7M65 31l7-7"/></g>'),
}

/** The small logo the Add Ecosystem shot uploads, as a PNG. */
export const DEMO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#2d2820"/><path d="M34 88 64 32l30 56z" fill="none" stroke="#c9983a" stroke-width="10" stroke-linejoin="round"/><circle cx="64" cy="72" r="9" fill="#e8c571"/></svg>`

const withLogo = (e) => (e && e.id in LOGOS ? { ...e, logo_url: LOGOS[e.id] } : e)

// --- Bounty draw settings -----------------------------------------------------------------

const drawSettingsWithWeight = () =>
  drawSettings().map((s) =>
    s.key === 'weight_first_ever_application' ? { ...s, value: '2.0', overridden: true, updatedAt: ago(2), updatedBy: ADA.login } : s,
  )

// --- GrainHack draws ----------------------------------------------------------------------

const uid = (login) => `u-${login}`
const CAND = (login, fit, weights, newcomer = false) => ({
  user_id: uid(login), github_login: login, fit, is_newcomer: newcomer, weights,
  tickets: Object.values(weights).reduce((p, w) => p * w, 1),
})
const repo = (pid) => projectById[pid].github_full_name

const EXTRA_AUTUMN_DRAWS = [
  {
    id: 'dr-quill-90', hackathon_issue_id: 'hi-quill-90', repo_full_name: repo('p-quill'), issue_number: 90, seed: 603318275,
    pool: [
      CAND('noor-writes', 'plausible', { fit_plausible: 1, first_ever_application: 1.5 }, true),
      CAND('elif-stack', 'strong', { fit_strong: 2, first_ever_application: 1.5 }, true),
    ],
    pool_size: 2, winner_user_id: uid('elif-stack'), winner_login: 'elif-stack', used_weak_pool: false, reservation_applied: true,
    reservation_fell_back: false, first_come_fallback: false, no_winner_reason: null, is_simulation: false, created_at: ago(5, 3),
  },
  {
    id: 'dr-anchor-133', hackathon_issue_id: 'hi-anchor-133', repo_full_name: repo('p-anchor'), issue_number: 133, seed: 881042967,
    pool: [
      CAND('bram-oster', 'weak', { fit_weak: 0.25 }),
      CAND('hana-grid', 'weak', { fit_weak: 0.25, difficulty_above: 0.5 }),
    ],
    pool_size: 2, winner_user_id: uid('bram-oster'), winner_login: 'bram-oster', used_weak_pool: true, reservation_applied: false,
    reservation_fell_back: false, first_come_fallback: false, no_winner_reason: null, is_simulation: false, created_at: ago(6, 1),
  },
]

/** A re-run of a stored draw: same seed, same pool, nobody assigned. */
const rerun = (d) => (req) => {
  let seed = d.seed
  try {
    seed = JSON.parse(req.postData() || '{}').seed ?? d.seed
  } catch {}
  return {
    draw_id: `${d.id}-sim`, hackathon_issue_id: d.hackathon_issue_id, seed, pool: d.pool, winner_user_id: d.winner_user_id,
    winner_login: d.winner_login ?? undefined, used_weak_pool: d.used_weak_pool, reservation_applied: d.reservation_applied,
    reservation_fell_back: false, first_come_fallback: false, is_simulation: true,
  }
}

// --- GrainHack verdicts and appeals -----------------------------------------------------------

const DIFF = (files, added, removed, tests, extra = {}) => ({
  files_changed: files, lines_added: added, lines_removed: removed, generated_lines: 0, lockfile_lines: 0, test_lines: tests,
  tests_added: tests > 0, touches_core_paths: extra.core ?? false, meaningful_lines: added + removed - tests / 2, docs_only: false,
})

const base = VERDICTS.find((v) => v.id === 'vd-quill-75')

// The judge missed a test file; the cross-check found it. Needs review, not overridden yet.
const VD_QUILL_78 = {
  ...base,
  id: 'vd-quill-78', hackathon_issue_id: 'hi-quill-71', project_id: 'p-quill', repo_full_name: repo('p-quill'), pr_number: 78, issue_number: 71,
  github_login: 'ines-byte', diff_stats: DIFF(5, 168, 22, 88, { core: true }),
  judge_bucket: 'accepted', judge_confidence: 'medium',
  judge_payload: {
    bucket: 'accepted', confidence: 'medium', scope: 'in_scope', substance: 'core_logic', criteria_met: 1, criteria_total: 2,
    criteria: [
      { text: '`#anchor` links are checked against headings on the target page', met: true, evidence: 'Anchors are resolved against collected headings in src/links/anchors.ts:18-47.' },
      { text: 'Missing anchors fail the build with the page and anchor named', met: false, evidence: 'No test covers a missing anchor; test/links/anchors.test.ts:10-35 only checks anchors that exist.' },
    ],
    concerns: ['The missing-anchor case appears untested.'],
    reasoning: 'Anchor checking is implemented in the core, but the failure case is not covered by a test, so one criterion is not met.',
  },
  judge_model: 'claude-sonnet-4-6',
  cross_check_bucket: 'substantial',
  cross_check_payload: {
    bucket: 'substantial', confidence: 'high', scope: 'in_scope', substance: 'core_logic', criteria_met: 2, criteria_total: 2,
    criteria: [
      { text: '`#anchor` links are checked against headings on the target page', met: true, evidence: 'src/links/anchors.ts:18-47 resolves each anchor against the target page\'s headings.' },
      { text: 'Missing anchors fail the build with the page and anchor named', met: true, evidence: 'test/links/missing-anchor.test.ts:8-41 asserts the build fails and names both the page and the anchor.' },
    ],
    concerns: [],
    reasoning: 'Both criteria are met; the missing-anchor case has its own test file. Core logic with tests for both edge cases.',
  },
  cross_check_model: 'gpt-oss-120b', escalation_bucket: null, escalation_payload: null,
  needs_human_review: true, review_reason: 'Judge and cross-check disagree on the bucket.',
  final_bucket: 'accepted', final_source: 'judge', overridden_by: null, override_reason: null, overridden_at: null,
  units: 1, payout_amount: null, created_at: ago(8), updated_at: ago(4), merge_commit_sha: '6c1d0e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9',
}

// A rejected verdict, appealed and waiting for a decision.
const VD_TIDE_51 = {
  ...base,
  id: 'vd-tide-51', hackathon_issue_id: 'hi-tide-45', project_id: 'p-tide', repo_full_name: repo('p-tide'), pr_number: 51, issue_number: 45,
  github_login: 'sol-mendes', diff_stats: DIFF(4, 136, 41, 52),
  judge_bucket: 'rejected', judge_confidence: 'medium',
  judge_payload: {
    bucket: 'rejected', confidence: 'medium', scope: 'partial', substance: 'routine', criteria_met: 1, criteria_total: 2,
    criteria: [
      { text: 'Every channel event has a discriminated union type', met: false, evidence: 'src/events/types.ts:1-24 types four events; Settled, Disputed and Refunded are not in the union.' },
      { text: 'The old untyped emitter is deprecated, not removed', met: true, evidence: 'Marked @deprecated in src/events/emitter.ts:9.' },
    ],
    concerns: ['Three events appear untyped.'],
    reasoning: 'The emitter is deprecated correctly, but not every event is typed, so the core requirement is not met.',
  },
  cross_check_bucket: 'rejected',
  cross_check_payload: {
    bucket: 'rejected', confidence: 'medium', scope: 'partial', substance: 'routine', criteria_met: 1, criteria_total: 2,
    criteria: [
      { text: 'Every channel event has a discriminated union type', met: false, evidence: 'src/events/types.ts:1-24 covers four of seven events.' },
      { text: 'The old untyped emitter is deprecated, not removed', met: true, evidence: 'src/events/emitter.ts:9.' },
    ],
    concerns: [],
    reasoning: 'Agrees: the union is incomplete.',
  },
  needs_human_review: false, review_reason: null,
  final_bucket: 'rejected', final_source: 'judge', overridden_by: null, override_reason: null, overridden_at: null,
  units: 0, payout_amount: null, created_at: ago(8), updated_at: ago(4), merge_commit_sha: '0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
}

const APL_TIDE_51 = {
  id: 'apl-tide-51', verdict_id: 'vd-tide-51', github_login: 'sol-mendes',
  reason: 'Settled, Disputed and Refunded are typed in src/events/lifecycle.ts, which types.ts re-exports on line 25. The judge read types.ts on its own and missed the re-export.',
  status: 'pending', decision_reason: null, decided_bucket: null, decided_at: null, created_at: ago(0, 20),
}

const SUMMER_VERDICTS = [VD_QUILL_78, VD_TIDE_51, ...VERDICTS.filter((v) => v.hackathon_id === 'hk-summer-26')]
const verdictById = Object.fromEntries([...VERDICTS, VD_QUILL_78, VD_TIDE_51].map((v) => [v.id, v]))

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

const query = (req) => new URL(req.url()).searchParams

// --- Audit trail ---------------------------------------------------------------------------------

const PHASES = [
  ['hk-autumn-26', 'draft', 'application_period', 38, 2],
  ['hk-autumn-26', 'application_period', 'issue_prep', 23, 1],
  ['hk-autumn-26', 'issue_prep', 'live', 7, 3],
  ['hk-harbor-26', 'draft', 'application_period', 6, 4],
  ['hk-summer-26', 'closed', 'results_published', 4, 2],
].map(([h, oldV, newV, d, hrs], i) => ({
  id: `audit-phase-${i + 1}`, hackathon_id: h, key: 'phase', old_value: oldV, new_value: newV, actor_user_id: ADA.id, actor_login: ADA.login, created_at: ago(d, hrs),
}))

const newestFirst = (list) => [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))

// --- The API map ------------------------------------------------------------------------------

/** Overrides and additions for world('admin').api. Pass that api in: some answers wrap it. */
export function extraAdminApi(api) {
  const out = {}

  const ecos = api['/admin/ecosystems']
  out['/admin/ecosystems'] = { ...ecos, ecosystems: ecos.ecosystems.map(withLogo) }
  for (const e of ecos.ecosystems) {
    out[`/admin/ecosystems/${e.id}`] = withLogo(api[`/admin/ecosystems/${e.id}`])
    out[`PUT /admin/ecosystems/${e.id}`] = withLogo(api[`PUT /admin/ecosystems/${e.id}`])
  }

  out['/admin/bounty-draw/settings'] = { settings: drawSettingsWithWeight() }

  // A draft with nothing set: what the server reports as blocking Application period.
  out['/admin/hackathons/hk-winter-26'] = {
    ...api['/admin/hackathons/hk-winter-26'],
    blocking_reasons: [
      { field: 'announced_at', message: 'Set an announcement date before opening applications.' },
      { field: 'application_period_start', message: 'Set when the application period opens.' },
      { field: 'application_period_end', message: 'Set when the application period closes.' },
    ],
  }

  const autumnDraws = api['/admin/hackathons/hk-autumn-26/draws']
  out['/admin/hackathons/hk-autumn-26/draws'] = (req) => {
    const { draws } = autumnDraws(req)
    return { draws: newestFirst([...draws, ...EXTRA_AUTUMN_DRAWS]) }
  }
  for (const d of [...DRAWS, ...EXTRA_AUTUMN_DRAWS]) out[`POST /admin/hackathon-issues/${d.hackathon_issue_id}/simulate-draw`] = rerun(d)

  out['/admin/hackathons/hk-summer-26/verdicts'] = (req) => {
    const q = query(req)
    const status = q.get('status')
    const list = SUMMER_VERDICTS.filter(
      (v) => !status || (status === 'needs_review' ? v.needs_human_review : status === 'overridden' ? v.final_source === 'human_override' : status === 'rejected' ? v.prefilter_status === 'rejected' : true),
    )
    return { verdicts: list, shadow_mode: false, stats: verdictStats(SUMMER_VERDICTS) }
  }
  for (const v of [VD_QUILL_78, VD_TIDE_51]) {
    out[`/admin/hackathon-verdicts/${v.id}`] = { verdict: v, shadow_mode: false }
    out[`POST /admin/hackathon-verdicts/${v.id}/override`] = { ok: true, final_bucket: v.final_bucket }
  }
  const summerAppeals = api['/admin/hackathons/hk-summer-26/appeals']
  out['/admin/hackathons/hk-summer-26/appeals'] = (req) => {
    const res = summerAppeals(req)
    const status = query(req).get('status')
    const extra = !status || status === 'pending' ? [{ ...APL_TIDE_51, verdict: verdictById['vd-tide-51'] }] : []
    return { ...res, appeals: [...extra, ...res.appeals] }
  }
  out[`POST /admin/hackathon-appeals/${APL_TIDE_51.id}/decide`] = { ok: true }

  const audit = api['/admin/hackathon-config/audit']
  out['/admin/hackathon-config/audit'] = (req) => {
    const h = query(req).get('hackathon_id')
    const { entries } = audit(req)
    return { entries: newestFirst([...entries, ...PHASES.filter((e) => (h ? e.hackathon_id === h : true))]) }
  }

  return out
}

export { HACKATHONS }
