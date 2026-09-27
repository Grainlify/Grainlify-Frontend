// Projects, issues, pull requests, organisations and ecosystems.
//
// Four invented organisations across three ecosystems. owen-maintains owns
// the tidewater-labs repositories; mira-dev contributes across all of them.

import { ago, ahead, avatar, calendar, query, seeded } from './util.mjs'
import { personas } from './people.mjs'

const MIRA = personas.contributor.login
const OWEN = personas.maintainer.login
const SITE = 'https://grainlify.example'

// --- Ecosystems -------------------------------------------------------------

export const ECOSYSTEMS = [
  {
    id: 'eco-solana', slug: 'solana', name: 'Solana', status: 'active',
    description: 'High-throughput chain with a large Rust and TypeScript tooling community.',
    website_url: 'https://solana.example', logo_url: avatar('eco-solana'),
    about: 'Projects here build payment channels, indexers and SDKs for a fast, low-fee chain. Most issues are Rust or TypeScript, and many are sized for a first contribution.',
    links: [{ label: 'Developer docs', url: 'https://solana.example/docs' }, { label: 'Community forum', url: 'https://forum.solana.example' }],
    key_areas: [
      { title: 'Payments infrastructure', description: 'Channels, ledgers and settlement tooling.' },
      { title: 'Developer tooling', description: 'SDKs, CLIs and test harnesses.' },
      { title: 'Data', description: 'Event streams and indexers.' },
    ],
    technologies: ['Rust', 'TypeScript', 'Go'],
    created_at: '2025-10-02T10:00:00Z',
  },
  {
    id: 'eco-stellar', slug: 'stellar', name: 'Stellar', status: 'active',
    description: 'Payments network focused on anchors, stable assets and cross-border transfers.',
    website_url: 'https://stellar.example', logo_url: avatar('eco-stellar'),
    about: 'Anchors, documentation tooling and analytics for a payments-first network. A good home for Go and Python contributors.',
    links: [{ label: 'Developer docs', url: 'https://stellar.example/docs' }],
    key_areas: [
      { title: 'Anchors', description: 'Services that move money on and off the network.' },
      { title: 'Documentation', description: 'Docs generators and tested examples.' },
    ],
    technologies: ['Go', 'TypeScript', 'Python'],
    created_at: '2025-10-02T10:00:00Z',
  },
  {
    id: 'eco-aptos', slug: 'aptos', name: 'Aptos', status: 'active',
    description: 'Move-based chain with growing wallet and indexer tooling.',
    website_url: 'https://aptos.example', logo_url: avatar('eco-aptos'),
    about: 'Wallets and indexers for a Move-based chain. Issues range from UI safety work to Rust data pipelines.',
    links: [{ label: 'Developer docs', url: 'https://aptos.example/docs' }, { label: 'Discord', url: 'https://discord.example/aptos' }],
    key_areas: [
      { title: 'Wallets', description: 'Browser wallets and signing safety.' },
      { title: 'Indexing', description: 'Module events and checkpoints.' },
    ],
    technologies: ['TypeScript', 'Rust', 'Move'],
    created_at: '2025-11-14T10:00:00Z',
  },
]

/** Shown only in the admin list: an ecosystem that was switched off. */
export const INACTIVE_ECOSYSTEM = {
  id: 'eco-lumen', slug: 'lumen-testnet', name: 'Lumen Testnet', status: 'inactive',
  description: 'Paused while its testnet is rebuilt.', website_url: 'https://lumen.example', logo_url: avatar('eco-lumen'),
  about: null, links: null, key_areas: null, technologies: ['Rust'], created_at: '2026-02-01T10:00:00Z',
}

// --- Organisations -----------------------------------------------------------

export const ORGS = {
  'tidewater-labs': { rating: 4.7, ratings: 18, rank: 1, tier: 'conqueror', links: { telegram: 'https://t.me/tidewater_labs', linkedin: null, whatsapp: null, twitter: 'https://x.example/tidewaterlabs', discord: 'https://discord.example/tidewater' } },
  'northfield-oss': { rating: 4.5, ratings: 11, rank: 2, tier: 'conqueror', links: { telegram: null, linkedin: 'https://www.linkedin.example/company/northfield-oss', whatsapp: null, twitter: 'https://x.example/northfield_oss', discord: 'https://discord.example/northfield' } },
  saltmarsh: { rating: 4.2, ratings: 7, rank: 3, tier: 'conqueror', links: { telegram: 'https://t.me/saltmarsh_dev', linkedin: null, whatsapp: null, twitter: null, discord: 'https://discord.example/saltmarsh' } },
  'kestrel-data': { rating: 3.9, ratings: 5, rank: 4, tier: 'conqueror', links: { telegram: null, linkedin: null, whatsapp: null, twitter: 'https://x.example/kestreldata', discord: null } },
}

// --- Projects ----------------------------------------------------------------

const P = (id, full, language, category, eco, stars, contributors, tags, description, created, extra = {}) => ({
  id, github_full_name: full, language, category, ecosystem: eco, stars, contributors, tags, description, created, ...extra,
})

/** Every verified, set-up project. `owner` is the persona that owns it on Grainlify. */
export const PROJECTS = [
  P('p-ledger', 'tidewater-labs/ledgerline', 'Rust', 'Infrastructure', 'Solana', 1840, 42, ['payments', 'good first issue', 'rust'], 'A fast append-only ledger for payment channels, with snapshots and compaction.', '2025-11-02T10:00:00Z', { owner: 'maintainer', github_repo_id: 812004411, homepage: 'https://ledgerline.example' }),
  P('p-tide', 'tidewater-labs/tide-sdk', 'TypeScript', 'Developer tools', 'Solana', 734, 23, ['sdk', 'good first issue', 'typescript'], 'TypeScript SDK for Tidewater payment channels: typed RPC, retries and subscriptions.', '2025-12-09T10:00:00Z', { owner: 'maintainer', github_repo_id: 812004977, homepage: 'https://tide.example' }),
  P('p-quill', 'northfield-oss/quill-docs', 'TypeScript', 'Developer tools', 'Stellar', 960, 27, ['documentation', 'good first issue', 'typescript'], 'Docs generator that keeps code examples tested and in sync with the source.', '2025-10-21T10:00:00Z'),
  P('p-anchor', 'northfield-oss/anchorage', 'Go', 'Payments', 'Stellar', 1215, 31, ['payments', 'anchors', 'security'], 'Reference anchor server: deposits, withdrawals and SEP-10 authentication.', '2025-10-18T10:00:00Z'),
  P('p-orbit', 'saltmarsh/orbit-wallet', 'TypeScript', 'Wallets', 'Aptos', 612, 19, ['wallet', 'security', 'good first issue', 'typescript'], 'A small, auditable browser wallet with clear signing prompts.', '2026-01-12T10:00:00Z'),
  P('p-brine', 'saltmarsh/brine-indexer', 'Rust', 'Data', 'Aptos', 388, 12, ['indexer', 'rust', 'data'], 'Indexes Move module events into Postgres, with checkpointed backfills.', '2026-02-03T10:00:00Z'),
  P('p-sieve', 'kestrel-data/sieve', 'Go', 'Data', 'Solana', 455, 14, ['streams', 'filters', 'good first issue'], 'Stream filters for on-chain events: transfers, programs and wallet allowlists.', '2025-12-01T10:00:00Z'),
  P('p-perch', 'kestrel-data/perch', 'Python', 'Analytics', 'Stellar', 297, 9, ['analytics', 'notebooks', 'ledger'], 'Notebooks and charts for ledger close times, fees and network health.', '2026-03-10T10:00:00Z'),
]

