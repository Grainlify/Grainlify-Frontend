// The admin Reviews page: ecosystems, event list, social-follow proofs, the
// KYC queue and redemption requests. (Bounty draw controls live in
// bounties.mjs; GrainHack administration in grainhack.mjs.)

import { ago, ahead, avatar, proofImage, query } from './util.mjs'
import { personas } from './people.mjs'
import { ECOSYSTEMS, INACTIVE_ECOSYSTEM, adminEcosystems, adminEcosystem } from './projects.mjs'

const ADA = personas.admin

// --- Social-follow proofs ------------------------------------------------------------

const SUB = (id, login, status, createdAgo, extra = {}) => ({
  id, user_id: `u-${login}`, github_login: login, avatar_url: avatar(login), status, created_at: ago(...createdAgo),
  decision_reason: null, reason_code: null, decided_at: null, decided_by: null, ...extra,
})

const SUBMISSIONS = [
  SUB('sf-1', 'arun-patch', 'pending', [0, 5]),
  SUB('sf-2', 'yuki-tern', 'pending', [0, 19]),
  SUB('sf-3', 'wren-codes', 'pending', [1, 7]),
  SUB('sf-4', 'ike-nwosu', 'pending', [2, 2]),
  SUB('sf-5', 'personas-mira', 'approved', [7], { github_login: personas.contributor.login, user_id: personas.contributor.id, avatar_url: avatar(personas.contributor.login), decided_at: ago(6), decided_by: ADA.id, decided_by_login: ADA.login }),
  SUB('sf-6', 'bram-oster', 'approved', [9], { decided_at: ago(8), decided_by: ADA.id, decided_by_login: ADA.login }),
  SUB('sf-7', 'mateo-rook', 'rejected', [5], { reason_code: 'x_no_follow', reason_label: "X proof doesn't show a follow", decision_reason: 'Profile page only; the Following state is not visible.', decided_at: ago(4), decided_by: ADA.id, decided_by_login: ADA.login }),
  SUB('sf-8', 'zoe-lattice', 'revoked', [30], { decision_reason: 'Unfollowed after approval.', decided_at: ago(3), decided_by: ADA.id, decided_by_login: ADA.login }),
]

const REASON_CODES = [
  { code: 'x_no_follow', label: "X proof doesn't show a follow", needs_note: false },
  { code: 'linkedin_no_follow', label: "LinkedIn proof doesn't show a follow", needs_note: false },
  { code: 'unreadable', label: 'Screenshot unreadable or wrong image', needs_note: false },
  { code: 'wrong_account', label: 'Wrong account followed', needs_note: false },
  { code: 'duplicate', label: 'Duplicate submission', needs_note: false },
  { code: 'other', label: 'Other', needs_note: true },
]

function submissions(req) {
  const q = query(req)
  const status = q.get('status') ?? 'pending'
  const limit = Number(q.get('limit') ?? 10)
  const offset = Number(q.get('offset') ?? 0)
  const all = SUBMISSIONS.filter((s) => status === 'all' || s.status === status)
  return { submissions: all.slice(offset, offset + limit), total: all.length, limit, offset, has_more: offset + limit < all.length }
}

// --- KYC queue ------------------------------------------------------------------------

const KYC_PENDING = [
  { user_id: 'u-ines-byte', github_login: 'ines-byte', avatar_url: avatar('ines-byte'), kyc_status: 'in_review', waiting_since: ago(0, 6), previous_resets: 0, kyc_session_id: 'kyc-sess-7731', session_number: '41', suggested_reason_codes: ['document_unreadable'] },
  { user_id: 'u-tomas-rivet', github_login: 'tomas-rivet', avatar_url: avatar('tomas-rivet'), kyc_status: 'in_review', waiting_since: ago(1, 3), previous_resets: 1, kyc_session_id: 'kyc-sess-7702', session_number: '38', suggested_reason_codes: ['face_did_not_match', 'session_expired'] },
  { user_id: 'u-dara-loop', github_login: 'dara-loop', avatar_url: avatar('dara-loop'), kyc_status: 'rejected', waiting_since: ago(3), previous_resets: 0, kyc_session_id: 'kyc-sess-7650', session_number: '33', suggested_reason_codes: null },
]

const KYC_REASONS = [
  { code: 'document_unreadable', label: "Document couldn't be read", message: "Some details on your document couldn't be read. Take the photo in bright, even light with all four corners in frame, and make sure nothing is covering the text.", needs_note: false },
  { code: 'document_type_not_recognised', label: 'Document type not recognised', message: "We couldn't tell what kind of document was uploaded. Use a passport, national ID card or driving licence, and upload the whole document rather than a cropped section.", needs_note: false },
  { code: 'document_is_a_screen_photo', label: 'Photo of a screen, not the document', message: 'The upload looked like a photo of a screen or a photocopy rather than the document itself. Photograph the original physical document directly.', needs_note: false },
  { code: 'face_did_not_match', label: "Selfie didn't match the document", message: "The selfie didn't match the photo on your document. Take it in good light, face the camera directly, and remove anything covering your face such as a hat, sunglasses or a mask.", needs_note: false },
  { code: 'session_expired', label: 'Verification session expired', message: 'Your verification session expired before it was finished. Starting a new one takes a couple of minutes.', needs_note: false },
  { code: 'information_did_not_match', label: "Details didn't match the document", message: "The details read from your document weren't consistent. Check that the document is valid and unexpired, and that nothing is obscuring the printed details.", needs_note: false },
  { code: 'other', label: 'Something else (write a note)', message: '', needs_note: true },
]

