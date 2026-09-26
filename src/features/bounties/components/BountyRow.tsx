import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FlaskConical, Sprout } from 'lucide-react';
import { applyForBounty, type MyBountyApplication } from '../../../shared/api/client';
import { formatBountyAmount, type PublicBounty } from '../../../shared/api/bountyAgent';

const STATUS_LABELS: Record<string, string> = {
  posted: 'Open',
  in_review: 'PR in review',
  payable: 'Awaiting approval',
  paid: 'Paid',
};

/** How busy the pool looks, in words. Coarse on purpose: a precise live
 *  count makes the draw something to time rather than something to enter. */
export function poolLine(b: PublicBounty): string | null {
  if (b.applicantCount !== null) {
    return `${b.applicantCount} ${b.applicantCount === 1 ? 'person' : 'people'} entered the draw.`;
  }
  switch (b.applicantBucket) {
    case 'none':
      return 'No applicants yet.';
    case 'few':
      return 'A few applicants so far.';
    case 'many':
      return 'Many applicants so far.';
    default:
      return null;
  }
}

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
    const pool = poolLine(b);
    const base = b.reservedForNewcomers
      ? left
        ? `Applications close ${left}. Reserved for contributors who have not completed a bounty yet.`
        : 'Applications are open, for contributors who have not completed a bounty yet.'
      : left
        ? `Applications close ${left}. Everyone who applies in time goes into the draw.`
        : 'Applications are open.';
    // Said alongside the deadline because together they are what someone
    // actually wants to know, and apart they invite refreshing for a number.
    return { kind: 'apply', line: pool ? `${base} ${pool}` : base };
  }
  if (b.applicationState === 'closed') return { kind: 'wait', line: 'Applications have closed. The draw runs next.' };
  return { kind: 'wait', line: 'Not open for applications yet.' };
}

/**
 * Why an application was refused, in words, with the thing to do about it.
 *
 * The agent returns a code. A code is the right thing to store and the wrong
 * thing to show: "no_linked_wallet" tells somebody nothing, and routed
 * through the generic 403 handler it arrived as "Permission denied:
 * no_linked_wallet. You may need admin privileges to perform this action" -
 * which was also untrue.
 *
 * `fixable` is the important field. Most refusals are a state the person can
 * change, and the agent lets them apply again once they have; treating every
 * refusal as final is what left a contributor staring at a stale
 * no_linked_wallet two minutes after linking their wallet, with no button.
 */
export interface Refusal {
  line: string;
  fixable: boolean;
  action?: { label: string; to: string };
}

export const APPLY_REFUSALS: Record<string, Refusal> = {
  no_linked_wallet: {
    line: 'Link a Solana wallet before applying, so a bounty you win can be paid.',
    fixable: true,
    action: { label: 'Link a wallet', to: '/bounties/link' },
  },
  account_too_new: {
    line: 'Your GitHub account is too new to apply yet. Accounts must be at least 30 days old.',
    fixable: false,
  },
  account_age_unknown: {
    line: 'We could not read your GitHub account to check its age. Try again in a moment.',
    fixable: true,
  },
  holding_another_bounty: {
    line: 'You already hold a bounty. Finish or release it before applying for another.',
    fixable: false,
  },
  org_member: {
    line: 'You maintain this repository, so you cannot win its bounties.',
    fixable: false,
  },
  already_applied: { line: 'You have already applied for this bounty.', fixable: false },
  applications_closed: { line: 'Applications have closed. The draw runs next.', fixable: false },
  not_open: { line: 'This bounty is not open for applications.', fixable: false },
  no_such_bounty: { line: 'That bounty no longer exists.', fixable: false },
};

export function refusalFor(reason: string | null): Refusal {
  if (reason && APPLY_REFUSALS[reason]) return APPLY_REFUSALS[reason];
  // Never show the raw code. An unmapped one is our gap, not the reader's.
  return { line: 'You could not enter the draw for this bounty.', fixable: true };
}