/** Owned by owen-maintains but not set up yet: the new-project setup modal is for this one. */
export const PENDING_PROJECT = {
  id: 'p-harbor', github_full_name: 'tidewater-labs/harbor-bridge', github_repo_id: 812006120,
  description: 'Bridges Tidewater channel balances into harbour accounts.', ecosystem_id: 'eco-solana', ecosystem_name: 'Solana',
  language: 'Rust', tags: [], category: null,
}

export const projectById = Object.fromEntries(PROJECTS.map((p) => [p.id, p]))
const ecoByName = Object.fromEntries(ECOSYSTEMS.map((e) => [e.name, e]))
const orgOf = (full) => full.split('/')[0]

// Per-project counts are derived from the issues and PRs below.
function publicProject(p) {
  const issues = ISSUES[p.id] ?? []
  const prs = PRS[p.id] ?? []
  return {
    id: p.id,
    github_full_name: p.github_full_name,
    language: p.language,
    tags: p.tags,
    category: p.category,
    stars_count: p.stars,
    forks_count: Math.round(p.stars / 6),
    contributors_count: p.contributors,
    open_issues_count: issues.filter((i) => i.state === 'open').length + Math.round(p.stars / 120),
    open_prs_count: prs.filter((x) => x.state === 'open').length,
    ecosystem_name: p.ecosystem,
    ecosystem_slug: ecoByName[p.ecosystem]?.slug ?? null,
    description: p.description,
    created_at: p.created,
    updated_at: ago(0, 6),
  }
}

const LANG_MIX = {
  Rust: [['Rust', 86.4], ['Shell', 6.1], ['Dockerfile', 4.3], ['Makefile', 3.2]],
  TypeScript: [['TypeScript', 81.2], ['JavaScript', 9.6], ['CSS', 6.9], ['HTML', 2.3]],
  Go: [['Go', 91.5], ['Shell', 4.8], ['Makefile', 3.7]],
  Python: [['Python', 64.1], ['Jupyter Notebook', 31.7], ['Shell', 4.2]],
}

const README = {
  'p-ledger': `# ledgerline

An append-only ledger for payment channels. Every channel update is a signed entry; snapshots let a node restart without replaying history.

## Features

- Constant-time appends with batched fsync
- Snapshots every N entries, verified on load
- Compaction that never rewrites a live segment

## Getting started

\`\`\`bash
cargo add ledgerline
\`\`\`

\`\`\`rust
let ledger = Ledger::open("./data")?;
ledger.append(&entry)?;
\`\`\`

## Contributing

Issues labelled **good first issue** are sized for a first pull request. Apply on Grainlify and a maintainer will assign you.`,
  'p-quill': `# quill-docs

Docs generator that runs every code example as a test, so documentation cannot drift from the code it describes.

## Why

Examples rot. quill-docs extracts each fenced block, runs it against the current build and fails the docs build when one breaks.

\`\`\`bash
npx quill-docs build ./docs
\`\`\``,
}

function projectDetail(p) {
  const org = orgOf(p.github_full_name)
  return {
    ...publicProject(p),
    languages: (LANG_MIX[p.language] ?? [[p.language, 100]]).map(([name, percentage]) => ({ name, percentage })),
    readme: README[p.id] ?? `# ${p.github_full_name.split('/')[1]}\n\n${p.description}\n\n## Contributing\n\nPick an open issue, apply on Grainlify, and a maintainer will assign it to you.`,
    repo: {
      full_name: p.github_full_name,
      html_url: `https://github.com/${p.github_full_name}`,
      homepage: p.homepage ?? '',
      description: p.description,
      open_issues_count: publicProject(p).open_issues_count,
      owner_login: org,
      owner_avatar_url: avatar(org),
    },
  }
}

// --- Issues ------------------------------------------------------------------

let commentSeq = 3100000000
const applyBody = (login, message, repo, number, issueId, projectId) =>
  `**📋 Grainlify Application**\n\n**@${login} has applied to work on this issue as part of the Grainlify program.**\n\n${message
    .split('\n')
    .map((l) => '> ' + l)
    .join('\n')}\n\n---\n\n**Repo Maintainers:** To accept this application, [review their application](${SITE}/dashboard?tab=maintainers&view=maintainer&project=${projectId}&issue=${issueId}) or [assign @${login}](https://github.com/${repo}/issues/${number}) to this issue.`

/** An application comment, posted on GitHub as the applicant. */
const app = (login, when, message) => ({ kind: 'app', login, when, message })
/** An ordinary discussion comment. */
const say = (login, when, body) => ({ kind: 'say', login, when, body })

const I = (number, title, labels, opts = {}) => ({ number, title, labels, state: 'open', assignees: [], thread: [], ...opts })

