import { useState } from 'react';
import { ExternalLink, FlaskConical } from 'lucide-react';
import { applyForBounty } from '../../../shared/api/client';
import { formatBountyAmount, type PublicBounty } from '../../../shared/api/bountyAgent';

const STATUS_LABELS: Record<string, string> = {
  posted: 'Open',
  in_review: 'PR in review',
  payable: 'Awaiting approval',
  paid: 'Paid',
};

/** "in 5 hours", "in 12 minutes", or null once it has passed. */
export function timeUntil(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `in ${Math.round(hours / 24)} days`;
}

/**
 * What a contributor can do about this bounty right now, in one sentence.
 *
 * Kept as a pure function because the states are the part worth testing, and
 * because getting "closed" and "never opened" to read the same is exactly the
 * bug that would make the page look stale.
 */
export function callToAction(b: PublicBounty, now: Date): { kind: 'apply' | 'wait' | 'held' | 'done'; line: string } {
  if (b.status === 'paid') return { kind: 'done', line: b.payout ? `Paid to ${b.payout.recipientLogin}.` : 'Paid.' };
  if (b.assignedTo) {
    return {
      kind: 'held',
      line: `Assigned to ${b.assignedTo}. If no pull request arrives by the deadline it is drawn again.`,
    };
  }
  if (b.applicationState === 'open') {
    const left = timeUntil(b.applicationsCloseAt, now);
    return { kind: 'apply', line: left ? `Applications close ${left}. Everyone who applies in time goes into the draw.` : 'Applications are open.' };
  }
  if (b.applicationState === 'closed') return { kind: 'wait', line: 'Applications have closed. The draw runs next.' };
  return { kind: 'wait', line: 'Not open for applications yet.' };
}

interface BountyRowProps {
  bounty: PublicBounty;
  isDark: boolean;
  /** Signed in AND with a GitHub account connected. Anything else and the
   *  button would only produce a refusal the person cannot act on. */
  canApply: boolean;
  onApplied?: () => void;
}

export function BountyRow({ bounty: b, isDark, canApply, onApplied }: BountyRowProps) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cta = callToAction(b, new Date());

  const row = `flex flex-col gap-3 p-4 rounded-[16px] border transition-all ${
    b.isTest
      ? isDark ? 'bg-[#4a7c8c]/[0.14] border-[#7fb4c4]/30' : 'bg-[#4a7c8c]/[0.10] border-[#4a7c8c]/30'
      : isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'
  }`;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const pill = `px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'}`;
  const testPill = `inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
    isDark ? 'bg-[#7fb4c4]/25 text-[#bfe0ea]' : 'bg-[#4a7c8c]/20 text-[#2f5a68]'
  }`;

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      await applyForBounty(b.id);
      setApplied(true);
      onApplied?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply just now.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={row} data-testid={`bounty-${b.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[14.5px] font-semibold ${strong}`}>{b.issueTitle || `Issue #${b.issueNumber}`}</span>
            <span className={pill}>{STATUS_LABELS[b.status] ?? b.status}</span>
            {b.isTest && (
              <span className={testPill}>
                <FlaskConical className="w-3 h-3" />
                Test bounty — not for contributors
              </span>
            )}
          </div>
          <p className={`text-[12.5px] ${muted}`}>
            {b.repo} #{b.issueNumber}
            {b.payout && (
              <>
                {' · paid to '}
                {b.payout.recipientLogin}
                {' · '}
                <a href={b.payout.txUrl} target="_blank" rel="noreferrer" className={`underline underline-offset-2 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`}>
                  transaction
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className={`text-[16px] font-extrabold tabular-nums ${strong}`}>{formatBountyAmount(b)}</span>
          <a
            href={b.issueUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-[12px] border text-[13px] font-medium transition-colors ${
              isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]' : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]'
            }`}
          >
            View issue
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className={`flex-1 text-[12.5px] ${muted}`}>
          {applied ? 'You are in the draw for this bounty. We will show the result here when it runs.' : cta.line}
          {b.isTest && b.waivedRules.length > 0 && !applied && (
            <>
              {' '}
              <span className="font-medium">Relaxed for this test: {b.waivedRules.join(', ')}.</span>
            </>
          )}
        </p>
        {cta.kind === 'apply' && !applied && (
          <button
            type="button"
            onClick={apply}
            disabled={applying || !canApply}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.4)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {applying ? 'Applying…' : canApply ? 'Apply for this bounty' : 'Sign in to apply'}
          </button>
        )}
      </div>

      {error && (
        <p className={`text-[12.5px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
