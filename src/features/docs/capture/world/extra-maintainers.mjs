// Extra data for the maintainer docs screenshots (shots/maintainers.mjs), on
// top of world('maintainer').
//
// The world has one GrainHack issue on owen-maintains' repositories, and it is
// already published (ledgerline #224). The docs also show an issue that has
// just been labelled and is still pending: ledgerline #242, "Document the CLI
// flags", in GrainHack Autumn 2026, with no acceptance criteria and no
// difficulty tier yet.
//
// It also answers /orgs/tidewater-labs/ratings/me as the backend does for an
// owner: not eligible to review their own organisation.

import { world, initFor, ISSUES, HACKATHONS } from './index.mjs'
import { ago } from './util.mjs'
import { personas } from './people.mjs'

const OWEN = personas.maintainer.login
const PID = 'p-ledger'
const REPO = 'tidewater-labs/ledgerline'
const NUMBER = 242
const EVENT = HACKATHONS.find((h) => h.id === 'hk-autumn-26')

/** GitHub's global id for the new issue, in the same scheme as issueId() (ledgerline is project index 0). */
export const PENDING_GH_ISSUE_ID = 2400000000 + NUMBER

export const PENDING_GH_ISSUE = {
  github_issue_id: PENDING_GH_ISSUE_ID,
  number: NUMBER,
  state: 'open',
  title: 'Document the CLI flags',
  description: 'Every `ledgerline` subcommand has flags that are only described in `--help`. Add `docs/cli.md` with one section per subcommand and an example for each flag.',
  author_login: OWEN,
  assignees: [],
  labels: [{ name: 'GrainHack', color: 'c9983a' }, { name: 'documentation', color: '0075ca' }],
  comments_count: 0,
  comments: [],
  url: `https://github.com/${REPO}/issues/${NUMBER}`,
  updated_at: ago(0, 2),
  last_seen_at: ago(0, 1),
}

const pendingHackathonIssue = {
  id: 'hi-ledger-242', hackathon_id: EVENT.id, hackathon_name: EVENT.name, project_id: PID, issue_number: NUMBER,
  org_login: 'tidewater-labs', status: 'pending', acceptance_criteria: '', difficulty_tier: '', primary_language: 'Rust',
  flagged_for_admin: false, flagged_reason: null, synced_at: ago(0, 2), published_at: null,
}

const { assignees, comments, comments_count, ...publicIssue } = PENDING_GH_ISSUE

function extraApi(base) {
  const ledgerIssues = [PENDING_GH_ISSUE, ...ISSUES[PID]]
  return {
    [`/projects/${PID}/issues`]: { issues: ledgerIssues },
    [`/projects/${PID}/issues/public`]: { issues: [publicIssue, ...(base[`/projects/${PID}/issues/public`]?.issues ?? [])] },
    [`/projects/${PID}/hackathon-issues/${NUMBER}`]: pendingHackathonIssue,
    [`PUT /projects/${PID}/hackathon-issues/${NUMBER}`]: pendingHackathonIssue,
    [`/projects/${PID}/grainhack/${NUMBER}`]: {
      issue: {
        id: pendingHackathonIssue.id, hackathon_id: EVENT.id, hackathon_name: EVENT.name, project_id: PID, issue_number: NUMBER, status: 'pending',
        acceptance_criteria: '', difficulty_tier: '', primary_language: 'Rust', reserved: false,
        application_window_opens_at: null, application_window_closes_at: null,
      },
      applicant_count: null, applicant_bucket: 'none', applicant_visibility: 'bucketed', my_application: null,
    },
    [`/projects/${PID}/hackathon-issues`]: { issues: [pendingHackathonIssue, ...(base[`/projects/${PID}/hackathon-issues`]?.issues ?? [])] },
    [`POST /projects/${PID}/issues/${NUMBER}/comment`]: { ok: true },
    // Owners cannot review their own organisation.
    '/orgs/tidewater-labs/ratings/me': { eligible: false, rating: null },
  }
}

/** world('maintainer') plus the pending GrainHack issue. Spread it into a shot entry. */
export function maintainerWorld(opts = {}) {
  const w = world('maintainer', opts)
  const extra = extraApi(w.api)
  const api = { ...w.api, ...extra }
  // initFor() answers 404 for GrainHack lookups it has no fixture for; let the new ones through.
  const extraPaths = Object.keys(extra).filter((k) => !/^(POST|PUT|DELETE) /.test(k))
  const init = initFor('maintainer', opts).map((s) => ({
    ...s,
    arg: s.arg.map((r) => ({ ...r, except: [...r.except, ...extraPaths.filter((p) => new RegExp(r.pattern).test(p))] })),
  }))
  return { ...w, api, init }
}