const ISSUE_DEFS = {
  'p-ledger': [
    I(212, 'Document the snapshot format', ['documentation', 'good first issue'], {
      author: OWEN, updated: ago(0, 20),
      description: 'The on-disk snapshot format is only described in code comments. Write `docs/snapshot-format.md` covering:\n\n- the header layout and version byte\n- how entries are framed and checksummed\n- what a reader must do with an unknown version\n\nA diagram of the header is welcome but not required.',
      thread: [
        app('jun-okafor', ago(2, 3), 'I wrote the format notes for a similar log at work, so I know where readers trip up. Plan: one page with a byte-level table of the header, a framing example with real bytes, and a section on version handling. Draft PR within three days.'),
        say('lena-marsh', ago(1, 22), 'Is the checksum over the payload only, or payload plus length prefix? Worth stating explicitly in the doc.'),
        say(OWEN, ago(1, 20), 'Payload plus length prefix. Good catch, the doc should say so.'),
        app('priya-kern', ago(1, 5), 'I have contributed docs to two Rust storage crates. I would add a worked example that decodes a real snapshot header with `xxd` output next to the table.'),
        app('tomas-rivet', ago(0, 20), 'First contribution here. I have read the snapshot module and can write this up with a diagram of the header.'),
      ],
    }),
    I(219, 'Retry failed channel close with backoff', ['bug', 'help wanted'], {
      author: 'lena-marsh', updated: ago(3, 2), assignees: [MIRA],
      description: 'When the counterparty is offline, `close_channel` fails once and gives up. It should retry with exponential backoff (capped) and surface the final error.',
      thread: [
        app(MIRA, ago(6, 4), 'I hit this in a test network last month. I would add a capped exponential backoff with jitter behind a `RetryPolicy` so callers can tune it, plus tests with a fake clock.'),
        say(OWEN, ago(5, 1), 'Assigned to @mira-dev. Please keep the default policy conservative: 5 attempts, 30s cap.'),
        say(MIRA, ago(3, 2), 'Draft is up locally; opening the PR once the fake-clock tests pass.'),
      ],
    }),
    I(224, 'Benchmark snapshot writes under load', ['GrainHack', 'performance'], {
      author: OWEN, updated: ago(2, 8),
      description: 'Add a Criterion benchmark that writes snapshots while appends continue on another thread, and report p50/p99 write latency.\n\n**Acceptance criteria**\n- benchmark lives in `benches/snapshot_under_load.rs`\n- results table added to `docs/performance.md`',
      thread: [say('arun-patch', ago(2, 8), 'Should the benchmark pin the append rate, or let it run flat out?')],
    }),
    I(227, 'Expose channel metrics over Prometheus', ['enhancement', 'good first issue'], {
      author: OWEN, updated: ago(4, 1),
      description: 'Export open channel count, append rate and snapshot age as Prometheus gauges behind a `metrics` feature flag.',
      thread: [app('kofi-ade', ago(4, 1), 'I maintain a small exporter crate and can wire these gauges up behind the feature flag, with a sample Grafana panel.')],
    }),
    I(231, 'Compaction leaves orphaned segment files', ['bug'], {
      author: 'yuki-tern', updated: ago(1, 3),
      description: 'After compaction, segment files older than the snapshot are sometimes left on disk. Seen on ext4 with `sync = batch`.',
      thread: [say(OWEN, ago(1, 3), 'Reproduced. Looks like a rename that is never fsynced.')],
    }),
    I(238, 'Reject truncated snapshot files with a clear error', ['bug', 'good first issue'], {
      author: 'lena-marsh', updated: ago(0, 7),
      description: 'Opening a truncated snapshot panics with `index out of range`. Return `SnapshotError::Truncated { expected, found }` instead, and add a test with a file cut mid-entry.',
      thread: [app('ines-byte', ago(0, 7), 'I can add the error variant and a proptest that truncates snapshots at random offsets.')],
    }),
    I(240, 'Add a `ledgerline inspect` CLI subcommand', ['enhancement', 'good first issue'], {
      author: OWEN, updated: ago(2, 20),
      description: 'Print the header, entry count and last sequence number of a ledger directory. Useful when debugging a node that will not start.',
    }),
    I(205, 'Clarify fee rounding in the README', ['documentation'], {
      author: 'felix-quay', updated: ago(58), state: 'closed', assignees: ['lena-marsh'],
      thread: [app('lena-marsh', ago(62), 'I can rewrite the fee section with a worked rounding example.'), app('kofi-ade', ago(61), 'Happy to take this one.'), say(OWEN, ago(60), 'Assigned to @lena-marsh.')],
    }),
    I(198, 'Add a fuzzing harness for the entry decoder', ['testing'], {
      author: OWEN, updated: ago(41), state: 'closed', assignees: ['priya-kern'],
      thread: [app('priya-kern', ago(46), 'I have set up cargo-fuzz for two parsers before; I will add a corpus from real snapshots.'), app('arun-patch', ago(45), 'Interested, first fuzzing project for me.'), app('tomas-rivet', ago(45), 'I can help with the corpus.')],
    }),
    I(186, 'Snapshots are not verified on load', ['bug'], {
      author: 'jun-okafor', updated: ago(95), state: 'closed', assignees: [OWEN],
      thread: [app('jun-okafor', ago(100), 'Found this while testing crash recovery; happy to fix.'), app('priya-kern', ago(99), 'I can take it if jun is busy.'), say(OWEN, ago(97), 'Taking this one myself since it touches the format.')],
    }),
    I(179, 'Batch fsync behind a config flag', ['performance'], {
      author: OWEN, updated: ago(126), state: 'closed', assignees: ['tomas-rivet'],
      thread: [app('tomas-rivet', ago(131), 'I would add `sync = batch|always` with a default of always.'), app('noor-writes', ago(130), 'Interested.')],
    }),
  ],
  'p-tide': [
    I(57, 'Typed errors for RPC timeouts', ['enhancement', 'good first issue'], {
      author: OWEN, updated: ago(1, 2),
      description: 'Timeouts currently surface as a generic `Error("request failed")`. Add a `RpcTimeoutError` with the method name and elapsed time so callers can retry selectively.',
      thread: [
        app(MIRA, ago(2, 1), 'I would add `RpcTimeoutError` (method, elapsedMs, attempt), export it from the package root, and add a test that forces a timeout with fake timers.'),
        app('noor-writes', ago(1, 2), 'Happy to take this; I have written typed error hierarchies for two SDKs.'),
      ],
    }),
    I(61, 'Support custom commitment levels in the client', ['enhancement'], {
      author: 'sol-mendes', updated: ago(5),
      description: 'Allow `commitment` to be set per call and per client, defaulting to `confirmed`.',
      thread: [app('felix-quay', ago(5), 'I can add the option to both the client constructor and per-call options, with docs.')],
    }),
    I(64, 'Resubscribe websocket streams after reconnect', ['bug'], {
      author: OWEN, updated: ago(2, 14),
      description: 'Subscriptions are lost when the socket reconnects. Track active subscriptions and replay them.',
      thread: [],
    }),
    I(52, 'Publish ESM and CJS builds', ['build'], {
      author: OWEN, updated: ago(33), state: 'closed', assignees: [OWEN],
      thread: [app('ines-byte', ago(38), 'I have done dual builds with tsup; can take this.'), app('hana-grid', ago(37), 'Happy to help here.'), say(OWEN, ago(35), 'Doing this one myself, thanks both.')],
    }),
    I(44, 'Typed channel state machine', ['enhancement'], {
      author: OWEN, updated: ago(102), state: 'closed', assignees: ['mateo-rook'],
      thread: [app('mateo-rook', ago(110), 'I would model the states as a discriminated union with exhaustive transitions.'), app('sol-mendes', ago(109), 'Keen to try this.')],
    }),
  ],
  'p-quill': [
    I(88, 'Support tabs in code examples', ['enhancement', 'good first issue'], {
      author: 'hana-grid', updated: ago(0, 14),
      description: 'Let a page show the same example in several languages as tabs:\n\n```md\n:::tabs\n```ts\n...\n```\n```py\n...\n```\n:::\n```\n\nEach tab must still be run as a test.',
      thread: [
        say('hana-grid', ago(3, 2), 'Keyboard navigation between tabs is a must; see the WAI-ARIA tabs pattern.'),
        app('ines-byte', ago(0, 14), 'I built a tabbed code component for another docs site and can port the ARIA handling here.'),
      ],
    }),
    I(93, 'Render admonitions in Markdown output', ['GrainHack', 'good first issue'], {
      author: 'hana-grid', updated: ago(3),
      description: 'Support `> [!NOTE]`, `> [!WARNING]` and `> [!TIP]` blocks in rendered output, with matching styles.',
    }),
    I(95, 'Dark theme for generated sites', ['design'], { author: 'zoe-lattice', updated: ago(9), description: 'Ship a dark theme that follows `prefers-color-scheme`.' }),
    I(71, 'Link checker ignores anchors', ['bug'], { author: 'hana-grid', updated: ago(26), state: 'closed' }),
  ],
  'p-anchor': [
    I(140, 'Rate-limit anchor callbacks per account', ['GrainHack', 'security'], {
      author: 'bram-oster', updated: ago(2), description: 'Callbacks can be triggered in a tight loop. Add a per-account token bucket with sane defaults.',
    }),
    I(132, 'Reject expired SEP-10 challenges early', ['security', 'good first issue'], {
      author: 'bram-oster', updated: ago(4), description: 'Expired challenges are only rejected after signature verification. Check the time bounds first.',
      thread: [app('dara-loop', ago(4), 'Small change with a clear test; I can have this up today.')],
    }),
    I(127, 'Add structured logging', ['enhancement'], {
      author: 'bram-oster', updated: ago(1, 6), assignees: [MIRA], description: 'Move to `slog` with request ids on every line.',
      thread: [app(MIRA, ago(9), 'I have migrated two Go services to slog; I will keep the log keys stable for existing dashboards.'), say('bram-oster', ago(8), 'Assigned, thanks!')],
    }),
  ],
  'p-orbit': [
    I(63, 'Warn before signing unknown messages', ['GrainHack', 'security'], {
      author: 'zoe-lattice', updated: ago(3), assignees: [MIRA],
      description: 'When a dApp asks to sign a message that is not a known transaction type, show a full-screen warning with the raw bytes.',
    }),
    I(41, 'Show token balances with the correct decimals', ['bug', 'good first issue'], {
      author: 'zoe-lattice', updated: ago(6), description: 'Balances for tokens with 8 decimals render 100x too large.',
      thread: [app('wren-codes', ago(6), 'Found the formatter bug; fix plus tests incoming.')],
    }),
    I(58, 'Keyboard shortcuts for the account switcher', ['enhancement'], { author: 'ike-nwosu', updated: ago(12), description: 'Cmd/Ctrl+1..9 to switch accounts.' }),
  ],
  'p-brine': [
    I(22, 'Index module events by handle', ['GrainHack', 'enhancement'], { author: 'ravi-forge', updated: ago(5), description: 'Add an index on (account, handle, sequence) and a query endpoint.' }),
    I(17, 'Backfill from a checkpoint', ['enhancement'], { author: 'ravi-forge', updated: ago(15), description: 'Resume a backfill from the last committed checkpoint instead of genesis.' }),
  ],
  'p-sieve': [
    I(31, 'Add a filter for token transfers', ['GrainHack', 'enhancement'], {
      author: 'elif-stack', updated: ago(1), assignees: [MIRA], description: 'Filter transfer instructions by mint and amount range.',
    }),
    I(17, 'Document the filter DSL', ['documentation', 'good first issue'], { author: 'elif-stack', updated: ago(7), description: 'The DSL has no reference page. Write one with an example per operator.' }),
    I(26, 'Wallet address allowlist filter', ['enhancement'], {
      author: 'mateo-rook', updated: ago(1, 8), description: 'Only pass events touching a configured set of wallet addresses.',
      thread: [app(MIRA, ago(1, 8), 'I would load the allowlist into a hash set at startup and reload it on SIGHUP, with a benchmark against 100k addresses.')],
    }),
  ],
  'p-perch': [
    I(12, 'Plot ledger close times', ['enhancement', 'good first issue'], { author: 'elif-stack', updated: ago(8), description: 'Add a notebook that charts ledger close time percentiles per day.' }),
    I(9, 'Export notebooks as HTML', ['enhancement'], { author: 'elif-stack', updated: ago(18), state: 'closed', assignees: [MIRA], thread: [app(MIRA, ago(30), 'I can add an `export` command using nbconvert with the site theme.')] }),
  ],
}

