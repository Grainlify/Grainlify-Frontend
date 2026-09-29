// Extra API answers for the paid-rewards-account screenshots, merged over
// world('contributor', ...).api in shots/paid-rewards-account.mjs.
//
// Only states the shared world does not have: a pool place without an
// approved follow, a revoked follow, an exclusion with no address yet, an
// empty payout contact, a notification list and support history without
// anything the docs leave out (identity verification, claims, billing).

import { ago } from './util.mjs'
import { APTOS_ADDRESS, APTOS_CHAIN } from './account.mjs'
import { issueId } from './projects.mjs'

/** No payout contact saved: the field shows its empty prompt. */
export const noPayoutContact = { '/me/payout-contact': { email: '' } }

/** A saved payout contact, so Save and Remove both show. */
export const savedPayoutContact = { '/me/payout-contact': { email: 'mira@example.com' } }

/** Left out of a published payout for having no address, and still without one. */
export const excludedNoAddress = {
  '/me/payout-readiness': {
    chain_id: APTOS_CHAIN, may_be_owed: true, basis: 'founding_member', has_verified_address: false, action_required: true,
    state: 'excluded_from_published', excluded_from: [{ settlement_id: 'st-founding-aug-26', excluded_reason: 'no_address', remedy: 'contact_support' }],
  },
  '/me/claims': { claims: [] },
}

/** A Founding place (#37, x1.5) whatever the follow state. */
export const foundingPlace = {
  '/founding/me': { member: true, wave: 'founding', multiplier: 1.5, sequence_number: 37, shares: { verified_account: 0.1, merged_pr: 5, referrals: 1.0 } },
}

/** A follow proof approved, then withdrawn. */
export const revokedFollow = {
  '/social-follow/me': {
    platforms: ['linkedin', 'x'], submitted: true, status: 'revoked', decided_at: ago(3), eligible: false,
    decision_reason: 'A recheck found that the LinkedIn account no longer follows Grainlify.',
  },
}

/** A rejected follow proof with a short reason. */
export const rejectedFollow = {
  '/social-follow/me': {
    platforms: ['linkedin', 'x'], submitted: true, status: 'rejected', decided_at: ago(2), eligible: false,
    decision_reason: "The X screenshot doesn't show which account is following.",
  },
}

// --- Notifications: twelve, three unread, over today, this week and earlier ------------

const N = (id, type, title, body, link_path, when, read = true) => ({
  id, type, title, body, link_path, read_at: read ? when : null, created_at: when,
})

const NOTIFICATIONS = [
  N('n-x-1', 'issue_assigned', 'You were assigned tidewater-labs/ledgerline #219', 'owen-maintains assigned "Retry failed channel close with backoff" to you.', `/dashboard?tab=browse&project=p-ledger&issue=${issueId('p-ledger', 219)}`, ago(0, 0, 40), false),
  N('n-x-2', 'pr_merged', 'Your pull request was merged', 'kestrel-data/perch #11 "HTML export with site theme" was merged.', '/dashboard?tab=contributors', ago(0, 2, 10), false),
  N('n-x-3', 'grainhack_event_ending', 'GrainHack Autumn 2026 ends in 7 days', 'You still hold an open assignment. Merges count until 48 hours after the event ends.', '/dashboard?tab=my-grainhack&subtab=assignments', ago(0, 3, 5)),
  N('n-x-4', 'social_follow_completed', 'Your follow proof was approved', 'You are now eligible for the Founding Contributor Pool.', '/dashboard?tab=settings&subtab=rewards', ago(1, 4), false),
  N('n-x-5', 'issue_application_received', 'Application sent: tidewater-labs/tide-sdk #57', 'The maintainer has been notified. You will hear back here when they decide.', '/dashboard?tab=contributors', ago(2, 1)),
  N('n-x-6', 'referral_completed', 'noor-writes finished signing up with your link', 'Their referral now counts toward your Founding Contributor Pool shares.', '/dashboard?tab=settings&subtab=referrals', ago(3, 6)),
  N('n-x-7', 'founding_position', 'You hold founding position #37', 'Your wave and multiplier are permanent.', '/dashboard?tab=settings&subtab=rewards', ago(4, 2)),
  N('n-x-8', 'issue_application_rejected', 'Application not selected: saltmarsh/brine-indexer #17', 'The maintainer chose another applicant for this issue.', '/dashboard?tab=contributors', ago(8)),
  N('n-x-9', 'pr_merged', 'Your pull request was merged', 'northfield-oss/quill-docs #91 "Tabs in code examples" was merged.', '/dashboard?tab=contributors', ago(11, 3)),
  N('n-x-10', 'issue_application_received', 'Application sent: northfield-oss/quill-docs #88', 'The maintainer has been notified. You will hear back here when they decide.', '/dashboard?tab=contributors', ago(13)),
  N('n-x-11', 'referral_completed', 'felix-quay finished signing up with your link', 'Their referral now counts toward your Founding Contributor Pool shares.', '/dashboard?tab=settings&subtab=referrals', ago(17)),
  N('n-x-12', 'issue_assigned', 'You were assigned saltmarsh/orbit-wallet #41', 'owen-maintains assigned "Show a warning before signing unknown messages" to you.', `/dashboard?tab=browse&project=p-orbit&issue=${issueId('p-orbit', 41)}`, ago(22)),
]

