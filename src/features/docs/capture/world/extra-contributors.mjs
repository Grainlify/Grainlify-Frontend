// Extra fixture data for the contributor-work screenshots (shots/contributors-work.mjs).
// Merged into a single shot's api map; nothing else in the world changes.
//
//   tideIssuesWithThirdApplicant  tide-sdk #57 (mira-dev's pending application)
//                                 gets a second applicant besides noor-writes, so
//                                 mira-dev's application sits among others.
//   oneAppliedApplication         the Contributions board with only mira-dev's
//                                 tide-sdk #57 application, for "While you wait".

import { ISSUES, issueApplicationsFor } from './projects.mjs'
import { ago } from './util.mjs'

const SITE = 'https://grainlify.example'

function applicationComment(id, login, when, message, repo, number, issueId, projectId) {
  return {
    id,
    body: `**📋 Grainlify Application**\n\n**@${login} has applied to work on this issue as part of the Grainlify program.**\n\n> ${message}\n\n---\n\n**Repo Maintainers:** To accept this application, [review their application](${SITE}/dashboard?tab=maintainers&view=maintainer&project=${projectId}&issue=${issueId}) or [assign @${login}](https://github.com/${repo}/issues/${number}) to this issue.`,
    user: { login },
    created_at: when,
    updated_at: when,
  }
}

const tideIssues = ISSUES['p-tide'].map((i) => {
  if (i.number !== 57) return i
  const extra = applicationComment(
    3199000057,
    'felix-quay',
    ago(0, 16),
    'I added typed errors to a JSON-RPC client last year. I would include the request id on the error as well, so timeouts can be matched to logs.',
    'tidewater-labs/tide-sdk',
    57,
    i.github_issue_id,
    'p-tide',
  )
  const comments = [...i.comments, extra].sort((a, b) => a.created_at.localeCompare(b.created_at))
  return { ...i, comments, comments_count: comments.length, updated_at: ago(0, 16) }
})
const publicIssue = ({ assignees, comments, comments_count, ...rest }) => rest

export const tideIssuesWithThirdApplicant = {
  '/projects/p-tide/issues': { issues: tideIssues },
  '/projects/p-tide/issues/public': { issues: tideIssues.map(publicIssue) },
}

export const oneAppliedApplication = {
  '/issue-applications/me': {
    issue_applications: issueApplicationsFor('mira-dev').filter((a) => a.project_id === 'p-tide' && a.issue_number === 57),
  },
}

/**
 * GET /profile/projects in the backend's order (ORDER BY github_full_name ASC);
 * the shared world returns them unsorted, and the page does not sort.
 */
export const sortedContributedProjects = (api) => ({
  '/profile/projects': (req) => [...api['/profile/projects'](req)].sort((a, b) => a.github_full_name.localeCompare(b.github_full_name)),
})

/**
 * GET /search matching issues on their title only, as the backend does; the
 * shared world also matches descriptions, which would list an issue whose
 * title does not contain the query.
 */
export const titleOnlyIssueSearch = (api) => ({
  '/search': (req) => {
    const q = (new URL(req.url()).searchParams.get('q') ?? '').toLowerCase().trim()
    const r = api['/search'](req)
    return { ...r, issues: r.issues.filter((i) => i.title.toLowerCase().includes(q)) }
  },
})