const projectIndex = Object.fromEntries(PROJECTS.map((p, i) => [p.id, i]))
/** GitHub's global issue id: what the dashboard puts in ?issue=. */
export const issueId = (projectId, number) => 2400000000 + (projectIndex[projectId] ?? 9) * 10000 + number
const LABEL_COLORS = { bug: 'd73a4a', documentation: '0075ca', enhancement: 'a2eeef', 'good first issue': '7057ff', 'help wanted': '008672', GrainHack: 'c9983a', security: 'e99695', performance: 'fbca04', testing: 'bfd4f2', design: 'f9d0c4', build: 'ededed' }

function buildIssue(projectId, d) {
  const p = projectById[projectId]
  const id = issueId(projectId, d.number)
  const comments = d.thread.map((c) => {
    const cid = commentSeq++
    return {
      id: cid,
      body: c.kind === 'app' ? applyBody(c.login, c.message, p.github_full_name, d.number, id, projectId) : c.body,
      user: { login: c.login },
      created_at: c.when,
      updated_at: c.when,
    }
  })
  return {
    github_issue_id: id,
    number: d.number,
    state: d.state,
    title: d.title,
    description: d.description ?? null,
    author_login: d.author,
    assignees: d.assignees.map((login) => ({ login, avatar_url: avatar(login) })),
    labels: d.labels.map((name) => ({ name, color: LABEL_COLORS[name] ?? 'ededed' })),
    comments_count: comments.length,
    comments,
    url: `https://github.com/${p.github_full_name}/issues/${d.number}`,
    updated_at: d.updated,
    last_seen_at: ago(0, 1),
  }
}

export const ISSUES = Object.fromEntries(Object.entries(ISSUE_DEFS).map(([pid, list]) => [pid, list.map((d) => buildIssue(pid, d))]))

const publicIssue = ({ assignees, comments, comments_count, ...rest }) => rest

// --- Pull requests -------------------------------------------------------------

