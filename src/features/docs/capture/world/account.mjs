// The signed-in person's own things: notifications, settings (referrals,
// rewards, payout), support history and legacy redemptions.
//
// Billing profiles, payment methods and invoices are deliberately absent:
// the app keeps those in localStorage only.

import { ago, ahead } from './util.mjs'
import { personas, me } from './people.mjs'
import { issueId } from './projects.mjs'

const MIRA = personas.contributor.login

// --- Notifications ---------------------------------------------------------------

const N = (id, type, title, body, link_path, createdAgo, read = true) => ({
  id, type, title, body, link_path, read_at: read ? ago(Math.max(0, createdAgo[0] - 0.5)) : null, created_at: ago(...createdAgo),
})

const NOTIFICATIONS = {
  contributor: [
    N('n-c-1', 'grainhack_assigned', 'You won the draw for saltmarsh/orbit-wallet #63', 'Open a qualifying pull request within 4 days or the assignment is released.', '/dashboard?tab=my-grainhack&subtab=assignments', [0, 4], false),
    N('n-c-2', 'grainhack_event_ending', 'GrainHack Autumn 2026 ends in 7 days', 'You still hold an open assignment. Merges count until 48 hours after the event ends.', '/dashboard?tab=my-grainhack&subtab=assignments', [0, 9], false),
    N('n-c-3', 'issue_assigned', 'You were assigned tidewater-labs/ledgerline #219', 'owen-maintains assigned "Retry failed channel close with backoff" to you.', `/dashboard?tab=browse&project=p-ledger&issue=${issueId('p-ledger', 219)}`, [1, 2], false),
    N('n-c-4', 'pr_merged', 'Your pull request was merged', 'kestrel-data/perch #11 "HTML export with site theme" was merged.', '/dashboard?tab=contributors', [2, 6], false),
    N('n-c-5', 'issue_application_received', 'Application sent: tidewater-labs/tide-sdk #57', 'The maintainer has been notified. You will hear back here when they decide.', '/dashboard?tab=contributors', [2, 1]),
    N('n-c-6', 'social_follow_completed', 'Your follow proof was approved', 'You are now eligible for the Founding Contributor Pool.', '/dashboard?tab=settings&subtab=rewards', [6]),
    N('n-c-7', 'founding_position', 'You hold founding position #37', 'Your wave and multiplier are permanent. Keep a payout address registered so a settlement can reach you.', '/dashboard?tab=settings&subtab=rewards', [6, 1]),
    N('n-c-8', 'kyc_status_changed', 'Identity verified', 'Your identity verification was approved.', '/dashboard?tab=settings&subtab=payout', [8]),
    N('n-c-9', 'referral_completed', 'noor-writes finished signing up with your link', 'Their referral now counts toward your Founding Contributor Pool shares.', '/dashboard?tab=settings&subtab=referrals', [11]),
    N('n-c-10', 'issue_application_rejected', 'Application not selected: saltmarsh/brine-indexer #17', 'The maintainer chose another applicant for this issue.', '/dashboard?tab=contributors', [15]),
    N('n-c-11', 'claim_deadline', 'Your Founding Pool claim is ready', 'Claim before the window closes in 30 days. Your registered Aptos address is the claim address.', '/dashboard?tab=settings&subtab=payout', [19]),
  ],
  maintainer: [
    N('n-m-1', 'issue_application_submitted', 'tomas-rivet applied to ledgerline #212', '"First contribution here. I have read the snapshot module and can write this up..."', `/dashboard?tab=maintainers&view=maintainer&project=p-ledger&issue=${issueId('p-ledger', 212)}`, [0, 20], false),
    N('n-m-2', 'issue_application_submitted', 'priya-kern applied to ledgerline #212', '"I have contributed docs to two Rust storage crates..."', `/dashboard?tab=maintainers&view=maintainer&project=p-ledger&issue=${issueId('p-ledger', 212)}`, [1, 5], false),
    N('n-m-3', 'issue_application_submitted', 'ines-byte applied to ledgerline #238', '"I can add the error variant and a proptest..."', `/dashboard?tab=maintainers&view=maintainer&project=p-ledger&issue=${issueId('p-ledger', 238)}`, [0, 7], false),
    N('n-m-4', 'issue_application_submitted', 'noor-writes applied to tide-sdk #57', '"Happy to take this; I have written typed error hierarchies..."', `/dashboard?tab=maintainers&view=maintainer&project=p-tide&issue=${issueId('p-tide', 57)}`, [1, 2]),
    N('n-m-5', 'grainhack_application_accepted', 'ledgerline was accepted into GrainHack Harbor Sprint', 'Label issues with "grainhack" during issue prep to enter them.', '/dashboard?tab=osw', [3]),
    N('n-m-6', 'pr_merged', 'Your pull request was merged', 'tidewater-labs/ledgerline #233 "Fsync the directory after segment rename" was merged.', '/dashboard?tab=maintainers&view=maintainer&subtab=Pull%20Requests', [1, 2]),
  ],
  admin: [
    N('n-a-1', 'kyc_status_changed', 'Two verifications are waiting for review', 'The provider sent two sessions to manual review.', '/dashboard?tab=admin&view=admin', [0, 3], false),
    N('n-a-2', 'social_follow_completed', 'Follow proofs waiting', 'Four follow proofs are pending review.', '/dashboard?tab=admin&view=admin', [0, 8], false),
    N('n-a-3', 'grainhack_issue_cap_exceeded', 'northfield-oss hit the issue cap for GrainHack Autumn 2026', 'A 13th issue was labelled; max_issues_per_org is 12.', '/dashboard?tab=grainhack&view=admin', [2]),
  ],
}

