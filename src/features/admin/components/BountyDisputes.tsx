import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import {
  getBountyDispute,
  getBountyDisputes,
  leaveDisputeToDeadline,
  recordConductNote,
  type BountyDispute,
  type BountyDisputeDetail,
} from '../../../shared/api/client';
import { humanDate } from '../../../shared/utils/humanDate';

function money(minor: string, currency: string, network: string) {
  const n = BigInt(minor);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, '0').slice(0, 2);
  return `${whole}.${frac} ${network === 'solana-mainnet' ? currency : `test ${currency}`}`;
}

/** Audit actions, in words, for the timeline. Unknown ones are shown as recorded. */
const ACTIONS: Record<string, string> = {
  'bounty.funding_prepared': 'prepared the funding',
  'bounty.funded': 'funded the bounty',
  'assignment.funder_assigned': 'assigned it',
  'assignment.pr_recorded': 'pull request recorded',
  'assignment.unassigned': 'unassigned',
  'unassign.proposed': 'proposed unassigning',
  'unassign.refused': 'refused — marked disputed',
  'unassign.accepted': 'accepted',
  'unassign.accepted_by_silence': 'accepted by silence',
  'unassign.withdrawn': 'withdrew the proposal',
  'dispute.left_to_deadline': 'left it to the deadline',
  'dispute.conduct_note': 'recorded a conduct note',
};

/**
 * The admin dispute view: the design approved as funded-bounty-controls.html,
 * surface three.
 *
 * Reached only when a contributor says the work is deliverable and the funder
 * refuses to let the deadline or a merge settle it. Every other stall is
 * settled by the deadline without anyone. There is no action here that ends a
 * dispute early in the funder's favour, and the rule is stated where an admin
 * reads it, so it is a guarantee contributors can rely on rather than a
 * button we happened not to build.
 */
export function BountyDisputes() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [list, setList] = useState<BountyDispute[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setLoadError(null);
    getBountyDisputes()
      .then((r) => live && setList(r.disputes))
      .catch((e) => live && setLoadError(e));
    return () => {
      live = false;
    };
  }, [attempt]);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  if (loadError) return <LoadFailed what="bounty disputes" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!list) return <div aria-busy="true" className={`animate-pulse h-24 rounded-[16px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />;

  return (
    <div className="space-y-4">
      <p className={`text-[13px] rounded-[14px] border p-4 ${isDark ? 'border-white/10 bg-white/[0.04] text-[#d4d4d4]' : 'border-black/10 bg-white/[0.3] text-[#4a3b28]'}`}>
        <b className={strong}>An admin cannot end a dispute early in the funder's favour.</b> No instruction, no button and no operational path refunds a
        funder before their deadline. The deadline is the contributor's only protection once work has been handed to them, and an admin who could cut it
        short would be that protection's exception.
      </p>
      {list.length === 0 ? (
        <p className={`text-[13.5px] ${muted}`}>No disputes. Every stalled funded bounty is being settled by its deadline, which is how it should be.</p>
      ) : (
        list.map((d) => (
          <div key={d.id} className={`rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`}>
            <button type="button" className="w-full text-left flex items-center justify-between gap-3 flex-wrap" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
              <span>
                <span className={`block text-[14.5px] font-semibold ${strong}`}>{d.issueTitle || `Issue #${d.issueNumber}`}</span>
                <span className={`block text-[12.5px] ${muted}`}>
                  {d.repo} #{d.issueNumber} · escrow {money((BigInt(d.escrow.amountMinor) + BigInt(d.escrow.feeAmountMinor)).toString(), d.escrow.currency, d.escrow.network)} ·
                  deadline {humanDate(d.escrow.deadlineAt)}
                </span>
              </span>
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${d.arbitration ? (isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/10 text-[#4a3b28]') : 'bg-[#c0573f]/20 text-[#c0573f]'}`}>
                {d.arbitration === 'left_to_deadline' ? 'Left to the deadline' : 'Disputed'}
              </span>
            </button>
            {open === d.id && <DisputeDetail id={d.id} isDark={isDark} onChanged={() => setAttempt((n) => n + 1)} />}
          </div>
        ))
      )}
    </div>
  );
}