const PR = (number, title, author, state, created, opts = {}) => ({ number, title, author, state, created, ...opts })
const PR_DEFS = {
  'p-ledger': [
    PR(236, 'Retry channel close with capped backoff', MIRA, 'open', ago(1, 4)),
    PR(235, 'Snapshot format reference (docs)', 'jun-okafor', 'open', ago(0, 9)),
    PR(233, 'Fsync the directory after segment rename', OWEN, 'merged', ago(2, 5), { closed: ago(1, 2) }),
    PR(232, 'Bump criterion to 0.6', 'deps-bot', 'merged', ago(4), { closed: ago(3, 6) }),
    PR(230, 'Faster varint decoding', 'priya-kern', 'closed', ago(6), { closed: ago(5) }),
    PR(229, 'Metrics feature flag skeleton', 'kofi-ade', 'merged', ago(12), { closed: ago(10) }),
    PR(226, 'Remove unused serde derive', 'arun-patch', 'merged', ago(37), { closed: ago(36) }),
    PR(221, 'Document compaction triggers', 'lena-marsh', 'merged', ago(64), { closed: ago(61) }),
    PR(214, 'Snapshot verification on load', OWEN, 'merged', ago(96), { closed: ago(94) }),
    PR(207, 'Batch fsync behind a config flag', 'tomas-rivet', 'merged', ago(128), { closed: ago(125) }),
  ],
  'p-tide': [
    PR(71, 'Typed RpcTimeoutError', 'noor-writes', 'open', ago(0, 18)),
    PR(70, 'Resubscribe after reconnect', 'sol-mendes', 'open', ago(3)),
    PR(68, 'Per-call commitment option', 'felix-quay', 'merged', ago(5, 2), { closed: ago(4, 1) }),
    PR(66, 'Drop Node 16 from CI', OWEN, 'merged', ago(19), { closed: ago(19) }),
    PR(63, 'Experimental React hooks', 'hana-grid', 'closed', ago(27), { closed: ago(22) }),
    PR(60, 'ESM and CJS builds', OWEN, 'merged', ago(34), { closed: ago(33) }),
    PR(55, 'Retry idempotent RPC calls', 'ines-byte', 'merged', ago(88), { closed: ago(85) }),
    PR(49, 'Typed channel events', 'mateo-rook', 'merged', ago(141), { closed: ago(137) }),
  ],
  'p-quill': [
    PR(97, 'Tabbed code examples', 'ines-byte', 'open', ago(0, 11)),
    PR(96, 'Admonition blocks', MIRA, 'open', ago(2)),
    PR(75, 'Link checker follows anchors', MIRA, 'merged', ago(27), { closed: ago(26) }),
    PR(74, 'Faster incremental builds', 'hana-grid', 'merged', ago(30), { closed: ago(29) }),
  ],
  'p-anchor': [
    PR(143, 'Structured logging with slog', MIRA, 'open', ago(1, 6)),
    PR(141, 'Check SEP-10 time bounds first', 'dara-loop', 'merged', ago(3), { closed: ago(2) }),
    PR(138, 'Per-account callback limiter (draft)', 'bram-oster', 'closed', ago(14), { closed: ago(9) }),
  ],
  'p-orbit': [
    PR(66, 'Fix decimals in balance formatter', 'wren-codes', 'open', ago(5)),
    PR(61, 'Account switcher shortcuts', 'ike-nwosu', 'merged', ago(20), { closed: ago(18) }),
  ],
  'p-brine': [PR(25, 'Checkpointed backfill', 'ravi-forge', 'merged', ago(11), { closed: ago(9) })],
  'p-sieve': [
    PR(34, 'Token transfer filter', MIRA, 'open', ago(1)),
    PR(29, 'Program id filter', 'elif-stack', 'merged', ago(16), { closed: ago(15) }),
  ],
  'p-perch': [
    PR(11, 'HTML export with site theme', MIRA, 'merged', ago(20), { closed: ago(18) }),
    PR(10, 'Fee percentile notebook', 'elif-stack', 'merged', ago(44), { closed: ago(43) }),
  ],
}

export const PRS = Object.fromEntries(
  Object.entries(PR_DEFS).map(([pid, list]) => [
    pid,
    list.map((d) => {
      const merged = d.state === 'merged'
      return {
        github_pr_id: 5100000000 + projectIndex[pid] * 10000 + d.number,
        number: d.number,
        state: merged ? 'closed' : d.state,
        title: d.title,
        author_login: d.author,
        url: `https://github.com/${projectById[pid].github_full_name}/pull/${d.number}`,
        merged,
        created_at: d.created,
        updated_at: d.closed ?? d.created,
        closed_at: d.state === 'open' ? null : d.closed,
        merged_at: merged ? d.closed : null,
        last_seen_at: ago(0, 1),
      }
    }),
  ]),
)

// --- Filters, search, leaderboard -------------------------------------------

const filters = {
  languages: [...new Set(PROJECTS.map((p) => p.language))].sort(),
  categories: [...new Set(PROJECTS.map((p) => p.category))].sort(),
  tags: [...new Set(PROJECTS.flatMap((p) => p.tags))].sort(),
}

function listProjects(req) {
  const q = query(req)
  const eco = q.get('ecosystem')?.toLowerCase()
  const lang = q.get('language')
  const cat = q.get('category')
  const tags = q.get('tags')?.split(',').filter(Boolean) ?? []
  const list = PROJECTS.filter(
    (p) =>
      (!eco || p.ecosystem.toLowerCase() === eco || ecoByName[p.ecosystem]?.slug === eco) &&
      (!lang || p.language === lang) &&
      (!cat || p.category === cat) &&
      tags.every((t) => p.tags.includes(t)),
  )
    // Newest first, as the backend's List() orders them (created_at DESC).
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(publicProject)
  return { projects: list, total: list.length, limit: Number(q.get('limit') ?? 50), offset: 0 }
}

function search(req) {
  const q = (query(req).get('q') ?? '').toLowerCase().trim()
  if (!q) return { projects: [], issues: [], contributors: [] }
  const hit = (s) => (s ?? '').toLowerCase().includes(q)
  const projects = PROJECTS.filter((p) => hit(p.github_full_name) || hit(p.description) || hit(p.language) || p.tags.some(hit)).map((p) => ({
    id: p.id, github_full_name: p.github_full_name, description: p.description, ecosystem_name: p.ecosystem,
  }))
  const issues = Object.entries(ISSUES).flatMap(([pid, list]) =>
    list
      .filter((i) => i.state === 'open' && (hit(i.title) || hit(i.description) || hit(projectById[pid].language)))
      .map((i) => ({ id: String(i.github_issue_id), title: i.title, number: i.number, project_id: pid, project_full_name: projectById[pid].github_full_name })),
  )
  const contributors = CONTRIBUTOR_BOARD.all
    .filter((c) => hit(c.username) || c.ecosystems.some(hit) || (q === 'rust' && ['priya-kern', 'ravi-forge', MIRA].includes(c.username)))
    .map((c) => ({ login: c.username, user_id: c.user_id, avatar_url: avatar(c.username), contributions: c.merged_prs * 3 + 4 }))
  return { projects, issues: issues.slice(0, 12), contributors: contributors.slice(0, 8) }
}

const TIERS = [
  [5, 'conqueror', 'Conqueror'],
  [10, 'ace', 'Ace'],
  [20, 'crown', 'Crown'],
  [50, 'diamond', 'Diamond'],
  [100, 'gold', 'Gold'],
  [500, 'silver', 'Silver'],
  [Infinity, 'bronze', 'Bronze'],
]
export const TIER_COLORS = { conqueror: '#FFD700', ace: '#FF6B6B', crown: '#4ECDC4', diamond: '#95E1D3', gold: '#F7DC6F', silver: '#C0C0C0', bronze: '#CD7F32', unranked: '#7a6b5a' }
export const tierFor = (rank) => {
  const [, tier, name] = TIERS.find(([max]) => rank <= max)
  return { tier, name, color: TIER_COLORS[tier] }
}