const ALL_TYPES = [
  'issue_assigned', 'issue_application_submitted', 'issue_application_rejected', 'issue_application_received', 'pr_merged', 'reward_received',
  'referral_completed', 'social_follow_completed', 'kyc_reset', 'kyc_status_changed', 'claim_deadline', 'founding_position', 'redemption_paid',
  'redemption_rejected', 'grainhack_issue_cap_exceeded', 'grainhack_application_accepted', 'grainhack_application_reviewed', 'grainhack_assigned',
  'grainhack_assignment_released', 'grainhack_event_ending',
]
const EMAIL_OFF = new Set(['pr_merged', 'issue_application_received', 'referral_completed', 'grainhack_issue_cap_exceeded'])
const preferences = () => ({ preferences: ALL_TYPES.map((type) => ({ type, in_app: true, email: !EMAIL_OFF.has(type) })) })

// --- Rewards: founding pool and the social-follow proof ---------------------------

export const followVariants = {
  none: { platforms: [], submitted: false, status: null, decision_reason: null, decided_at: null, eligible: false },
  pending: { platforms: ['linkedin', 'x'], submitted: true, status: 'pending', decision_reason: null, decided_at: null, eligible: false },
  approved: { platforms: ['linkedin', 'x'], submitted: true, status: 'approved', decision_reason: null, decided_at: ago(6), eligible: true },
  rejected: {
    platforms: ['linkedin', 'x'], submitted: true, status: 'rejected', decided_at: ago(2),
    decision_reason: "X proof doesn't show a follow: the screenshot shows the profile page but not the Following button. Upload one that shows it.", eligible: false,
  },
}
const foundingFor = (follow) =>
  follow === 'approved' ? { member: true, wave: 'founding', multiplier: 1.5, sequence_number: 37, shares: { verified_account: 0.1, merged_pr: 5, referrals: 1.0 } } : { member: false }

// --- Payout (Aptos testnet) -------------------------------------------------------

export const APTOS_CHAIN = 'aptos-testnet'
export const APTOS_ADDRESS = '0x5c3a9f2e81b04d6a7e19c2f4b8d03a6e5f71c29d84b0e3a6f1c5d9e2b7a40f18'

