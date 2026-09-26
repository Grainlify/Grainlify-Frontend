// The docs contents tree. Order here is the order in the sidebar.
// `summary` is what search shows under a page title until the page is written.

export interface DocPage {
  slug: string;
  title: string;
  summary: string;
}
export interface DocGroup {
  title: string;
  pages: DocPage[];
}
export interface DocSection {
  id: string;
  title: string;
  /** Pages directly under the section, before any groups. */
  pages?: DocPage[];
  groups?: DocGroup[];
  /** Signed-in admins only. Left out of the tree and of search for everyone else. */
  adminOnly?: boolean;
}

const p = (slug: string, title: string, summary: string): DocPage => ({ slug, title, summary });

export const DOCS_NAV: DocSection[] = [
  {
    id: 'start',
    title: 'Getting started',
    pages: [
      p('welcome', 'Welcome to Grainlify', 'What Grainlify is, who pays whom, and how the money moves.'),
      p('create-your-account', 'Create your account', 'Sign in with GitHub, your first visit, and the product tour.'),
      p('find-your-way-around', 'Find your way around', 'The rail, the header, search, the theme switch and notifications.'),
      p('views', 'Contributor, maintainer and admin views', 'What the role switcher changes, and what makes you a maintainer.'),
      p('glossary', 'Glossary', 'Bounty, GrainHack, draw, ticket, verdict, claim, wave and rank.'),
    ],
  },
  {
    id: 'contributors',
    title: 'Contributors',
    groups: [
      {
        title: 'Find work',
        pages: [
          p('contributors/discover', 'Discover', 'Recommended projects and issues picked for you.'),
          p('contributors/browse', 'Browse projects and organizations', 'Filter by language, ecosystem, category and tag.'),
          p('contributors/ecosystems', 'Ecosystems', 'Projects grouped by the ecosystem they belong to.'),
          p('contributors/search', 'Search', 'Find projects, issues and people from anywhere with Cmd/Ctrl+K.'),
          p('contributors/project-page', 'Read a project page', 'Languages, contributors, issues and recent pull requests.'),
          p('contributors/issue-page', 'Read an issue page', 'The issue, its discussion, and who has applied.'),
        ],
      },
      {
        title: 'Work on an issue',
        pages: [
          p('contributors/applying-to-issues', 'Apply for an issue', 'Write a short application that the maintainer sees on GitHub.'),
          p('contributors/after-you-apply', 'After you apply', 'Assigned, rejected, or withdrawn, and what each means.'),
          p('contributors/open-your-pr', 'Open your PR and get it merged', 'Link the issue, respond to review, and get merged.'),
          p('contributors/track-contributions', 'Track your contributions', 'The Contributors tab: your applications, projects and history.'),
        ],
      },
      {
        title: 'Bounties',
        pages: [
          p('contributors/bounties', 'How Grainlify Bounties work', 'Bounties posted by the agent and funded by GRAIN creator fees.'),
          p('contributors/link-solana-wallet', 'Link your Solana wallet', 'Connect Phantom, Solflare or Backpack and sign one message. One wallet per GitHub account.'),
          p('contributors/apply-for-a-bounty', 'Apply for a bounty', 'Apply while the window is open. The draw is weighted, not first-come.'),
          p('contributors/bounty-payment', 'From pull request to payment', 'Advisory review, the maintainer merges, a person approves the payout.'),
          p('contributors/bounty-ledger', 'The bounty ledger', 'Every bounty, inference purchase and payout, with proof links.'),
          p('contributors/bounty-rules', 'Bounty rules and limits', 'One wallet per GitHub account, one bounty at a time, accounts 30 days or older.'),
        ],
      },
      {
        title: 'GrainHack',
        pages: [
          p('contributors/grainhack', 'What GrainHack is', 'Events, their phases, and how issues enter an event.'),
          p('contributors/grainhack-eligibility', 'Who can take part', 'Account age, slots, concurrent applications and lockouts.'),
          p('contributors/grainhack-apply', 'Apply for a GrainHack issue', 'Applying does not use a slot. The draw decides.'),
          p('contributors/grainhack-draw', 'The draw: tickets and weights', 'How tickets are counted and what the draw cannot see.'),
          p('contributors/grainhack-assignment', 'Your assignment', 'The stale timer, and releasing an issue you cannot finish.'),
          p('contributors/grainhack-results', 'Results, grading and appeals', 'Verdicts with citations, and how to appeal one.'),
        ],
      },
      {
        title: 'Get paid',
        pages: [
          p('contributors/payouts', 'How payouts work', 'Which rail pays what: Solana for bounties, Aptos for GrainHack.'),
          p('contributors/verifying-your-identity', 'Verify your identity', 'Identity verification with Didit, and what it unlocks.'),
          p('contributors/payout-address', 'Register your payout address', 'Connect Petra and sign to register an Aptos address.'),
          p('contributors/payout-readiness', 'Payout readiness', 'What the readiness card tells you and how to fix each state.'),
        ],
      },
      {
        title: 'Rewards and standing',
        pages: [
          p('contributors/ranks-and-leaderboard', 'Ranks and the leaderboard', 'Merged pull requests in the last 90 days, and the rank tiers.'),
          p('rewards', 'Founding Contributor Pool', 'Shares, waves, and what qualifies you for a position.'),
          p('contributors/social-follow', 'Social follow', 'Follow on LinkedIn and X and submit both screenshots together.'),
          p('contributors/referrals', 'Referrals', 'Your referral link and when a referral completes.'),
        ],
      },
      {
        title: 'Your account',
        pages: [
          p('contributors/profile', 'Your public profile', 'What other people see about you.'),
          p('contributors/edit-profile', 'Edit your profile', 'Name, picture, bio and contact links.'),
          p('contributors/notifications', 'Notifications', 'The bell, the notifications page, and your preferences.'),
          p('contributors/settings', 'Settings, tab by tab', 'Every tab in Settings and what it controls.'),
          p('contributors/getting-help', 'Get help', 'Report a problem and follow your reports.'),
        ],
      },
    ],
  },
  {
    id: 'maintainers',
    title: 'Maintainers',
    pages: [
      p('maintainers', 'Maintainer quick start', 'From installing the GitHub App to your first assignment.'),
      p('maintainers/add-repositories', 'Add your repositories', 'Install the Grainlify GitHub App on the repositories you choose.'),
      p('maintainers/project-setup', 'Finish project setup', 'Description, ecosystem, tags and category.'),
      p('maintainers/maintainer-dashboard', 'Your maintainer dashboard', 'Views, applications and pull requests over the last seven days.'),
      p('maintainers/managing-applications', 'Review applications', 'Assign, reject or unassign applicants.'),
      p('maintainers/bot-message', 'Post a Grainlify bot message', 'Post a message on an issue as the Grainlify bot.'),
      p('maintainers/reviewing-pull-requests', 'The pull requests feed', 'Every pull request across your repositories.'),
      p('maintainers/keeping-projects-in-sync', 'Keep projects in sync', 'How sync works, and removing a repository.'),
      p('maintainers/organization-page', 'Your organization page', 'Links and ratings on your organization page.'),
      p('maintainers/bounties', 'Bounties on your repositories', 'What the agent does on your repositories. You cannot win your own.'),
      p('maintainers/grainhack', 'GrainHack for maintainers', 'Labels, acceptance criteria, difficulty and pool scoring.'),
    ],
  },
  {
    id: 'admins',
    title: 'Admins',
    adminOnly: true,
    pages: [
      p('admins/access', 'Admin access', 'The admin view and who has it.'),
      p('admins/kyc-review', 'Verification review', 'Work the verification queue and send feedback.'),
      p('admins/social-follow-review', 'Social follow review', 'Approve, reject or revoke follow submissions.'),
      p('admins/ecosystems', 'Ecosystem management', 'Add, edit and remove ecosystems.'),
      p('admins/bounty-draw', 'Run a bounty draw', 'Simulate a draw, then run it.'),
      p('admins/grainhack-events', 'GrainHack: create an event', 'Create and configure an event and advance its phases.'),
      p('admins/grainhack-applications', 'GrainHack: project applications', 'Accept, reject or ask for more information.'),
      p('admins/grainhack-draws', 'GrainHack: draws and simulations', 'Run draws with a seed and read the ticket breakdown.'),
      p('admins/grainhack-verdicts', 'GrainHack: verdicts and appeals', 'Override a verdict with a reason, and decide appeals.'),
      p('admins/audit-log', 'Audit log', 'Every configuration change, who made it and when.'),
      p('admins/redemptions', 'Legacy redemption requests', 'Mark paid or reject requests from the points programme.'),
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    pages: [
      p('reference/limits', 'Limits, caps and fees', 'Every limit in one table.'),
      p('reference/wallets', 'Supported wallets and chains', 'Phantom, Solflare and Backpack on Solana; Petra on Aptos.'),
      p('reference/notification-types', 'Notification types', 'Every notification and what triggers it.'),
      p('reference/faq', 'FAQ', 'Short answers to common questions.'),
      p('what-changed', 'What changed', 'Changes to the programme, newest first.'),
    ],
  },
];

export interface PageRef {
  page: DocPage;
  section: DocSection;
  group?: DocGroup;
}

/**
 * The tree as a reader sees it: only pages that have been written, and only
 * sections and groups that still have a page in them. A page listed here with
 * no content is a promise, not a page, so it stays out of the contents, the
 * search index and the prerender until its Markdown file lands.
 */
export function publishedNav(available: ReadonlySet<string>, isAdmin: boolean): DocSection[] {
  return DOCS_NAV.filter((s) => !s.adminOnly || isAdmin)
    .map((s) => ({
      ...s,
      pages: (s.pages ?? []).filter((p) => available.has(p.slug)),
      groups: (s.groups ?? []).map((g) => ({ ...g, pages: g.pages.filter((p) => available.has(p.slug)) })).filter((g) => g.pages.length > 0),
    }))
    .filter((s) => s.pages.length > 0 || s.groups.length > 0);
}

/** Published pages in reading order, which is also previous/next order. */
export function publishedPages(available: ReadonlySet<string>, isAdmin: boolean): PageRef[] {
  const out: PageRef[] = [];
  for (const section of publishedNav(available, isAdmin)) {
    for (const page of section.pages ?? []) out.push({ page, section });
    for (const group of section.groups ?? []) for (const page of group.pages) out.push({ page, section, group });
  }
  return out;
}

/** Every page in the tree, published or not, with where it sits. */
export function findPage(slug: string): PageRef | null {
  for (const section of DOCS_NAV) {
    for (const page of section.pages ?? []) if (page.slug === slug) return { page, section };
    for (const group of section.groups ?? []) for (const page of group.pages) if (page.slug === slug) return { page, section, group };
  }
  return null;
}