// Two orderings of the same people: this season (90 days) and all time.
const SEASON = ['priya-kern', 'jun-okafor', MIRA, 'noor-writes', 'felix-quay', 'ines-byte', 'kofi-ade', 'lena-marsh', 'dara-loop', 'wren-codes', 'sol-mendes', 'hana-grid', 'tomas-rivet', 'elif-stack', 'ravi-forge', 'arun-patch', 'yuki-tern', 'bram-oster', 'mateo-rook', 'zoe-lattice', 'ike-nwosu', OWEN]
const ALL_TIME = ['jun-okafor', 'hana-grid', 'priya-kern', 'elif-stack', MIRA, 'bram-oster', 'lena-marsh', 'felix-quay', 'ravi-forge', 'noor-writes', 'kofi-ade', OWEN, 'ines-byte', 'sol-mendes', 'zoe-lattice', 'dara-loop', 'tomas-rivet', 'wren-codes', 'arun-patch', 'mateo-rook', 'yuki-tern', 'ike-nwosu']
const ECO_OF = (login, i) => (i % 3 === 0 ? ['Solana', 'Stellar'] : i % 3 === 1 ? ['Solana'] : ['Aptos', 'Stellar'])
const userIdOf = (login) => (login === MIRA ? personas.contributor.id : login === OWEN ? personas.maintainer.id : `u-${login}`)

function board(order, top) {
  return order.map((login, i) => {
    const rank = i + 1
    const t = tierFor(rank)
    const merged = Math.max(1, Math.round(top * Math.pow(0.86, i)))
    return { rank, rank_tier: t.tier, rank_tier_name: t.name, username: login, avatar: avatar(login), user_id: userIdOf(login), merged_prs: merged, ecosystems: ECO_OF(login, i), score: merged * 10 + (20 - Math.min(i, 20)) }
  })
}
export const CONTRIBUTOR_BOARD = { season: board(SEASON, 31), all: board(ALL_TIME, 118) }

function leaderboard(req) {
  const q = query(req)
  const win = q.get('window') === 'all' ? 'all' : 'season'
  const eco = q.get('ecosystem')?.toLowerCase()
  const limit = Number(q.get('limit') ?? 10)
  const offset = Number(q.get('offset') ?? 0)
  const rows = CONTRIBUTOR_BOARD[win].filter((r) => !eco || r.ecosystems.some((e) => e.toLowerCase() === eco))
  return rows.slice(offset, offset + limit)
}

function projectBoard(req) {
  const q = query(req)
  const win = q.get('window') === 'all' ? 'all' : 'season'
  const scale = win === 'all' ? 4 : 1
  const rows = Object.keys(ORGS).map((org, i) => {
    const projects = PROJECTS.filter((p) => orgOf(p.github_full_name) === org)
    const contributors = projects.reduce((s, p) => s + p.contributors, 0) * (win === 'all' ? 2 : 1)
    const merged = (PRS[projects[0].id]?.filter((x) => x.merged).length ?? 3) * 3 * scale + 5 - i
    return {
      rank: i + 1,
      name: org,
      logo: avatar(org),
      contributors,
      merged_prs: merged,
      open_issues: projects.reduce((s, p) => s + publicProject(p).open_issues_count, 0),
      activity: i < 2 ? 'High' : i < 3 ? 'Medium' : 'Low',
      ecosystems: [...new Set(projects.map((p) => p.ecosystem))],
      score: contributors * 10 + merged * 5,
    }
  })
  return { projects: rows, total: rows.length, limit: 100, offset: 0 }
}

// --- Organisation pages ---------------------------------------------------------

function orgSummary(login) {
  const o = ORGS[login]
  const projects = PROJECTS.filter((p) => orgOf(p.github_full_name) === login)
  return {
    login,
    avatar_url: avatar(login),
    repo_count: projects.length,
    stars_count: projects.reduce((s, p) => s + p.stars, 0),
    contributors_count: projects.reduce((s, p) => s + p.contributors, 0),
    merged_prs_count: projects.reduce((s, p) => s + (PRS[p.id]?.filter((x) => x.merged).length ?? 0), 0) * 7,
    rank_position: o.rank,
    rank_tier: o.tier,
    rank_tier_name: o.tier[0].toUpperCase() + o.tier.slice(1),
    rank_tier_color: TIER_COLORS[o.tier],
    average_rating: o.rating,
    ratings_count: o.ratings,
  }
}

function orgActivity(login) {
  const rnd = seeded(login.length * 97)
  return {
    weeks: Array.from({ length: 12 }, (_, i) => ({
      week_start: ago((11 - i) * 7 + 0).slice(0, 10),
      issues_opened: Math.round(2 + rnd() * 9),
      prs_merged: Math.round(1 + rnd() * 7 + i * 0.3),
    })),
  }
}

const RATING_TEXT = [
  [5, 'Fast, kind reviews. My first PR was merged in two days.'],
  [5, 'Issues are well scoped and the acceptance criteria are clear.'],
  [4, 'Great maintainers; CI is a bit slow on Rust changes.'],
  [5, 'They explained the architecture on the issue before I started. Made it easy.'],
  [4, 'Good first issues really are good first issues.'],
  [3, 'Took a week to get a review, but the feedback was useful.'],
]
function orgRatings(login) {
  const raters = ['jun-okafor', 'priya-kern', 'lena-marsh', 'noor-writes', 'felix-quay', MIRA]
  const ratings = raters.map((u, i) => ({
    rating: RATING_TEXT[i][0],
    comment: RATING_TEXT[i][1],
    created_at: ago(3 + i * 9),
    updated_at: ago(3 + i * 9),
    user_id: userIdOf(u),
    display_name: u,
    avatar_url: avatar(u),
    github_login: u,
  }))
  return { ratings, total: ORGS[login].ratings }
}

// --- Profiles ---------------------------------------------------------------------

const rankBadge = (login) => {
  const s = CONTRIBUTOR_BOARD.season.find((r) => r.username === login)
  const a = CONTRIBUTOR_BOARD.all.find((r) => r.username === login)
  const t = s ? tierFor(s.rank) : { tier: 'unranked', name: 'Unranked', color: TIER_COLORS.unranked }
  const ta = a ? tierFor(a.rank) : { tier: 'unranked', name: 'Unranked', color: TIER_COLORS.unranked }
  return {
    position: s?.rank ?? null, tier: t.tier, tier_name: t.name, tier_color: t.color, merged_prs: s?.merged_prs ?? 0, window: 'season',
    all_time: { position: a?.rank ?? null, tier: ta.tier, tier_name: ta.name, tier_color: ta.color, merged_prs: a?.merged_prs ?? 0 },
  }
}

