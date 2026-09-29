// Verifies the fixture world: visits every screen as each persona at 1440x900
// (light), records page errors, API calls the world does not answer, and how
// much text rendered, and saves a screenshot of each.
//
//   node src/features/docs/capture/world/check.mjs              every page
//   node src/features/docs/capture/world/check.mjs search admin  only pages whose name contains a word
//
// Uses the dev server at BASE (default http://127.0.0.1:5230) when it is up,
// and starts its own otherwise. Writes world/CHECK.md and
// capture/out/world/<persona>-<name>.png (out/ is gitignored). Exits 1 when a
// page has a page error, an unanswered call that is not listed as optional, or
// is missing the text that proves its data rendered.

import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { openPage, settle, assertRendered } from '../lib.mjs'
import { world, issueId, DRAW_DEMO_BOUNTY_ID } from './index.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../../../..')
const SHOTS = path.join(HERE, '../out/world')
mkdirSync(SHOTS, { recursive: true })

// Calls a page makes that are fine to leave unanswered (none known today).
const OPTIONAL = new Set([])

// --- Steps ---------------------------------------------------------------------------

const click = (name, opts = {}) => async (page) => {
  await page.getByRole(opts.role ?? 'button', { name, exact: opts.exact ?? false }).first().click()
}
const clickText = (text) => async (page) => {
  await page.getByText(text, { exact: false }).first().click()
}
/** Scrolls so the element with this text sits just under the fixed header. */
const scrollTo = (text) => async (page) => {
  const el = page.getByText(text, { exact: false }).first()
  await el.waitFor({ timeout: 15000 })
  await el.evaluate((node) => {
    const target = node.closest('section, [class*="rounded-[24px]"], [class*="rounded-[16px]"]') ?? node
    target.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -84)
  })
}
const all = (...steps) => async (page) => {
  for (const s of steps) {
    await s(page)
    await waitStable(page)
  }
}

const ISSUE = (pid, n, extra = '') => `/dashboard?${extra}issue=${issueId(pid, n)}&iproject=${pid}`

// --- The pages -----------------------------------------------------------------------

const C = 'contributor'
const M = 'maintainer'
const A = 'admin'