export const notifications = {
  '/notifications/': (req) => {
    const q = new URL(req.url()).searchParams
    let list = q.get('unread_only') === 'true' ? NOTIFICATIONS.filter((n) => !n.read_at) : NOTIFICATIONS
    const offset = Number(q.get('offset') ?? 0)
    const limit = Number(q.get('limit') ?? list.length)
    list = list.slice(offset, offset + limit)
    return { notifications: list }
  },
  '/notifications/unread-count': { count: NOTIFICATIONS.filter((n) => !n.read_at).length },
  ...Object.fromEntries(NOTIFICATIONS.map((n) => [`POST /notifications/${n.id}/read`, { ok: true }])),
}

// --- Support history: a Bug whose team alert failed, a Help and an Idea -------------------

const REPORTS = [
  { id: 'sr-7f3a2c91', category: 'bug', message: 'The issue list on Browse jumps back to the top after I close an issue.', page_url: '/dashboard?tab=browse', status: 'received', created_at: ago(3, 5), delivered_to_team: false, has_screenshot: true },
  { id: 'sr-1b9e44d0', category: 'help', message: 'Where do I see which GrainHack issues I can still apply for?', page_url: '/dashboard?tab=osw', status: 'received', created_at: ago(12), delivered_to_team: true, has_screenshot: false },
  { id: 'sr-9e41a3b7', category: 'idea', message: 'Let me filter Discover by language.', page_url: '/dashboard', status: 'received', created_at: ago(44), delivered_to_team: true, has_screenshot: false },
]

export const supportHistory = { '/support-requests/mine': { support_requests: REPORTS, total: REPORTS.length } }

// --- A Petra wallet in the browser ---------------------------------------------------------

/** window.petra / window.aptos, the shape shared/wallet/petra.ts reads (an init script). */
export function petraWallet(address = APTOS_ADDRESS) {
  return {
    fn: (address) => {
      const petra = {
        connect: async () => ({ address, publicKey: '0x' + 'bb'.repeat(32) }),
        account: async () => ({ address, publicKey: '0x' + 'bb'.repeat(32) }),
        isConnected: async () => true,
        signMessage: async (req) => ({ signature: 'cc'.repeat(64), fullMessage: `APTOS\nmessage: ${req.message}\nnonce: ${req.nonce}`, message: req.message, nonce: req.nonce, prefix: 'APTOS' }),
      }
      window.petra = petra
      window.aptos = petra
    },
    arg: address,
  }
}

/** A small PNG to hand the screenshot inputs (the app checks the type, not the picture). */
export const proofPng = () => ({
  name: 'follow-proof.png',
  mimeType: 'image/png',
  // A 1x1 PNG.
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
})
