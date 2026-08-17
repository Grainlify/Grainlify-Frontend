#!/usr/bin/env node
/**
 * Is the work actually live?
 *
 * This exists because "verified" meant somebody looking at a page and
 * believing it, and that failed three ways in one session: work reported as
 * shipped that was never committed, work merged but not yet deployed, and a
 * suite of 665 passing tests run against a tree that never left the machine.
 * None of those are visible from inside the code, and no test can catch them,
 * because the gap is between the tree and production.
 *
 * Three mechanical conditions, all of which must hold:
 *
 *   1. the working tree is clean            (git status --porcelain is empty)
 *   2. local HEAD equals origin/<branch>    (it is pushed and merged)
 *   3. the deployed artifact reports that same commit
 *
 * The third is what makes the claim falsifiable. Without it the first two only
 * prove the code reached GitHub, which is not where users are.
 *
 * ORIGIN MODE (--origin, or VERIFY_FROM_ORIGIN=1)
 *
 * Conditions 1 and 2 are statements about a working tree, and they stop being
 * true of YOUR work the moment a tree is shared. When a second session was
 * editing the same backend checkout, this reported FAIL twice for a deploy
 * that was entirely correct: local HEAD was somebody else's commit and the
 * tree was dirty with somebody else's files. Neither fact was about the thing
 * being verified.
 *
 * A check that cries wolf is one you start ignoring, and that is how a real
 * gap gets through. Origin mode drops conditions 1 and 2 and compares
 * origin/<branch> directly against what the deployed artifact reports - which
 * is the question that actually matters ("is what we merged what is running?")
 * and is the same answer for everyone regardless of whose tree it runs in.
 *
 * It is deliberately NOT the default. In a tree you own, "my HEAD is pushed
 * and my tree is clean" is exactly the sloppiness this script was written to
 * catch, and origin mode cannot see it.
 *
 * Exits non-zero on any failure AND on any inability to check. "Could not
 * confirm" is not a pass - reporting done on an unreachable check is the same
 * mistake in a different coat.
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const FRONTEND_URL = process.env.VERIFY_FRONTEND_URL || 'https://grainlify.com'
const BACKEND_URL = process.env.VERIFY_BACKEND_URL || 'https://api.grainlify.com'
const BACKEND_REPO = process.env.VERIFY_BACKEND_REPO || resolve(process.cwd(), '..', 'Grainlify-Backend')
const BRANCH = process.env.VERIFY_BRANCH || 'main'
const TIMEOUT_MS = 20000
// Compare against origin/<branch> rather than the local tree. For shared
// checkouts, where local HEAD and a dirty status say nothing about the change
// being verified.
const FROM_ORIGIN = process.argv.includes('--origin') || process.env.VERIFY_FROM_ORIGIN === '1'

let failed = false
const say = (ok, label, detail) => {
  if (!ok) failed = true
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `\n         ${detail}` : ''}`)
}

function git(repo, args) {
  return execSync(`git -C ${JSON.stringify(repo)} ${args}`, { encoding: 'utf8' }).trim()
}

async function fetchText(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return { error: `HTTP ${res.status}` }
    return { text: await res.text() }
  } catch (e) {
    return { error: e.name === 'AbortError' ? `timed out after ${TIMEOUT_MS}ms` : String(e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

/** Conditions 1 and 2, for one repository. */
function checkRepo(name, repo) {
  if (!existsSync(repo)) {
    say(false, `${name}: repository at ${repo}`, 'not found - set VERIFY_BACKEND_REPO')
    return null
  }
  let remote = ''
  try {
    git(repo, `fetch --quiet origin ${BRANCH}`)
    remote = git(repo, `rev-parse origin/${BRANCH}`)
  } catch (e) {
    say(false, `${name}: could not read origin/${BRANCH}`, String(e.message || e))
    return null
  }

  if (FROM_ORIGIN) {
    // The tree is not the subject. Say which commit is being verified, so the
    // looser check is never mistaken for the strict one in a scrollback.
    say(true, `${name}: verifying origin/${BRANCH}`, `${remote.slice(0, 8)} (tree not checked)`)
    return { head: remote, remote }
  }

  const dirty = git(repo, 'status --porcelain')
  // Untracked-but-ignored files are not work; anything else is. Reported in
  // full rather than counted, because "3 files" sends you looking.
  say(dirty === '', `${name}: working tree clean`, dirty || undefined)

  const head = git(repo, 'rev-parse HEAD')
  say(head === remote, `${name}: HEAD is origin/${BRANCH}`,
    head === remote
      ? undefined
      : `local ${head.slice(0, 8)} vs origin ${remote.slice(0, 8)} - not merged, not pulled, ` +
        `or this tree is shared (try --origin)`)
  return { head, remote }
}

/** Condition 3: ask the running thing what it is. */
async function checkFrontendDeploy(expected) {
  const { text, error } = await fetchText(FRONTEND_URL)
  if (error) return say(false, `frontend: ${FRONTEND_URL} reachable`, error)

  const m = text.match(/<meta\s+name=["']grainlify:commit["']\s+content=["']([^"']*)["']/i)
  if (!m) {
    return say(false, 'frontend: build reports its commit',
      'no grainlify:commit meta tag - the deployed build predates this check, which is itself a failure to confirm')
  }
  const live = m[1]
  if (!live || live === 'unknown' || live === '%VITE_BUILD_COMMIT%') {
    return say(false, 'frontend: build reports its commit',
      `reported "${live}" - the platform supplied no commit at build time, so this cannot be confirmed either way`)
  }
  say(live === expected, 'frontend: deployed commit matches HEAD',
    live === expected ? `${live.slice(0, 8)}` : `live ${live.slice(0, 8)} vs expected ${expected.slice(0, 8)} - the change is NOT live`)
}

async function checkBackendDeploy(expected) {
  const { text, error } = await fetchText(`${BACKEND_URL}/version`)
  if (error) return say(false, `backend: ${BACKEND_URL}/version reachable`, error)

  let body
  try {
    body = JSON.parse(text)
  } catch {
    return say(false, 'backend: /version returns JSON', text.slice(0, 120))
  }
  if (!body.commit_known || !body.commit) {
    return say(false, 'backend: build reports its commit',
      'commit_known is false - the platform supplied no commit, so this cannot be confirmed either way')
  }
  say(body.commit === expected, 'backend: deployed commit matches HEAD',
    body.commit === expected ? `${body.commit.slice(0, 8)}` : `live ${body.commit.slice(0, 8)} vs expected ${expected.slice(0, 8)} - the change is NOT live`)
}

console.log(`\nverify-deployed${FROM_ORIGIN ? ' (origin mode: comparing origin/' + BRANCH + ' to production)' : ''}\n`)

const fe = checkRepo('frontend', process.cwd())
const be = checkRepo('backend ', BACKEND_REPO)

if (fe?.head) await checkFrontendDeploy(fe.head)
if (be?.head) await checkBackendDeploy(be.head)

console.log('')
if (failed) {
  console.log('NOT VERIFIED - do not report this as shipped.\n')
  process.exit(1)
}
console.log('Verified: the live artifacts report the commits on origin/' + BRANCH + '.\n')
