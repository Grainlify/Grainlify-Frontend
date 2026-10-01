import { useState } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  maintainerRunDraw,
  maintainerSetDeadline,
  maintainerUnassign,
  type DrawResultView,
  type MaintainerBountyView,
} from '../../../shared/api/client';
import { humanDate } from '../../../shared/utils/humanDate';


/**
 * The draw controls for one bounty, for whoever maintains its repository.
 *
 * They used to be admin-only, on one page for every bounty. They belong to
 * the maintainer, and the server checks it per bounty: GitHub permission on
 * this bounty's own repository, or having funded it.
 *
 * Only what applies to the bounty's current state is offered:
 * - somebody holds it: end the assignment, or move its deadline;
 * - their pull request is open: neither - the deadline no longer applies,
 *   and ending it takes both sides;
 * - nobody holds it and the window has closed: run the draw. After an
 *   unassign the bounty waits here for somebody to press it; the person just
 *   unassigned is skipped this once.
 */
export function BountyControls({ view, onChanged }: { view: MaintainerBountyView; onChanged: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<null | { simulate: boolean }>(null);
  const [staleHours, setStaleHours] = useState('');
  const [result, setResult] = useState<DrawResultView | null>(null);
  const [unassignReason, setUnassignReason] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [deadlineReason, setDeadlineReason] = useState('');

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const box = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const input = `min-h-[44px] px-3 rounded-[10px] border text-[13px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`;
  const btn = 'inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] text-[13px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const primary = `${btn} bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white border-white/10`;
  const secondary = `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;

  const held = view.assignment;
  const open = view.bountyStatus === 'posted';
  const canDraw = open && !held && !view.windowOpen;

  const act = async (work: () => Promise<string | void>) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const said = await work();
      if (said) setNotice(said);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doRun = (simulate: boolean) =>
    act(async () => {
      setConfirming(null);
      const r = await maintainerRunDraw(view.bountyId, simulate, staleHours ? Number(staleHours) : undefined);
      setResult(r?.pool ? r : null);
      if (simulate) return 'Simulated. Nobody was assigned.';
      return r?.winner ? `Drawn: ${r.winner.githubLogin}. They have been told, with their deadline.` : 'The draw ran but nobody was eligible.';
    });

  const doUnassign = () =>
    act(async () => {
      const r = await maintainerUnassign(view.bountyId, unassignReason.trim());
      setUnassignReason('');
      return `Unassigned ${r.contributor}. They have been told why and nothing is counted against them. Nobody is drawn until you run the draw again, and that draw skips them.`;
    });

  const doDeadline = () =>
    act(async () => {
      const r = await maintainerSetDeadline(view.bountyId, new Date(deadlineAt).toISOString(), deadlineReason.trim());
      setDeadlineReason('');
      return `Deadline moved from ${humanDate(r.previousAt)} to ${humanDate(r.staleAt)}. The contributor has been told.`;
    });

  if (!open && !held) return null;

  return (
    <div className="space-y-3">
      {error && <p role="alert" className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>{error}</p>}
      {notice && <p role="status" className={`text-[13px] ${isDark ? 'text-[#7fc08d]' : 'text-[#3f7d4e]'}`}>{notice}</p>}

      {held && held.status === 'pr_submitted' && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>Held by {held.githubLogin}, pull request open</h3>
          <p className={`text-[12.5px] ${muted}`}>
            {held.prNumber ? <>Pull request #{held.prNumber} is in. </> : null}
            Their deadline no longer applies while it is open, and ending the assignment now needs them to agree as well — it is reviewed
            and merged the normal way.
          </p>
        </div>
      )}

      {held && held.status !== 'pr_submitted' && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>The current assignment</h3>
          <p className={`text-[12.5px] mb-3 ${muted}`}>
            Held by <b className={strong}>{held.githubLogin}</b>
            {held.staleAt ? <> until {humanDate(held.staleAt)}</> : null}. Ending it is your decision, not theirs: no abandon is recorded and
            their odds are untouched. Nobody is drawn until you run the draw again, and that draw skips them.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              aria-label="Reason for unassigning"
              className={`${input} flex-1 min-w-0`}
              placeholder="Why — the contributor is shown this"
              value={unassignReason}
              onChange={(e) => setUnassignReason(e.target.value)}
            />
            <button type="button" className={secondary} disabled={busy || !unassignReason.trim()} onClick={doUnassign}>
              Unassign
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <input
              aria-label="New pull-request deadline"
              className={`${input} sm:w-[230px]`}
              type="datetime-local"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
            />
            <input
              aria-label="Reason for changing the deadline"
              className={`${input} flex-1 min-w-0`}
              placeholder="Why — the contributor is told this too"
              value={deadlineReason}
              onChange={(e) => setDeadlineReason(e.target.value)}
            />
            <button type="button" className={secondary} disabled={busy || !deadlineAt || !deadlineReason.trim()} onClick={doDeadline}>
              Move the deadline
            </button>
          </div>
        </div>
      )}

      {canDraw && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>{view.awaitingRedraw ? 'Waiting for you to redraw' : 'Run the draw'}</h3>
          <p className={`text-[12.5px] mb-3 ${muted}`}>
            {view.awaitingRedraw
              ? 'You ended the last assignment, so nobody is drawn until you do it here. The person you unassigned is skipped this once. '
              : 'The draw runs by itself when applications close; this runs it now. '}
            You cannot choose who is drawn: it is the same weighted draw either way. Simulating uses the real pool but assigns nobody.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              aria-label="Hours until the pull-request deadline"
              className={`${input} sm:w-[230px]`}
              type="number"
              min="1"
              placeholder="Deadline (hours, optional)"
              value={staleHours}
              onChange={(e) => setStaleHours(e.target.value)}
            />
            <button type="button" className={secondary} disabled={busy} onClick={() => setConfirming({ simulate: true })}>
              Simulate
            </button>
            <button type="button" className={primary} disabled={busy} onClick={() => setConfirming({ simulate: false })}>
              {view.awaitingRedraw ? 'Redraw now' : 'Run the draw now'}
            </button>
          </div>
          {confirming && (
            <div className="mt-3 p-3 rounded-[12px] border border-[#c9983a]/40 bg-[#c9983a]/10" role="alertdialog" aria-label="Confirm draw">
              <p className={`text-[13px] mb-3 ${strong}`}>
                {confirming.simulate
                  ? `Simulate the draw for ${view.repo} #${view.issueNumber}? Nobody will be assigned.`
                  : `Run the draw for ${view.repo} #${view.issueNumber} now? One applicant will be assigned and told.`}
              </p>
              <div className="flex gap-2">
                <button type="button" className={primary} disabled={busy} onClick={() => doRun(confirming.simulate)}>
                  {busy ? 'Running…' : confirming.simulate ? 'Yes, simulate' : 'Yes, run the draw'}
                </button>
                <button type="button" className={secondary} onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            </div>
          )}
          {result && (
            <p className={`text-[12.5px] mt-3 ${muted}`}>
              {result.pool.length} in the pool{result.winner ? <>; drawn: <b className={strong}>{result.winner.githubLogin}</b></> : null}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
