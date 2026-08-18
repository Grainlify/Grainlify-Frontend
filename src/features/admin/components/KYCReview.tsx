import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Clock, RotateCcw, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import {
  getKYCPendingReviews,
  getKYCReasonCodes,
  resetKYCWithReason,
  type KYCPendingReview,
  type KYCReasonCode,
} from '../../../shared/api/client';

/** Review queue for identity verification.
 *
 *  Two states appear here and they are two halves of one job:
 *
 *    in_review  Didit routes these to OUR queue, not theirs. Somebody is
 *               waiting on a decision that will not arrive on its own.
 *    rejected   decided, but the contributor may still need telling why.
 *
 *  What this screen deliberately does not show: the document image, the
 *  provider's decision, or its warning text. None of it crosses the API — the
 *  admin reads the provider console for detail, and this screen exists to turn
 *  what they read there into something a person can act on.
 *
 *  The reason picker shows the exact message the contributor will receive,
 *  before the choice is made. A picker that hides the resulting message asks
 *  somebody to choose blind, and the whole point of the closed list is that
 *  the wording was decided in advance by someone thinking about how it reads.
 */
export function KYCReview() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [pending, setPending] = useState<KYCPendingReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reasonCodes, setReasonCodes] = useState<KYCReasonCode[]>([]);

  const [deciding, setDeciding] = useState<KYCPendingReview | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [internalReason, setInternalReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const load = () => {
    setIsLoading(true);
    setLoadError(null);
    getKYCPendingReviews()
      .then((res) => setPending(res.pending))
      .catch((err) => setLoadError(err?.message || 'Could not load the verification queue.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // Non-fatal: without the codes the queue still renders and the admin can
    // see who is waiting. What they cannot do is send, so the send button is
    // disabled rather than the whole screen failing.
    getKYCReasonCodes()
      .then((res) => setReasonCodes(res.reason_codes))
      .catch(() => toast.error('Could not load the reasons. Reload before sending anything.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = reasonCodes.find((r) => r.code === reasonCode);
  const canSend =
    reasonCode !== '' &&
    internalReason.trim().length > 0 &&
    (!chosen?.needs_note || note.trim().length > 0);

  const openFor = (row: KYCPendingReview) => {
    setDeciding(row);
    // Pre-select the single suggestion when there is exactly one, and never
    // when there are several: choosing between two suggestions is the
    // judgement this screen exists to ask for, and a pre-ticked radio is an
    // answer nobody gave.
    setReasonCode(row.suggested_reason_codes.length === 1 ? row.suggested_reason_codes[0] : '');
    setNote('');
    setInternalReason('');
  };

  const send = async () => {
    if (!deciding || !canSend) return;
    setIsSending(true);
    try {
      const res = await resetKYCWithReason(deciding.user_id, {
        reason_code: reasonCode,
        note: note.trim(),
        reason: internalReason.trim(),
      });
      // Report what actually happened, not what was attempted. A reset whose
      // notification failed is a reset the contributor does not know about,
      // and saying "sent" would recreate the silence this feature removed.
      if (res.notified) {
        toast.success(`${deciding.github_login} can verify again and has been told why.`);
      } else {
        toast.warning(
          `${deciding.github_login} was reset, but the notification did not reach them. Recorded against the reset.`
        );
      }
      setDeciding(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not reset this verification.');
    } finally {
      setIsSending(false);
    }
  };

  // Copy rather than select-and-drag: the id is a UUID being moved between two
  // screens dozens of times in a review session, and a mis-copied character
  // matches the wrong session or none.
  const copySessionId = async (row: KYCPendingReview) => {
    try {
      await navigator.clipboard.writeText(row.kyc_session_id);
      setCopiedId(row.user_id);
      setTimeout(() => setCopiedId((c) => (c === row.user_id ? null : c)), 1500);
    } catch {
      toast.error('Could not copy. Select the id and copy it manually.');
    }
  };

  const waitingFor = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms)) return 'unknown';
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) return 'under an hour';
    if (hours < 48) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-[14px] ${muted}`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading the verification queue…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex items-start gap-2 text-[14px] ${muted}`}>
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#ef4444]" />
        <span>{loadError}</span>
      </div>
    );
  }

  if (pending.length === 0) {
    return <p className={`text-[14px] ${muted}`}>Nobody is waiting on a verification decision.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.map((row) => (
        <div
          key={row.user_id}
          className={`flex flex-wrap items-center gap-3 p-4 rounded-[14px] border transition-colors ${
            dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30'
          }`}
        >
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
          ) : (
            <div className={`w-9 h-9 rounded-full flex-shrink-0 ${dark ? 'bg-white/10' : 'bg-black/10'}`} />
          )}

          <div className="min-w-0 flex-1">
            <div className={`text-[14px] font-semibold truncate ${strong}`}>
              {row.github_login || 'unknown contributor'}
            </div>
            {/* The legal name, for matching this row against the Didit console,
                which lists people by name and has no search by session id.
                Deliberately the only personal detail shown, and it stops here -
                no document number, date of birth, nationality or address. Every
                one of those is already on the reviewer's other screen, and if
                matching is hard the answer is a better identifier (the session
                number beside it) rather than more of somebody's identity. */}
            {row.legal_name && (
              <div className={`text-[13px] truncate ${muted}`}>
                {row.legal_name}
                {row.session_number && (
                  <span className={dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}>
                    {' · #'}{row.session_number}
                  </span>
                )}
              </div>
            )}
            {/* The session id, on the row rather than behind an expand: it is
                the first thing needed when matching this person to a session
                in the provider console, and a reviewer works through the queue
                with that console open beside this one. */}
            {row.kyc_session_id ? (
              <div className="flex items-center gap-1.5 mb-0.5">
                <code className={`text-[11px] font-mono truncate ${muted}`}>{row.kyc_session_id}</code>
                <button
                  onClick={() => copySessionId(row)}
                  aria-label={`Copy session id for ${row.github_login || 'this contributor'}`}
                  className={`p-1 rounded-[6px] flex-shrink-0 ${dark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                >
                  {copiedId === row.user_id ? (
                    <Check className={`w-3 h-3 ${dark ? 'text-[#4ade80]' : 'text-[#16a34a]'}`} />
                  ) : (
                    <Copy className={`w-3 h-3 ${muted}`} />
                  )}
                </button>
              </div>
            ) : (
              <div className={`text-[11px] mb-0.5 ${muted}`}>no live session</div>
            )}
            <div className={`flex items-center gap-3 text-[12px] ${muted}`}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> waiting {waitingFor(row.waiting_since)}
              </span>
              {row.previous_resets > 0 && (
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  {row.previous_resets} previous reset{row.previous_resets === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-medium ${
              row.kyc_status === 'rejected'
                ? dark
                  ? 'bg-[#ef4444]/20 text-[#ef4444]'
                  : 'bg-[#ef4444]/15 text-[#dc2626]'
                : dark
                  ? 'bg-[#c9983a]/20 text-[#c9983a]'
                  : 'bg-[#c9983a]/15 text-[#a67c2e]'
            }`}
          >
            {row.kyc_status === 'rejected' ? 'Refused' : 'In review'}
          </span>

          <button
            onClick={() => openFor(row)}
            disabled={reasonCodes.length === 0}
            className="px-4 py-2 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send feedback &amp; reset
          </button>
        </div>
      ))}

      <Modal
        isOpen={deciding !== null}
        onClose={() => setDeciding(null)}
        title={`Reset ${deciding?.github_login || ''}`}
        width="lg"
      >
        <p className={`text-[13px] ${muted}`}>
          They will be able to verify again immediately, and will see this in their
          notifications on Grainlify.
        </p>
        {/* Stated because the two systems do not talk. Resetting here detaches
            the session on our side; it does not reach the provider, and their
            session stays exactly as it was. A reviewer who resets without
            declining there leaves a session sitting in the provider's own
            queue - which is also why nothing here deletes it: the decision
            record is theirs to keep. */}
        <p
          className={`mt-3 p-3 rounded-[12px] text-[13px] ${
            dark ? 'bg-[#c9983a]/[0.10] text-[#d4c5b0]' : 'bg-[#c9983a]/[0.12] text-[#4a3d2a]'
          }`}
        >
          This does not reach Didit. Decline the session there first — resetting here only
          detaches it on our side.
          {deciding?.kyc_session_id ? (
            <>
              {' '}Session <code className="font-mono text-[12px]">{deciding.kyc_session_id}</code>.
            </>
          ) : null}
        </p>

        <fieldset className="mt-4">
          <legend className={`block text-[13px] font-medium mb-2 ${strong}`}>
            What should they fix?
          </legend>
          {deciding && deciding.suggested_reason_codes.length === 0 && (
            // Said plainly rather than left as an empty picker. The commonest
            // cause is a refusal whose only warnings are fraud signals, which
            // are never mapped to anything a contributor could be told.
            <p className={`text-[12px] mb-2 ${muted}`}>
              No suggestion for this one — choose from the list, or use “Something else”.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {reasonCodes.map((r) => {
              const suggested = deciding?.suggested_reason_codes.includes(r.code);
              return (
                <label
                  key={r.code}
                  className={`flex items-start gap-2.5 p-3 rounded-[12px] cursor-pointer text-[13px] transition-colors ${
                    reasonCode === r.code
                      ? dark
                        ? 'bg-[#c9983a]/20 text-[#f5efe5]'
                        : 'bg-[#c9983a]/20 text-[#4a3d2a]'
                      : dark
                        ? 'text-[#d4c5b0] hover:bg-white/[0.06]'
                        : 'text-[#4a3d2a] hover:bg-black/[0.04]'
                  }`}
                >
                  <input
                    type="radio"
                    name="kyc-reason-code"
                    value={r.code}
                    checked={reasonCode === r.code}
                    onChange={() => setReasonCode(r.code)}
                    className="w-4 h-4 mt-0.5 accent-[#a2792c] cursor-pointer flex-shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{r.label}</span>
                    {suggested && (
                      <span className={`ml-2 text-[11px] ${dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}`}>
                        suggested
                      </span>
                    )}
                    {/* The exact words the contributor will read. Shown
                        before the choice, so nobody picks a reason without
                        seeing the message it sends. */}
                    {r.message && <span className={`block mt-1 text-[12px] ${muted}`}>{r.message}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4">
          <ModalInput
            label={chosen?.needs_note ? 'What should they do? (they read this)' : 'Anything to add? (they read this)'}
            value={note}
            onChange={setNote}
            placeholder={
              chosen?.needs_note
                ? 'Required — this is all they will have to act on'
                : 'Optional, added after the message above'
            }
          />
        </div>

        <div className="mt-3">
          {/* Deliberately separated from the note, and labelled so the
              difference is unmissable. These were one field, and the admin's
              internal reasoning went out to the contributor verbatim. */}
          <ModalInput
            label="Why are you resetting? (internal — they never see this)"
            value={internalReason}
            onChange={setInternalReason}
            placeholder="Recorded against the reset, for whoever asks later"
          />
        </div>

        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setDeciding(null)}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={send} disabled={!canSend || isSending}>
            {isSending ? 'Sending…' : 'Send & reset'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