const readiness = {
  ready: { chain_id: APTOS_CHAIN, may_be_owed: true, basis: 'founding_member', has_verified_address: true, action_required: false, state: 'ready', excluded_from: [] },
  register_now: { chain_id: APTOS_CHAIN, may_be_owed: true, basis: 'founding_member', has_verified_address: false, action_required: true, state: 'register_now', excluded_from: [] },
  not_applicable: { chain_id: APTOS_CHAIN, may_be_owed: false, basis: 'none', has_verified_address: false, action_required: false, state: 'not_applicable', excluded_from: [] },
  excluded_from_published: {
    chain_id: APTOS_CHAIN, may_be_owed: true, basis: 'founding_member', has_verified_address: true, action_required: true, state: 'excluded_from_published',
    excluded_from: [{ settlement_id: 'st-founding-aug-26', excluded_reason: 'no_address', remedy: 'contact_support' }],
  },
}

const CLAIM = {
  settlement_id: 'st-founding-sep-26',
  chain_id: APTOS_CHAIN,
  pool: 'founding',
  escrow_address: '0x9e1f4b7c2a58d03e6f91b24c7d8a5e30f16b92c4d7e8a1f03b5c6d9e2f4a7b801',
  contract_address: '0x2d7b9e4f1a6c83d05e72f94b1c8a6d3e0f5b27c9e4d81a6f3b0c5e8d2a9f7c14',
  network: 'testnet',
  explorer_url_template: 'https://explorer.aptoslabs.example/txn/%s?network=testnet',
  asset: { symbol: 'USDC', decimals: 6 },
  amount_minor: '48250000',
  amount: '48.25',
  claim_address: APTOS_ADDRESS,
  claim_address_verified_at: ago(20),
  address_status: 'current',
  current_address: APTOS_ADDRESS,
  identity_hash: '0x71c4e2b9a05d3f6e8c1b47a92d0e5f3c6b8a1d49e7f20c3b5a6d8e1f4c7b9a02',
  leaf_hash: '0x3e8a1c5f7b92d04e6a1f38c5b7d90e2a4c6f81b3d5e7a90c2e4f6b8d1a3c5e7f9',
  leaf_index: 36,
  proof: [
    '0x9b2d4f6a8c0e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d',
    '0x1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a',
    '0x5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e',
  ],
  root: '0x8d0e2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d',
  published_tx: '0xa4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6',
}

// --- Support, redemptions ------------------------------------------------------------

const SUPPORT = {
  contributor: [
    { id: 'sr-7f3a2c91', category: 'bug', message: 'The issue list on Browse jumps back to the top after I close an issue.', page_url: '/dashboard?tab=browse', status: 'received', created_at: ago(3, 5), delivered_to_team: true, has_screenshot: true },
    { id: 'sr-1b9e44d0', category: 'help', message: 'How do I change the Aptos address a claim is paid to?', page_url: '/dashboard?tab=settings&subtab=payout', status: 'received', created_at: ago(12), delivered_to_team: true, has_screenshot: false },
    { id: 'sr-c02d7e55', category: 'kyc', message: 'Verification timed out on the selfie step. Can it be reset?', page_url: '/dashboard?tab=settings&subtab=billing', status: 'received', created_at: ago(27), delivered_to_team: false, has_screenshot: false },
    { id: 'sr-9e41a3b7', category: 'idea', message: 'Let me filter Discover by language.', page_url: '/dashboard', status: 'received', created_at: ago(44), delivered_to_team: true, has_screenshot: false },
  ],
  maintainer: [
    { id: 'sr-44d1e0a2', category: 'help', message: 'The GitHub App shows as installed but harbor-bridge still needs setup.', page_url: '/dashboard?tab=maintainers&view=maintainer', status: 'received', created_at: ago(1, 4), delivered_to_team: true, has_screenshot: true },
  ],
  admin: [],
}

const STELLAR = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG'
const MY_REDEMPTIONS = {
  contributor: [
    { id: 'rd-3a1f', points_spent: 500, usdc_amount: '5.00', stellar_wallet_address: STELLAR, status: 'paid', created_at: ago(86) },
    { id: 'rd-7c22', points_spent: 1000, usdc_amount: '10.00', stellar_wallet_address: STELLAR, status: 'paid', created_at: ago(61) },
    { id: 'rd-9e04', points_spent: 250, usdc_amount: '2.50', stellar_wallet_address: STELLAR, status: 'rejected', created_at: ago(40) },
  ],
}

