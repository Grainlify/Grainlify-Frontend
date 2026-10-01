import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { PublicBounty } from '../../../shared/api/bountyAgent';
import { contributorAnswer, contributorPropose, type MyBountyAssignment } from '../../../shared/api/client';
import { humanDate } from '../../../shared/utils/humanDate';

function short(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

/**
 * What a contributor reads about a funded bounty, before they apply: the
 * design approved as funded-bounty-controls.html, surface two.
 *
 * The self-assign warning is the approved wording, verbatim, and is not to be
 * softened: a contributor who knows the rule and accepts it is fine; one who
 * finds out afterwards is not.
 */
export function FundedNotice({ bounty: b, isDark }: { bounty: PublicBounty; isDark: boolean }) {
  const f = b.funded!;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const warn = `rounded-[12px] border p-3 text-[12.5px] ${isDark ? 'border-[#c9983a]/35 bg-[#c9983a]/10 text-[#e8dccb]' : 'border-[#a67c2e]/30 bg-[#c9983a]/10 text-[#4a3b28]'}`;
  const deadline = humanDate(f.deadlineAt);
  return (
    <div className="space-y-2" data-testid={`funded-${b.id}`}>
      {f.mode === 'self_assign' ? (
        <div className={warn} role="note">
          <p className="font-bold mb-1">On this bounty the funder can unassign you</p>
          <p>
            They assign it, and they can also unassign you directly on-chain, without Grainlify's agreement. We cannot stop that and we will not pretend
            otherwise.
          </p>
          <p className="mt-1">
            What protects you is the deadline: <b>the money cannot leave the escrow before {deadline}</b>, whoever holds the assignment. Once your pull
            request is open, unassigning needs your agreement too.
          </p>
        </div>
      ) : (
        <div className={`text-[12.5px] ${muted}`}>
          <p className={`font-semibold ${strong}`}>How this one is assigned</p>
          <p>
            The funder runs the draw when they choose. Everyone who has applied is in it, weighted the same way as any other bounty — fit with the issue,
            first-time applicants favoured. Applying costs you nothing and does not commit you.
          </p>
        </div>
      )}
      <p className={`text-[12.5px] ${muted}`}>
        Paid from an on-chain escrow the funder locked before this bounty appeared. You can read it yourself:{' '}
        <a href={f.escrowUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 underline underline-offset-2 font-mono ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`}>
          escrow · {short(f.escrow)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
      {f.profile && (
        <p className={`text-[12.5px] ${muted}`}>
          <b className={strong}>{f.by}</b> on record: <b className={strong}>{f.profile.bountiesFunded}</b> funded ·{' '}
          <b className={strong}>{f.profile.unassignedBeforePr}</b> unassigned before a pull request · <b className={strong}>{f.profile.disputesRaised}</b>{' '}
          {f.profile.disputesRaised === 1 ? 'dispute' : 'disputes'} raised against them
        </p>
      )}
    </div>
  );
}

/**
 * The contributor's side of ending an assignment once their pull request is
 * open: propose it, or answer the funder's proposal. Silence counts as
 * agreeing after the reply window, and the page says so where it asks.
 */
export function FundedAssignmentActions({ bountyId, assignment, isDark, onChanged }: {
  bountyId: string; assignment: MyBountyAssignment; isDark: boolean; onChanged: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const f = assignment.funded;
  if (!f) return null;
  const p = f.proposal;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const input = `flex-1 min-w-0 min-h-[44px] px-3 rounded-[10px] border text-[13px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`;
  const btn = `inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] text-[13px] font-semibold border disabled:opacity-50 ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      setNotice(await work());
      setText('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const prOpen = assignment.status === 'pr_submitted';
  const theirs = p?.status === 'pending' && p.proposedBy === 'funder';
  const yours = p?.status === 'pending' && p.proposedBy === 'contributor';

  return (
    <div className="space-y-2">
      {f.wallet && (
        <p className={`text-[12.5px] ${muted}`}>
          The escrow pays <span className="font-mono">{short(f.wallet)}</span>, the wallet you had linked when it was assigned.
        </p>
      )}
      {error && <p role="alert" className="text-[12.5px] text-[#c0573f]">{error}</p>}
      {notice && <p role="status" className={`text-[12.5px] ${isDark ? 'text-[#7fc08d]' : 'text-[#3f7d4e]'}`}>{notice}</p>}

      {theirs && (
        <div className="space-y-2">
          <p className={`text-[12.5px] ${strong}`}>
            {p.proposerLogin} proposed ending your assignment: “{p.reason}” It only happens if you agree. Answer by {humanDate(p.respondBy!)} — if you
            have not answered by then, it counts as agreeing.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input aria-label="Your answer" className={input} placeholder="Your reason (needed to refuse; an admin may read it)" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="button" className={btn} disabled={busy} onClick={() => void run(async () => { await contributorAnswer(p.id, 'accept', text); return 'Agreed. The assignment ends; nothing is counted against you.'; })}>Agree</button>
            <button type="button" className={btn} disabled={busy || !text.trim()} onClick={() => void run(async () => { await contributorAnswer(p.id, 'refuse', text); return 'Refused. It stays yours; the escrow deadline still decides.'; })}>Refuse</button>
          </div>
        </div>
      )}

      {yours && (
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[12.5px] ${muted}`}>You proposed ending it. The funder has until {humanDate(p.respondBy!)} to answer; silence counts as agreeing.</p>
          <button type="button" className={btn} disabled={busy} onClick={() => void run(async () => { await contributorAnswer(p.id, 'withdraw'); return 'Withdrawn.'; })}>Withdraw</button>
        </div>
      )}

      {p?.status === 'refused' && (
        <p className={`text-[12.5px] ${muted}`}>
          Disputed: “{p.response}” Nothing else changes; the escrow deadline decides. If you believe deliverable work is being held back, an admin can look
          at both sides.
        </p>
      )}

      {prOpen && !theirs && !yours && p?.status !== 'refused' && (
        <details>
          <summary className={`text-[12.5px] cursor-pointer select-none ${muted}`}>Can't finish it? Propose ending the assignment</summary>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input aria-label="Why you want to end the assignment" className={input} placeholder="Why — the funder reads this" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="button" className={btn} disabled={busy || !text.trim()} onClick={() => void run(async () => { await contributorPropose(bountyId, text); return 'Proposed. The funder has 7 days to answer.'; })}>Propose</button>
          </div>
        </details>
      )}
    </div>
  );
}