function DisputeDetail({ id, isDark, onChanged }: { id: string; isDark: boolean; onChanged: () => void }) {
  const [d, setD] = useState<BountyDisputeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    getBountyDispute(id).then((x) => live && setD(x)).catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [id, version]);

  const act = useCallback(async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setVersion((n) => n + 1);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [onChanged]);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const side = `rounded-[12px] border p-3 min-w-0 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-white/[0.3]'}`;
  const btn = `inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] text-[13px] font-semibold border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;

  if (error && !d) return <p role="alert" className="text-[13px] mt-3 text-[#c0573f]">{error}</p>;
  if (!d) return <div aria-busy="true" className={`animate-pulse h-24 mt-3 rounded-[12px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />;

  const pr = d.prNumber ? `PR #${d.prNumber}` : 'the pull request';
  return (
    <div className="mt-4 space-y-4">
      <ol className={`space-y-1 text-[12.5px] ${muted}`}>
        {d.timeline.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className="tabular-nums shrink-0 w-[110px]">{humanDate(t.at).replace(/ at .*/, '')}</span>
            <span className="min-w-0"><b className={strong}>{t.actor}</b> {ACTIONS[t.action] ?? t.action}</span>
          </li>
        ))}
      </ol>
      {d.prUrl && (
        <a href={d.prUrl} target="_blank" rel="noreferrer" className={`text-[12.5px] underline underline-offset-2 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`}>
          Open {pr} on GitHub
        </a>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={side}>
          <p className={`text-[11.5px] font-bold uppercase tracking-wide mb-1 ${muted}`}>Contributor says · {d.contributor}</p>
          <p className={`text-[13px] ${strong}`}>{d.contributorSays}</p>
        </div>
        <div className={side}>
          <p className={`text-[11.5px] font-bold uppercase tracking-wide mb-1 ${muted}`}>Funder says · {d.funder}</p>
          <p className={`text-[13px] ${strong}`}>{d.funderSays}</p>
        </div>
      </div>
      <div className={`rounded-[12px] border p-3 text-[13px] ${isDark ? 'border-[#c9983a]/35 bg-[#c9983a]/10 text-[#e8dccb]' : 'border-[#a67c2e]/30 bg-[#c9983a]/10 text-[#4a3b28]'}`}>
        <p className="font-bold mb-1">What happens if you do nothing</p>
        <p>
          The deadline settles it. If {pr} is merged before {humanDate(d.escrow.deadlineAt).replace(/ at .*/, '')} the contributor is paid; if it is not, the
          funder refunds themselves. <b>Neither outcome needs you.</b> You are here only to decide whether the funder is running out the clock on deliverable
          work.
        </p>
      </div>

      {error && <p role="alert" className="text-[13px] text-[#c0573f]">{error}</p>}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btn} disabled title="Needs a rule we have not agreed: the payout signer releases only a merged pull request.">
            Attest the merge and release
          </button>
          <button type="button" className={btn} disabled={busy || d.arbitration === 'left_to_deadline'} onClick={() => void act(() => leaveDisputeToDeadline(d.id))}>
            {d.arbitration === 'left_to_deadline' ? `Left to the deadline by ${d.arbitratedBy}` : 'Leave it to the deadline'}
          </button>
        </div>
        <p className={`text-[12px] ${muted}`}>
          Releasing on a pull request that is not merged is not built yet: the payout signer re-checks the merge on GitHub and refuses otherwise. If the funder
          merges, the release goes through the normal approval.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            aria-label="Conduct note on the funder"
            className={`flex-1 min-w-0 min-h-[44px] px-3 rounded-[10px] border text-[13px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`}
            placeholder="What the funder did, for the record"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="button" className={btn} disabled={busy || !note.trim()} onClick={() => void act(async () => { await recordConductNote(d.id, note); setNote(''); })}>
            Record a conduct note on the funder
          </button>
        </div>
        {d.conductNotes.length > 0 && (
          <ul className={`text-[12.5px] space-y-1 ${muted}`}>
            {d.conductNotes.map((n, i) => <li key={i}>{humanDate(n.at)} · <b className={strong}>{n.by}</b>: {n.note}</li>)}
          </ul>
        )}
      </div>

      <div className={`flex flex-wrap gap-6 pt-2 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <p className={`text-[11.5px] w-full ${muted}`}>On {d.funder}'s public profile</p>
        {([
          [d.funderProfile.bountiesFunded, 'bounties funded'],
          [d.funderProfile.unassignedBeforePr, 'unassigned before a PR'],
          [d.funderProfile.disputesRaised, d.funderProfile.disputesRaised === 1 ? 'dispute raised against them' : 'disputes raised against them'],
        ] as const).map(([n, what]) => (
          <div key={what}>
            <p className={`text-[22px] font-extrabold tabular-nums ${strong}`}>{n}</p>
            <p className={`text-[12px] ${muted}`}>{what}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