const PROFILE_STATS = {
  [MIRA]: {
    contributions_count: 146, projects_contributed_to_count: 6, projects_led_count: 0, rewards_count: 9,
    languages: [{ language: 'Rust', contribution_count: 58 }, { language: 'TypeScript', contribution_count: 51 }, { language: 'Go', contribution_count: 24 }, { language: 'Python', contribution_count: 13 }],
    ecosystems: [{ ecosystem_name: 'Solana', contribution_count: 72 }, { ecosystem_name: 'Stellar', contribution_count: 47 }, { ecosystem_name: 'Aptos', contribution_count: 27 }],
    bio: 'Rust and TypeScript. I like small, well-tested pull requests and docs that stay true.', website: 'https://mira.example.dev', twitter: 'mira_codes', discord: 'mira.dev', telegram: 'mira_dev', linkedin: 'https://www.linkedin.example/in/mira-castellan',
    kyc_verified: true, seed: 11, led: [], contributed: ['p-ledger', 'p-tide', 'p-quill', 'p-anchor', 'p-sieve', 'p-perch'],
  },
  [OWEN]: {
    contributions_count: 212, projects_contributed_to_count: 3, projects_led_count: 2, rewards_count: 4,
    languages: [{ language: 'Rust', contribution_count: 140 }, { language: 'TypeScript', contribution_count: 72 }],
    ecosystems: [{ ecosystem_name: 'Solana', contribution_count: 212 }],
    bio: 'Maintainer of ledgerline and tide-sdk at Tidewater Labs.', website: 'https://tidewater.example', twitter: 'owen_maintains', discord: 'owen.h',
    kyc_verified: true, seed: 23, led: ['p-ledger', 'p-tide'], contributed: ['p-ledger', 'p-tide', 'p-anchor'],
  },
}
const genericStats = (login) => ({
  contributions_count: 40 + login.length * 3, projects_contributed_to_count: 3, projects_led_count: 0, rewards_count: 2,
  languages: [{ language: 'TypeScript', contribution_count: 22 }, { language: 'Go', contribution_count: 14 }],
  ecosystems: [{ ecosystem_name: 'Solana', contribution_count: 20 }, { ecosystem_name: 'Stellar', contribution_count: 16 }],
  bio: '', kyc_verified: false, seed: login.length, led: [], contributed: ['p-quill', 'p-anchor', 'p-sieve'],
})
const statsFor = (login) => PROFILE_STATS[login] ?? genericStats(login)

const profileProject = (pid) => {
  const p = projectById[pid]
  return { id: p.id, github_full_name: p.github_full_name, status: 'verified', ecosystem_name: p.ecosystem, language: p.language, owner_avatar_url: avatar(orgOf(p.github_full_name)) }
}

/** The login a profile request is about: ?login=, ?user_id=, or the signed-in persona. */
function whoFor(req, selfLogin) {
  const q = query(req)
  const id = q.get('user_id')
  const login = q.get('login')
  if (login) return Object.values(personas).find((p) => p.id === login)?.login ?? login
  if (id) return Object.values(personas).find((p) => p.id === id)?.login ?? id.replace(/^u-/, '')
  return selfLogin
}

function ownProfile(login) {
  const s = statsFor(login)
  return {
    contributions_count: s.contributions_count, projects_contributed_to_count: s.projects_contributed_to_count, projects_led_count: s.projects_led_count,
    rewards_count: s.rewards_count, languages: s.languages, ecosystems: s.ecosystems, kyc_verified: s.kyc_verified, rank: rankBadge(login),
    bio: s.bio, website: s.website, telegram: s.telegram, linkedin: s.linkedin, twitter: s.twitter, discord: s.discord,
  }
}

function publicProfile(login) {
  const s = statsFor(login)
  return {
    login, user_id: userIdOf(login), avatar_url: avatar(login),
    contributions_count: s.contributions_count, projects_contributed_to_count: s.projects_contributed_to_count, projects_led_count: s.projects_led_count,
    languages: s.languages, ecosystems: s.ecosystems, bio: s.bio, website: s.website, telegram: s.telegram, linkedin: s.linkedin, twitter: s.twitter, discord: s.discord,
    kyc_verified: s.kyc_verified, rank: rankBadge(login),
  }
}

function activityFor(login) {
  const items = []
  for (const [pid, list] of Object.entries(PRS)) {
    for (const pr of list) {
      if (pr.author_login !== login) continue
      items.push({ type: 'pull_request', id: String(pr.github_pr_id), number: pr.number, title: pr.title, url: pr.url, state: pr.state, date: pr.created_at, project_name: projectById[pid].github_full_name, project_id: pid, merged: pr.merged, draft: false })
    }
  }
  for (const [pid, list] of Object.entries(ISSUES)) {
    for (const i of list) {
      if (i.author_login !== login && !i.assignees.some((a) => a.login === login)) continue
      items.push({ type: 'issue', id: String(i.github_issue_id), number: i.number, title: i.title, url: i.url, state: i.state, date: i.updated_at, project_name: projectById[pid].github_full_name, project_id: pid })
    }
  }
  // Older history so the timeline spans several months.
  const older = [
    ['p-ledger', 188, 'Handle short reads in the segment reader', 70],
    ['p-tide', 44, 'Typed channel state machine', 102],
    ['p-quill', 61, 'Run examples in parallel', 131],
    ['p-anchor', 118, 'Configurable SEP-24 timeouts', 158],
  ]
  for (const [pid, n, title, d] of older) {
    items.push({ type: 'pull_request', id: `old-${pid}-${n}`, number: n, title, url: `https://github.com/${projectById[pid].github_full_name}/pull/${n}`, state: 'closed', date: ago(d), project_name: projectById[pid].github_full_name, project_id: pid, merged: true, draft: false })
  }
  items.sort((a, b) => b.date.localeCompare(a.date))
  return items.map((x) => ({ ...x, month_year: new Date(x.date).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }))
}

// --- Contributor's own issue applications (Contributors > Contributions) ------

export function issueApplicationsFor(login) {
  const out = []
  for (const [pid, list] of Object.entries(ISSUES)) {
    for (const i of list) {
      const mine = i.comments.find((c) => c.user.login === login && c.body.includes('has applied to work on this issue'))
      if (!mine) continue
      const p = projectById[pid]
      const assigned = i.assignees.some((a) => a.login === login)
      const pr = PRS[pid]?.find((x) => x.author_login === login && (x.state === 'open' || x.merged))
      let status = 'applied'
      if (assigned) status = pr ? (pr.merged ? 'complete' : 'pending_review') : 'assigned'
      out.push({
        id: `ia-${pid}-${i.number}`, status, project_id: pid, project_name: p.github_full_name, issue_number: i.number, issue_title: i.title, issue_url: i.url,
        labels: i.labels.map((l) => l.name), applied_at: mine.created_at, ...(assigned ? { assigned_at: ago(5) } : {}),
        ...(status === 'pending_review' || status === 'complete' ? { pr_number: pr.number, pr_url: pr.url, pr_title: pr.title, pr_created_at: pr.created_at, ...(pr.merged ? { pr_merged_at: pr.merged_at } : {}) } : {}),
      })
    }
  }
  // p-ledger #219 is assigned with a PR open, but the PR does not link the issue yet.
  return out.map((a) => (a.project_id === 'p-ledger' && a.issue_number === 219 ? { ...a, status: 'assigned', pr_number: undefined, pr_url: undefined, pr_title: undefined, pr_created_at: undefined } : a))
}

// --- The API map -------------------------------------------------------------------