// --- The API map ------------------------------------------------------------------------

/**
 * @param {'contributor'|'maintainer'|'admin'} personaKey
 * @param {{follow?: 'none'|'pending'|'approved'|'rejected', readiness?: keyof typeof readiness, payoutAddress?: boolean, claim?: boolean}} opts
 */
export function accountApi(personaKey, { follow = 'approved', readiness: ready = 'ready', payoutAddress = true, claim = false } = {}) {
  const notifications = NOTIFICATIONS[personaKey]
  return {
    '/me': me(personaKey),
    '/auth/github/status': { linked: true, github: { id: 90412277, login: personas[personaKey].login } },
    '/notifications/': (req) => {
      const unread = new URL(req.url()).searchParams.get('unread_only') === 'true'
      return { notifications: unread ? notifications.filter((n) => !n.read_at) : notifications }
    },
    '/notifications/unread-count': { count: notifications.filter((n) => !n.read_at).length },
    'POST /notifications/read-all': { ok: true },
    ...Object.fromEntries(notifications.map((n) => [`POST /notifications/${n.id}/read`, { ok: true }])),
    '/notifications/preferences': preferences(),
    'PUT /notifications/preferences': { ok: true },
    'PUT /profile/update': { message: 'Profile updated' },
    'PUT /profile/avatar': { message: 'Avatar updated', avatar_url: me(personaKey).avatar_url },
    'POST /me/github/resync': { github: me(personaKey).github },
    '/referrals/me': {
      code: personaKey === 'contributor' ? 'MIRA-7K2Q' : personaKey === 'maintainer' ? 'OWEN-3H8D' : 'ADA-1X0P',
      total_referred: 5, pending: 2, completed: 3, points_earned: 0, points_per_referral: 0, referral_window_days: 30,
    },
    '/points/me': { balance: 0, usdc_per_point: 0.01, min_redemption_points: 500 },
    '/founding/me': foundingFor(follow),
    '/social-follow/me': followVariants[follow],
    'POST /social-follow/submit': { id: 'sf-new-1', status: 'pending' },
    '/auth/kyc/status': { status: 'verified', session_id: 'kyc-sess-4410', verified_at: ago(8) },
    'POST /auth/kyc/start': { session_id: 'kyc-sess-5521', url: 'https://verify.example/session/kyc-sess-5521' },
    '/me/claims': { claims: claim ? [CLAIM] : [] },
    [`/me/claims/${CLAIM.settlement_id}`]: CLAIM,
    '/me/payout-readiness': readiness[ready],
    ...(payoutAddress ? { 'GET /me/payout-address': { chain_id: APTOS_CHAIN, address: APTOS_ADDRESS, verified_at: ago(20) } } : {}),
    'POST /me/payout-address/challenge': {
      nonce: '9d41c7e2b05a4f3e8c16',
      message: `Grainlify payout address\nChain: ${APTOS_CHAIN}\nAddress: ${APTOS_ADDRESS}\nAccount: ${personas[personaKey].login}`,
      expires_at: ahead(0, 0, 10),
    },
    'POST /me/payout-address': { chain_id: APTOS_CHAIN, address: APTOS_ADDRESS, verified_at: new Date().toISOString(), replaced: payoutAddress ? { address: '0x1b7e4c9a2f05d38e6a14c7b9d2e0f53a8c6b1d49e2f70a3c5b8d6e1f9a4c7b20', superseded_at: new Date().toISOString() } : null },
    '/me/payout-contact': { email: personaKey === 'contributor' ? 'mira@mira.example.dev' : '' },
    'PUT /me/payout-contact': { email: personaKey === 'contributor' ? 'mira@mira.example.dev' : '' },
    '/support-requests/mine': { support_requests: SUPPORT[personaKey], total: SUPPORT[personaKey].length },
    'POST /support-requests': { ok: true, support_id: 'sr-5d20be71', delivered: ['telegram'] },
    '/redemptions/me': { redemptions: MY_REDEMPTIONS[personaKey] ?? [] },
  }
}

export { MIRA }