const KYC_RESETS = {
  'u-tomas-rivet': [
    { previous_status: 'rejected', reason: 'Selfie did not match', reason_code: 'face_did_not_match', reason_label: "Selfie didn't match the document", note: null, message_sent: KYC_REASONS[3].message, created_at: ago(9), actor_github_login: ADA.login, notified: true, notify_error: null },
  ],
}

// --- Redemptions -----------------------------------------------------------------------

const STELLAR = ['GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG', 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6', 'GBVOL67TMUQBGL4TZYNMY3ZQ5WGQYFPFD5VJRWXR72VA33VFNL225PL5']
const REDEMPTIONS = [
  { id: 'rd-a11', user_id: 'u-kofi-ade', login: 'kofi-ade', points_spent: 1000, usdc_amount: '10.00', stellar_wallet_address: STELLAR[1], status: 'pending', created_at: ago(1, 4) },
  { id: 'rd-a12', user_id: 'u-lena-marsh', login: 'lena-marsh', points_spent: 500, usdc_amount: '5.00', stellar_wallet_address: STELLAR[2], status: 'pending', created_at: ago(2, 9) },
  { id: 'rd-a13', user_id: 'u-sol-mendes', login: 'sol-mendes', points_spent: 2500, usdc_amount: '25.00', stellar_wallet_address: STELLAR[0], status: 'pending', created_at: ago(4) },
  { id: 'rd-a09', user_id: 'u-felix-quay', login: 'felix-quay', points_spent: 750, usdc_amount: '7.50', stellar_wallet_address: STELLAR[2], status: 'paid', created_at: ago(20) },
]

// --- Open Source Week events (the legacy event list on the Reviews page) ----------------

const OSW_EVENTS = [
  { id: 'osw-1', title: 'Open Source Week: Docs Sprint', description: 'A week of documentation issues across the Stellar projects.', location: 'Online', status: 'upcoming', start_at: ahead(12), end_at: ahead(19), created_at: ago(5), updated_at: ago(5) },
  { id: 'osw-2', title: 'Open Source Week: Rust Tooling', description: 'Benchmarks, fuzzing and CLI work on the Rust repositories.', location: 'Online', status: 'completed', start_at: ago(60), end_at: ago(53), created_at: ago(80), updated_at: ago(52) },
]

// --- The API map ---------------------------------------------------------------------------

export function adminApi() {
  const api = {
    '/admin/ecosystems': adminEcosystems(),
    'POST /admin/ecosystems': { ...adminEcosystem(ECOSYSTEMS[0]), id: 'eco-new', slug: 'new-ecosystem', name: 'New ecosystem' },
    '/admin/open-source-week/events': { events: OSW_EVENTS },
    'POST /admin/open-source-week/events': { id: 'osw-new' },
    '/admin/social-follow/submissions': submissions,
    '/admin/social-follow/reason-codes': { reason_codes: REASON_CODES },
    'POST /admin/social-follow/submissions/bulk-approve': (req) => {
      const ids = JSON.parse(req.postData() || '{}').ids ?? []
      return { approved: ids.map((id) => ({ id })), skipped: [], failed: [], approved_count: ids.length, skipped_count: 0, failed_count: 0 }
    },
    '/admin/kyc/pending': { pending: KYC_PENDING },
    '/admin/kyc/reason-codes': { reason_codes: KYC_REASONS },
    '/admin/redemptions': (req) => {
      const status = query(req).get('status') ?? 'pending'
      return { redemptions: REDEMPTIONS.filter((r) => status === 'all' || r.status === status) }
    },
  }
  for (const e of [...ECOSYSTEMS, INACTIVE_ECOSYSTEM]) {
    api[`/admin/ecosystems/${e.id}`] = adminEcosystem(e)
    api[`PUT /admin/ecosystems/${e.id}`] = adminEcosystem(e)
    api[`DELETE /admin/ecosystems/${e.id}`] = { ok: true }
  }
  for (const e of OSW_EVENTS) api[`DELETE /admin/open-source-week/events/${e.id}`] = { ok: true }
  for (const s of SUBMISSIONS) {
    api[`/admin/social-follow/submissions/${s.id}/proofs`] = { id: s.id, linkedin_screenshot: proofImage('LinkedIn', s.github_login), x_screenshot: proofImage('X', s.github_login) }
    for (const action of ['approve', 'reject', 'revoke']) api[`POST /admin/social-follow/submissions/${s.id}/${action}`] = { ok: true }
  }
  for (const k of KYC_PENDING) {
    api[`/admin/kyc/${k.user_id}/resets`] = { resets: KYC_RESETS[k.user_id] ?? [] }
    api[`POST /admin/kyc/${k.user_id}/reset`] = { ok: true, previous_status: k.kyc_status, status: 'not_started', reason_code: 'document_unreadable', message_sent: KYC_REASONS[0].message, notified: true }
  }
  for (const r of REDEMPTIONS) {
    api[`POST /admin/redemptions/${r.id}/mark-paid`] = { ok: true }
    api[`POST /admin/redemptions/${r.id}/reject`] = { ok: true }
  }
  return api
}