/** What the SERVER says about this viewer and this bounty. The row keeps no
 *  opinion of its own beyond the in-flight click: local state is what made
 *  "have I applied" unanswerable after a re-render. */
export function applicationLine(mine: MyBountyApplication | undefined): string | null {
  if (!mine) return null;
  switch (mine.status) {
    case 'applied':
      return 'You are in the draw for this bounty. The result appears here when it runs.';
    case 'won':
      return 'You won the draw for this bounty. Open a pull request before the deadline.';
    case 'lost':
      return 'This bounty went to someone else in the draw.';
    case 'withdrawn':
      return 'You withdrew from this bounty.';
    case 'rejected_gate':
      return refusalFor(mine.gateFailureReason).line;
    default:
      return null;
  }
}

/**
 * Does this stored application mean the person is done here?
 *
 * A refusal does NOT. The agent re-admits somebody whose reason no longer
 * holds, so the page must offer the button again - otherwise linking a wallet
 * fixes nothing, which is exactly what happened: applied at 20:29:40, linked
 * at 20:32:00, and the row showed the 20:29 refusal with no way to retry.
 */
export function isSettled(mine: MyBountyApplication | undefined): boolean {
  return mine !== undefined && mine.status !== 'rejected_gate';
}

interface BountyRowProps {
  bounty: PublicBounty;
  isDark: boolean;
  /** Signed in AND with a GitHub account connected. Anything else and the
   *  button would only produce a refusal the person cannot act on. */
  canApply: boolean;
  /** This viewer's application, from the server. */
  mine?: MyBountyApplication;
  onApplied?: () => void;
}

export function BountyRow({ bounty: b, isDark, canApply, mine, onApplied }: BountyRowProps) {
  const [text, setText] = useState('');
  const [applying, setApplying] = useState(false);
  // Held only until the refreshed server state arrives, so the row says
  // something the instant the click succeeds rather than after a round trip.
  const [justApplied, setJustApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cta = callToAction(b, new Date());
  const serverLine = applicationLine(mine);
  const applied = isSettled(mine) || justApplied;
  const refusal = mine?.status === 'rejected_gate' ? refusalFor(mine.gateFailureReason) : null;

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
      await applyForBounty(b.id, text.trim() || undefined);
      setJustApplied(true);
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
            {b.reservedForNewcomers && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                  isDark ? 'bg-[#6f9e5a]/25 text-[#cfe6bf]' : 'bg-[#6f9e5a]/20 text-[#3d5a2f]'
                }`}
              >
                <Sprout className="w-3 h-3" />
                First bounty only
              </span>
            )}
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

      {cta.kind === 'apply' && !applied && canApply && (
        <div>
          <label htmlFor={`note-${b.id}`} className={`block text-[12px] font-medium mb-1 ${muted}`}>
            Anything you want to add (optional)
          </label>
          <textarea
            id={`note-${b.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Optional. The draw does not weight this — it is read alongside your public code, never instead of it."
            className={`w-full rounded-[10px] border px-3 py-2 text-[13px] ${
              isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5] placeholder:text-[#8a7e70]' : 'bg-white/[0.5] border-black/15 text-[#2d2820] placeholder:text-[#9a8b7a]'
            }`}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className={`flex-1 text-[12.5px] ${muted}`}>
          {serverLine ?? (justApplied ? 'You are in the draw for this bounty. The result appears here when it runs.' : cta.line)}
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
            disabled={applying || !canApply || refusal?.fixable === false}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.4)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {applying ? 'Applying…' : !canApply ? 'Sign in to apply' : refusal ? 'Try again' : 'Apply for this bounty'}
          </button>
        )}
        {refusal?.action && !applied && (
          <Link
            to={refusal.action.to}
            className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[12px] border text-[13px] font-medium transition-colors shrink-0 ${
              isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]' : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]'
            }`}
          >
            {refusal.action.label}
          </Link>
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