const PAGES = [
  // Contributor
  { persona: C, name: 'discover', url: '/dashboard', expect: 'Recommended Projects', note: 'Discover: recommended projects and open issues from them.' },
  { persona: C, name: 'browse-orgs', url: '/dashboard?tab=browse', expect: 'tidewater-labs', note: 'Browse, Organizations view: four organisations with repo, star and contributor counts.' },
  { persona: C, name: 'browse-repos', url: '/dashboard?tab=browse', steps: click('Repositories'), expect: 'orbit-wallet', note: 'Browse, Repositories view: all eight projects with language and tags.' },
  { persona: C, name: 'project', url: '/dashboard?tab=browse&project=p-ledger&from=browse', expect: 'Document the snapshot format', note: 'Project page for ledgerline: README, languages, contributors, open issues and recent PRs.' },
  { persona: C, name: 'issue-apply', url: ISSUE('p-quill', 88), expect: 'Apply for this issue', note: 'Open, unassigned issue quill-docs #88 with one application from someone else; Apply button shown.' },
  { persona: C, name: 'issue-own-application', url: ISSUE('p-tide', 57), steps: expandApplication('mira-dev'), expect: 'Withdraw', note: "tide-sdk #57: mira-dev's own pending application (expanded, with Withdraw) next to another applicant's." },
  { persona: C, name: 'issue-assigned', url: ISSUE('p-ledger', 219), expect: 'already assigned', note: 'ledgerline #219, assigned to mira-dev: applications closed, discussion thread.' },
  { persona: C, name: 'issue-grainhack', url: ISSUE('p-ledger', 224), expect: 'Part of GrainHack Autumn 2026', note: 'GrainHack issue ledgerline #224: the apply panel with acceptance criteria, tier and a closing window.' },
  { persona: C, name: 'org', url: '/dashboard?tab=org&org=tidewater-labs', expect: 'Fast, kind reviews', note: 'Organisation profile for tidewater-labs: rank, rating, links, activity, repositories and ratings.' },
  { persona: C, name: 'ecosystems', url: '/dashboard?tab=ecosystems', expect: 'Aptos', note: 'Ecosystems list: Solana, Stellar and Aptos with project and contributor counts.' },
  { persona: C, name: 'ecosystem-detail', url: '/dashboard?tab=ecosystems', steps: clickText('Solana'), expect: 'Payments infrastructure', note: 'Solana ecosystem detail: about, key areas, technologies and its projects.' },
  { persona: C, name: 'contributors-contributions', url: '/dashboard?tab=contributors', expect: 'Typed errors for RPC timeouts', note: 'Contributions board: Applied (2), Assigned, Pending review (PR linked) and Complete (merged).' },
  { persona: C, name: 'contributors-projects', url: '/dashboard?tab=contributors', steps: click('Projects', { exact: true }), expect: 'anchorage', note: 'Contributors > Projects: the six projects mira-dev has contributed to.' },
  { persona: C, name: 'contributors-rewards', url: '/dashboard?tab=contributors', steps: click('Rewards', { exact: true }), expect: '10.00', note: 'Contributors > Rewards: past points redemptions (paid and rejected).' },
  { persona: C, name: 'grainhack-events', url: '/dashboard?tab=osw', expect: 'GrainHack Summer 2026', note: 'GrainHack events in five phases: live, applications open, issue prep, closed, results published.' },
  { persona: C, name: 'grainhack-event', url: '/dashboard?tab=osw', steps: clickText('GrainHack Autumn 2026'), expect: 'Benchmark snapshot writes under load', note: 'Live event detail: prize pool, dates and six issues with open, upcoming, closed and assigned windows.' },
  { persona: C, name: 'my-grainhack-assignments', url: '/dashboard?tab=my-grainhack&subtab=assignments', expect: 'orbit-wallet', note: 'My assignments: an active one with a stale timer, one with a PR submitted, one completed, one released.' },
  { persona: C, name: 'my-grainhack-applications', url: '/dashboard?tab=my-grainhack&subtab=applications', expect: 'assignment slots', note: 'My applications: applied, won, lost, refused by a gate (with the reason) and withdrawn.' },
  { persona: C, name: 'my-grainhack-results', url: '/dashboard?tab=my-grainhack&subtab=results', expect: 'Appeal this result', note: 'My results: three verdicts with cited criteria; one appealable, one appeal pending, one appeal decided.' },
  { persona: C, name: 'my-grainhack-rules', url: '/dashboard?tab=my-grainhack&subtab=rules', expect: 'Hard gates', note: 'GrainHack rules: every section of settings with values, the prior-completion cap note.' },
  { persona: C, name: 'bounties', url: '/dashboard?tab=bounties', expect: 'Document the filter DSL', note: 'Bounties: status notice, linked wallet, open bounties (applied / apply), not-yet-open, held, in review, awaiting approval, paid and a test bounty.' },
  { persona: C, name: 'bounties-unlinked', url: '/dashboard?tab=bounties', opts: { wallet: 'unlinked' }, expect: 'No wallet linked', note: 'Bounties with no wallet linked: the Link your wallet prompt.' },
  { persona: C, name: 'bounties-ledger', url: '/dashboard?tab=bounties&subtab=ledger', expect: 'Receipt chain', note: 'Bounty ledger: totals, inference budget, receipt chain and events of every kind.' },
  { persona: C, name: 'leaderboard-contributors', url: '/dashboard?tab=leaderboard', expect: 'priya-kern', note: 'Leaderboard, contributors, this season: podium and ranked table with tiers.' },
  { persona: C, name: 'leaderboard-contributors-alltime', url: '/dashboard?tab=leaderboard', steps: click('All time'), expect: 'hana-grid', note: 'Leaderboard, contributors, all time.' },
  { persona: C, name: 'leaderboard-projects', url: '/dashboard?tab=leaderboard', steps: click('Projects', { exact: true }), expect: 'kestrel-data', note: 'Leaderboard, projects (organisations), this season.' },
  { persona: C, name: 'leaderboard-projects-alltime', url: '/dashboard?tab=leaderboard', steps: all(click('Projects', { exact: true }), click('All time')), expect: 'kestrel-data', note: 'Leaderboard, projects, all time.' },
  { persona: C, name: 'blog', url: '/dashboard?tab=blog', note: 'Grainlify blog (static content).' },
  { persona: C, name: 'support', url: '/dashboard?tab=support', expect: 'Received', note: 'Support: the report form and four previous reports.' },
  { persona: C, name: 'notifications', url: '/dashboard?tab=notifications', expect: 'You won the draw', note: 'Notifications: eleven notifications of ten types, four unread.' },
  { persona: C, name: 'profile', url: '/dashboard?tab=profile', expect: 'Contributions', note: "mira-dev's own profile: rank, calendar, languages, ecosystems, projects and activity." },
  { persona: C, name: 'search-wallet', url: '/dashboard?tab=search', steps: typeSearch('wallet'), expect: 'orbit-wallet', note: 'Search "wallet": projects and issues.' },
  { persona: C, name: 'search-ledger', url: '/dashboard?tab=search', steps: typeSearch('ledger'), expect: 'ledgerline', note: 'Search "ledger": projects and issues.' },
  { persona: C, name: 'search-rust', url: '/dashboard?tab=search', steps: typeSearch('rust'), expect: 'brine-indexer', note: 'Search "rust": Rust projects, issues and contributors.' },
  { persona: C, name: 'settings-profile', url: '/dashboard?tab=settings&subtab=profile', expect: 'Castellan', note: 'Settings > Profile: every field filled.', expectValue: true },
  { persona: C, name: 'settings-notifications', url: '/dashboard?tab=settings&subtab=notifications', expect: 'Issue assigned', note: 'Settings > Notifications: in-app and email toggles per type.' },
  { persona: C, name: 'settings-referrals', url: '/dashboard?tab=settings&subtab=referrals', expect: 'MIRA-7K2Q', note: 'Settings > Referrals: code, link, 5 referred (2 pending, 3 completed).' },
  { persona: C, name: 'settings-rewards', url: '/dashboard?tab=settings&subtab=rewards', expect: 'Founding member', note: 'Settings > Rewards: founding position #37, follow proof approved.' },
  { persona: C, name: 'settings-rewards-none', url: '/dashboard?tab=settings&subtab=rewards', opts: { follow: 'none' }, expect: 'Not in the Founding Contributor Pool yet', note: 'Rewards, nothing submitted: the proof upload form.' },
  { persona: C, name: 'settings-rewards-pending', url: '/dashboard?tab=settings&subtab=rewards', opts: { follow: 'pending' }, expect: 'Not in the Founding Contributor Pool yet', note: 'Rewards, proof pending review.' },
  { persona: C, name: 'settings-rewards-rejected', url: '/dashboard?tab=settings&subtab=rewards', opts: { follow: 'rejected' }, expect: "doesn't show a follow", note: 'Rewards, proof rejected with the reason.' },
  { persona: C, name: 'settings-payout', url: '/dashboard?tab=settings&subtab=payout', expect: '0x5c3a', note: 'Settings > Payout: readiness Ready, registered Aptos address, payout contact.' },
  { persona: C, name: 'settings-payout-claim', url: '/dashboard?tab=settings&subtab=payout', opts: { claim: true }, expect: 'Claim 48.25 USDC', note: 'Payout with a published Founding Pool claim (48.25 USDC on Aptos testnet).' },
  { persona: C, name: 'settings-payout-register', url: '/dashboard?tab=settings&subtab=payout', opts: { readiness: 'register_now', payoutAddress: false }, expect: 'Payout', note: 'Payout with no address yet: readiness says register now.' },
  { persona: C, name: 'settings-terms', url: '/dashboard?tab=settings&subtab=terms', note: 'Settings > Terms (static).' },
  { persona: C, name: 'wallet-link', url: '/bounties/link', expect: 'Link a wallet', note: 'Wallet link page (no wallet extension in the browser, so it lists none).' },
  { persona: C, name: 'bounty-rules', url: '/bounties/rules', expect: 'follower count', note: 'Bounty rules: settings with values and overrides, and what is never weighted.' },

  // Maintainer
  { persona: M, name: 'maintainer-dashboard', url: '/dashboard?tab=maintainers&view=maintainer&subtab=Dashboard', expect: 'Pull Requests Merged', note: 'Maintainer dashboard: 7-day stats, activity feed and the applications chart.' },
  { persona: M, name: 'maintainer-issues', url: '/dashboard?tab=maintainers&view=maintainer&subtab=Issues', expect: 'Document the snapshot format', note: 'Maintainer Issues: open issues across ledgerline and tide-sdk with applicant counts.' },
  { persona: M, name: 'maintainer-prs', url: '/dashboard?tab=maintainers&view=maintainer&subtab=Pull%20Requests', expect: 'Retry channel close with capped backoff', note: 'Maintainer Pull Requests: open, merged and closed PRs.' },
  { persona: M, name: 'maintainer-issue-applications', url: ISSUE('p-ledger', 212, 'tab=maintainers&view=maintainer&'), steps: expandApplication('jun-okafor'), expect: 'Assign', note: 'ledgerline #212 in maintainer view: three applications, the first expanded with Reject and Assign.' },
  { persona: M, name: 'maintainer-issue-grainhack', url: ISSUE('p-ledger', 224, 'tab=maintainers&view=maintainer&'), expect: 'Acceptance criteria', note: 'ledgerline #224 in maintainer view: the GrainHack fields panel.' },
  { persona: M, name: 'maintainer-repos', url: '/dashboard?tab=maintainers&view=maintainer', steps: all(click('Select repositories'), clickText('tidewater-labs')), expect: 'Complete setup', note: 'Repository selector: harbor-bridge needs setup, the others are complete.' },
  { persona: M, name: 'maintainer-setup-modal', url: '/dashboard?tab=maintainers&view=maintainer', steps: all(click('Select repositories'), clickText('tidewater-labs'), click('Complete setup')), expect: 'harbor-bridge', note: 'New-project setup modal for harbor-bridge.' },
  { persona: M, name: 'maintainer-public-profile', url: '/dashboard?tab=profile&user=mira-dev', expect: 'mira-dev', note: "mira-dev's public profile, seen by a maintainer." },

  // Admin
  { persona: A, name: 'admin-reviews', url: '/dashboard?tab=admin&view=admin', expect: 'Lumen Testnet', note: 'Reviews: ecosystems management (three active, one inactive).' },
  { persona: A, name: 'admin-reviews-events', url: '/dashboard?tab=admin&view=admin', steps: scrollTo('Create and manage Open-Source Week events'), expect: 'Docs Sprint', note: 'Reviews: Open-Source Week events.' },
  { persona: A, name: 'admin-reviews-social', url: '/dashboard?tab=admin&view=admin', steps: scrollTo('Approve or reject follow proofs'), expect: 'arun-patch', note: 'Reviews: four pending follow proofs.' },
  { persona: A, name: 'admin-reviews-social-proof', url: '/dashboard?tab=admin&view=admin', steps: all(scrollTo('Approve or reject follow proofs'), clickText('arun-patch')), expect: 'arun-patch', note: 'Reviews: a follow proof expanded with both screenshots.' },
  { persona: A, name: 'admin-reviews-kyc', url: '/dashboard?tab=admin&view=admin', steps: scrollTo('Contributors waiting on an identity decision'), expect: 'tomas-rivet', note: 'Reviews: KYC queue with three people waiting.' },
  { persona: A, name: 'admin-reviews-redemptions', url: '/dashboard?tab=admin&view=admin', steps: scrollTo('Points-to-USDC requests'), expect: 'kofi-ade', note: 'Reviews: three pending redemption requests.' },
  { persona: A, name: 'admin-reviews-draw', url: '/dashboard?tab=admin&view=admin', steps: all(scrollTo('Application counts, the weighted draw'), selectBounty), expect: 'arun-patch', note: 'Reviews: bounty draw controls with a bounty selected (7 applied, 5 in the pool, 2 refused).' },
  { persona: A, name: 'admin-reviews-draw-sim', url: '/dashboard?tab=admin&view=admin', steps: all(scrollTo('Application counts, the weighted draw'), selectBounty, click('Simulate', { exact: true }), click('Yes, simulate'), scrollTo('Simulated draw')), expect: 'Simulated draw', note: 'Reviews: a simulated draw with the ticket table.' },
  { persona: A, name: 'admin-reviews-draw-settings', url: '/dashboard?tab=admin&view=admin', steps: scrollTo('weight_fit_strong'), expect: 'weight_fit_strong', note: 'Reviews: draw settings, two overridden by ada-admin.' },
  { persona: A, name: 'admin-grainhack', url: '/dashboard?tab=grainhack&view=admin', expect: 'GrainHack Winter 2026', note: 'GrainHack admin: all six events including the draft.' },
  { persona: A, name: 'admin-grainhack-applications', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Harbor Sprint'), scrollTo('Pending project applications')), expect: 'quill-docs', note: 'Harbor Sprint (application period): pending project applications to review.' },
  { persona: A, name: 'admin-grainhack-signals', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Harbor Sprint'), scrollTo('Pending project applications'), clickText('quill-docs')), expect: 'Distinct contributors', note: 'A project application expanded with its auto-collected signals.' },
  { persona: A, name: 'admin-grainhack-overview', url: '/dashboard?tab=grainhack&view=admin', steps: clickText('GrainHack Summer 2026'), expect: 'appeal', note: 'Summer 2026 (results published): phase, blocking reasons and the event form.' },
  { persona: A, name: 'admin-grainhack-draws', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Summer 2026'), scrollTo('Draws')), expect: 'priya-kern', note: 'Summer 2026 draws with seeds and winners.' },
  { persona: A, name: 'admin-grainhack-verdicts', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Summer 2026'), scrollTo('Judging')), expect: 'exceptional', note: 'Summer 2026 judging: disagreement rate (1 of 5), Needs-review filter showing the overridden verdict.' },
  { persona: A, name: 'admin-grainhack-appeals', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Summer 2026'), scrollTo('Appeals')), expect: 'protocol doc', note: 'Summer 2026 appeals: one pending, two decided, window open.' },
  { persona: A, name: 'admin-grainhack-config', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Summer 2026'), scrollTo('Rule overrides for this event')), expect: 'Hackathon setup', note: 'Summer 2026 rule overrides.' },
  { persona: A, name: 'admin-grainhack-audit', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Summer 2026'), scrollTo('Audit trail')), expect: 'payout_floor', note: 'Summer 2026 audit trail.' },
  { persona: A, name: 'admin-grainhack-live-draws', url: '/dashboard?tab=grainhack&view=admin', steps: all(clickText('GrainHack Autumn 2026'), scrollTo('Draws')), expect: 'orbit-wallet', note: 'Autumn 2026 (live) draws.' },
  { persona: A, name: 'admin-grainhack-global-settings', url: '/dashboard?tab=grainhack&view=admin&subtab=global-settings', expect: 'Global defaults', note: 'GrainHack global defaults.' },
  { persona: A, name: 'admin-grainhack-global-audit', url: '/dashboard?tab=grainhack&view=admin&subtab=global-audit', expect: 'platform_fee_pct', note: 'GrainHack global audit trail.' },
  { persona: A, name: 'admin-bounties', url: '/dashboard?tab=bounties&view=admin', expect: 'Document the filter DSL', note: 'Bounties tab as admin (the draw controls live on Reviews, not here).' },
]

function typeSearch(q) {
  return async (page) => {
    const input = page.getByPlaceholder('Search issues, projects, contributors...')
    await input.click()
    await input.fill(q)
    await input.press('Enter')
  }
}

/** Opens an application card on the issue page (the chevron beside the applicant). */
function expandApplication(login) {
  return async (page) => {
    const card = page.locator('div.p-6', { has: page.locator('h4', { hasText: login }) }).first()
    await card.locator('button').nth(1).click()
  }
}

async function selectBounty(page) {
  await page.getByRole('combobox', { name: 'Bounty' }).selectOption(DRAW_DEMO_BOUNTY_ID)
}

// --- Running ------------------------------------------------------------------------------

/** Waits until the page's text and skeleton count stop changing. */
async function waitStable(page, maxMs = 15000) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(250)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin').length)
    if (n === last) {
      if (++same >= 4) return
    } else {
      same = 0
      last = n
    }
  }
}

async function baseUrl() {
  const want = process.env.BASE || 'http://127.0.0.1:5230'
  try {
    const r = await fetch(want)
    if (r.ok) return { base: want, close: async () => {} }
  } catch {}
  const { createServer } = await import('vite')
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5233, strictPort: false, host: '127.0.0.1' } })
  await server.listen()
  return { base: server.resolvedUrls.local[0].replace(/\/$/, ''), close: () => server.close() }
}

const only = process.argv.slice(2)
const pages = only.length ? PAGES.filter((p) => only.some((w) => `${p.persona}-${p.name}`.includes(w))) : PAGES
const { base, close } = await baseUrl()
let browser
try {
  browser = await chromium.launch()
} catch {
  browser = await chromium.launch({ channel: 'chrome' })
}

const results = []
for (const p of pages) {
  const id = `${p.persona}-${p.name}`
  const { ctx, page, unanswered } = await openPage(browser, { base, theme: 'light', width: 1440, ...world(p.persona, p.opts) })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]))
  let problem = null
  let text = 0
  try {
    await page.goto(base + p.url)
    await waitStable(page)
    if (p.steps) {
      await p.steps(page)
      await waitStable(page)
    }
    if (p.expect) {
      const loc = p.expectValue ? page.locator(`input[value*="${p.expect}"], textarea:has-text("${p.expect}")`).first() : page.getByText(p.expect, { exact: false }).first()
      await loc.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {
        problem = `expected text "${p.expect}" never appeared`
      })
    }
    await settle(page, 500)
    await assertRendered(page, id)
    text = await page.evaluate(() => document.body.innerText.trim().length)
    await page.screenshot({ path: path.join(SHOTS, `${id}.png`) })
  } catch (e) {
    problem = e.message.split('\n')[0]
    await page.screenshot({ path: path.join(SHOTS, `${id}.png`) }).catch(() => {})
  } finally {
    await ctx.close()
  }
  const missing = [...unanswered].filter((u) => !OPTIONAL.has(u))
  const ok = !problem && errors.length === 0 && missing.length === 0
  results.push({ ...p, id, errors, unanswered: [...unanswered], text, problem, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(44)} text=${String(text).padStart(6)}${errors.length ? `  errors: ${errors.join(' | ')}` : ''}${missing.length ? `  unanswered: ${missing.join(', ')}` : ''}${problem ? `  ${problem}` : ''}`)
}
await browser.close()
await close()

// --- Report ----------------------------------------------------------------------------------

if (!only.length) {
  const esc = (s) => String(s).replace(/\|/g, '\\|')
  const rows = results.map((r) =>
    `| ${r.persona} | ${r.name} | \`${esc(r.url)}\`${r.steps ? ' + steps' : ''} | ${r.errors.length ? esc(r.errors.join('; ')) : '0'} | ${r.unanswered.length ? esc(r.unanswered.join(', ')) : '0'} | ${r.text} | ${esc(r.problem ? `FAIL: ${r.problem}` : r.note)} |`,
  )
  const failed = results.filter((r) => !r.ok)
  writeFileSync(
    path.join(HERE, 'CHECK.md'),
    `# Fixture world check

Generated by \`node src/features/docs/capture/world/check.mjs\` at 1440x900, light theme, against the app with the network answered by \`world(persona)\`.
Screenshots: \`src/features/docs/capture/out/world/<persona>-<name>.png\` (gitignored).

${results.length} pages, ${failed.length} failing. Columns: page errors (uncaught exceptions), API calls the world did not answer, rendered text length (characters of \`document.body.innerText\`).

Optional unanswered calls: ${OPTIONAL.size ? [...OPTIONAL].join(', ') : 'none'}.

| Persona | Page | URL | Errors | Unanswered | Text | Visible |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}
`,
  )
  console.log(`\nWrote ${path.relative(ROOT, path.join(HERE, 'CHECK.md'))}`)
}
if (results.some((r) => !r.ok)) process.exit(1)