/** Projects this persona owns, as GET /projects/mine returns them. */
export function mineFor(key) {
  const owned = PROJECTS.filter((p) => p.owner === key).map((p) => ({
    id: p.id, github_full_name: p.github_full_name, github_repo_id: p.github_repo_id, status: 'verified', ecosystem_name: p.ecosystem, language: p.language,
    tags: p.tags, category: p.category, description: p.description, verification_error: null, verified_at: p.created, webhook_created_at: p.created,
    webhook_id: 40000000 + p.github_repo_id % 1000, webhook_url: 'https://api.grainlify.example/webhooks/github', owner_avatar_url: avatar(orgOf(p.github_full_name)),
    created_at: p.created, updated_at: ago(0, 6), needs_metadata: false,
  }))
  if (key === 'maintainer') {
    owned.push({
      id: PENDING_PROJECT.id, github_full_name: PENDING_PROJECT.github_full_name, github_repo_id: PENDING_PROJECT.github_repo_id, status: 'verified', ecosystem_name: 'Solana',
      language: 'Rust', tags: [], category: '', description: PENDING_PROJECT.description, verification_error: null, verified_at: ago(0, 3), webhook_created_at: ago(0, 3),
      webhook_id: 40000120, webhook_url: 'https://api.grainlify.example/webhooks/github', owner_avatar_url: avatar('tidewater-labs'), created_at: ago(0, 3), updated_at: ago(0, 3), needs_metadata: true,
    })
  }
  return owned
}

export function projectsApi(personaKey) {
  const self = personas[personaKey].login
  const api = {
    '/projects': listProjects,
    '/projects/recommended': { projects: [...PROJECTS].sort((a, b) => b.contributors - a.contributors).map(publicProject) },
    '/projects/filters': filters,
    '/projects/mine': mineFor(personaKey),
    '/projects/pending-setup': personaKey === 'maintainer' ? [PENDING_PROJECT] : [],
    '/ecosystems': { ecosystems: ECOSYSTEMS.map((e) => ({ ...eco(e), about: undefined, links: undefined, key_areas: undefined, technologies: undefined })) },
    '/search': search,
    '/leaderboard': leaderboard,
    '/leaderboard/projects': projectBoard,
    '/stats/landing': { active_projects: PROJECTS.length, contributors: 187, grants_distributed_usd: 48250 },
    '/profile': ownProfile(self),
    '/profile/public': (req) => publicProfile(whoFor(req, self)),
    '/profile/calendar': (req) => calendar(statsFor(whoFor(req, self)).seed * 131, whoFor(req, self) === OWEN ? 1.3 : 1),
    '/profile/activity': (req) => {
      const all = activityFor(whoFor(req, self))
      const q = query(req)
      const limit = Number(q.get('limit') ?? 50)
      const offset = Number(q.get('offset') ?? 0)
      return { activities: all.slice(offset, offset + limit), total: all.length, limit, offset }
    },
    '/profile/projects': (req) => statsFor(whoFor(req, self)).contributed.map(profileProject),
    '/profile/projects-led': (req) => statsFor(whoFor(req, self)).led.map(profileProject),
    '/issue-applications/me': { issue_applications: issueApplicationsFor(self) },
  }
  for (const e of ECOSYSTEMS) api[`/ecosystems/${e.id}`] = ecoDetail(e)
  for (const p of PROJECTS) {
    api[`/projects/${p.id}`] = projectDetail(p)
    api[`/projects/${p.id}/issues/public`] = { issues: (ISSUES[p.id] ?? []).map(publicIssue) }
    api[`/projects/${p.id}/issues`] = { issues: ISSUES[p.id] ?? [] }
    api[`/projects/${p.id}/prs/public`] = { prs: PRS[p.id] ?? [] }
    api[`/projects/${p.id}/prs`] = { prs: PRS[p.id] ?? [] }
    for (const i of ISSUES[p.id] ?? []) {
      const comment = (login) => ({ ok: true, comment: { id: commentSeq + i.number, body: `**@${login} has applied to work on this issue as part of the Grainlify program.**`, user: { login }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })
      api[`POST /projects/${p.id}/issues/${i.number}/apply`] = comment(self)
      for (const action of ['assign', 'unassign', 'reject', 'withdraw']) api[`POST /projects/${p.id}/issues/${i.number}/${action}`] = { ok: true }
    }
  }
  api[`/projects/${PENDING_PROJECT.id}`] = { ...projectDetail({ ...PROJECTS[0], ...PENDING_PROJECT, stars: 41, contributors: 3, tags: [], created: ago(0, 3), ecosystem: 'Solana' }) }
  api[`PUT /projects/${PENDING_PROJECT.id}/metadata`] = { ok: true }
  // Installed a moment ago: nothing synced yet.
  api[`/projects/${PENDING_PROJECT.id}/issues`] = { issues: [] }
  api[`/projects/${PENDING_PROJECT.id}/issues/public`] = { issues: [] }
  api[`/projects/${PENDING_PROJECT.id}/prs`] = { prs: [] }
  api[`/projects/${PENDING_PROJECT.id}/prs/public`] = { prs: [] }
  for (const login of Object.keys(ORGS)) {
    api[`/orgs/${login}`] = orgSummary(login)
    api[`/orgs/${login}/activity`] = orgActivity(login)
    api[`/orgs/${login}/calendar`] = calendar(login.length * 53, 1.6)
    api[`/orgs/${login}/links`] = ORGS[login].links
    api[`/orgs/${login}/ratings`] = orgRatings(login)
    api[`/orgs/${login}/ratings/me`] = { eligible: true, rating: login === 'tidewater-labs' && personaKey === 'contributor' ? { rating: 5, comment: 'Clear issues and fast reviews.', created_at: ago(12), updated_at: ago(12) } : null }
  }
  return api
}

function eco(e) {
  const projects = PROJECTS.filter((p) => p.ecosystem === e.name)
  return {
    id: e.id, slug: e.slug, name: e.name, description: e.description, logo_url: e.logo_url, website_url: e.website_url, status: e.status,
    project_count: projects.length, user_count: projects.reduce((s, p) => s + p.contributors, 0), created_at: e.created_at, updated_at: ago(2),
    about: e.about, links: e.links, key_areas: e.key_areas, technologies: e.technologies,
  }
}

function ecoDetail(e) {
  const projects = PROJECTS.filter((p) => p.ecosystem === e.name).map(publicProject)
  const { user_count, ...rest } = eco(e)
  return {
    ...rest,
    contributors_count: user_count,
    open_issues_count: projects.reduce((s, p) => s + p.open_issues_count, 0),
    open_prs_count: projects.reduce((s, p) => s + p.open_prs_count, 0),
  }
}

/** The admin list: every ecosystem, including an inactive one. */
export const adminEcosystems = () => ({ ecosystems: [...ECOSYSTEMS, INACTIVE_ECOSYSTEM].map((e) => (e.status === 'inactive' ? { ...eco(e), project_count: 0, user_count: 0 } : eco(e))) })
export const adminEcosystem = (e) => (e.status === 'inactive' ? { ...eco(e), project_count: 0, user_count: 0 } : eco(e))
export { ahead }
