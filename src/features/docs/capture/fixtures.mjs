// Fixture data for the docs captures. Every person, organisation and
// repository here is invented: no real user's name or avatar appears in the docs.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { NOW } from './lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

export const personas = {
  contributor: { id: 'u-mira', login: 'mira-dev', role: 'contributor' },
}

const repo = (id, full, language, category, stars, contributors, issues, ecosystem, description) => ({
  id, github_full_name: full, language, tags: ['good first issue'], category, stars_count: stars, forks_count: Math.round(stars / 6),
  contributors_count: contributors, open_issues_count: issues, open_prs_count: 3, ecosystem_name: ecosystem, ecosystem_slug: ecosystem?.toLowerCase() ?? null,
  description, created_at: '2025-11-02T10:00:00Z', updated_at: '2026-09-20T10:00:00Z',
})

const PROJECTS = [
  repo('p-ledger', 'tidewater-labs/ledgerline', 'Rust', 'Infrastructure', 1840, 42, 18, 'Solana', 'A fast append-only ledger for payment channels.'),
  repo('p-quill', 'northfield-oss/quill-docs', 'TypeScript', 'Developer tools', 960, 27, 11, 'Stellar', 'Docs generator that keeps examples tested.'),
  repo('p-orbit', 'saltmarsh/orbit-wallet', 'TypeScript', 'Wallets', 612, 19, 9, 'Aptos', 'A small, auditable browser wallet.'),
  repo('p-sieve', 'kestrel-data/sieve', 'Go', 'Data', 455, 14, 7, 'Solana', 'Stream filters for on-chain events.'),
]

const issue = (n, title, labels) => ({
  github_issue_id: 700000 + n, number: n, state: 'open', title, description: null, author_login: 'owen-maintains',
  labels: labels.map((name) => ({ name })), url: `https://github.com/example/issues/${n}`,
  updated_at: '2026-09-19T12:00:00Z', last_seen_at: '2026-09-20T12:00:00Z',
})

const ISSUES = {
  'p-ledger': [issue(212, 'Document the snapshot format', ['documentation', 'good first issue']), issue(219, 'Retry failed channel close with backoff', ['bug'])],
  'p-quill': [issue(88, 'Support tabs in code examples', ['enhancement', 'good first issue'])],
  'p-orbit': [issue(41, 'Show a warning before signing unknown messages', ['security', 'help wanted'])],
  'p-sieve': [issue(17, 'Add a filter for token transfers', ['enhancement'])],
}

export const discoverApi = {
  '/projects/recommended': { projects: PROJECTS },
  ...Object.fromEntries(Object.entries(ISSUES).map(([id, issues]) => [`/projects/${id}/issues/public`, { issues }])),
  '/stats/landing': { active_projects: 0, contributors: 0, grants_distributed_usd: 0 },
}

// --- The wallet link flow ---------------------------------------------------

export const SOLANA_ADDRESS = '7Qm9YtVx3sLhE2pWcNaK5dRfG8uB4jZ6oTnHqPiXkM1s'

export const walletLinkApi = {
  '/me/bounty-wallet/link': (req) =>
    req.method() === 'POST'
      ? { linked: true, wallet: SOLANA_ADDRESS, githubLogin: personas.contributor.login, replaced: null, unchanged: false }
      : { linked: false },
  '/me/bounty-wallet/challenge': {
    message: `Grainlify: link this wallet to my GitHub account\nGitHub: ${personas.contributor.login} (id 90412277)\nWallet: ${SOLANA_ADDRESS}\nNonce: 3f9c2a71d04b4e18a6c5f0e2b7d91c44\nIssued: 2026-09-21T09:02:00Z\nExpires: 2026-09-21T09:12:00Z`,
    countersignature: 'Q09VTlRFUlNJR04=',
    expires_at: new Date(NOW.getTime() + 10 * 60_000).toISOString(),
  },
}

/** A Solana Wallet Standard wallet that announces itself as Phantom, with Phantom's real icon. */
export function phantomWallet() {
  const icon = 'data:image/svg+xml;base64,' + readFileSync(path.join(ROOT, 'public/wallets/phantom.svg')).toString('base64')
  return {
    fn: ([address, icon]) => {
      const account = { address, publicKey: new Uint8Array(32), chains: ['solana:mainnet'], features: ['solana:signMessage'] }
      const wallet = {
        version: '1.0.0', name: 'Phantom', icon, chains: ['solana:mainnet', 'solana:devnet'], accounts: [],
        features: {
          'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [account] }) },
          'solana:signMessage': { version: '1.0.0', signMessage: async ({ message }) => [{ signedMessage: message, signature: new Uint8Array(64).fill(7) }] },
        },
      }
      const register = (api) => api.register(wallet)
      window.addEventListener('wallet-standard:app-ready', (e) => register(e.detail))
      window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }))
    },
    arg: [SOLANA_ADDRESS, icon],
  }
}
