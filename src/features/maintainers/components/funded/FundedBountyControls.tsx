import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  fundedAnswer,
  fundedAssign,
  fundedAssignConfirm,
  fundedDraw,
  fundedPropose,
  fundedReclaim,
  fundedReclaimConfirm,
  fundedUnassign,
  fundedUnassignConfirm,
  getFundedView,
  type FundedView,
} from '../../../../shared/api/client';
import { humanDate } from '../../../../shared/utils/humanDate';
import { fromMinor } from './FundBountyPanel';
import { short, untilConfirmed, useFunderWallet } from './useFunderWallet';

/**
 * The funder's controls on their own funded bounty: the design approved as
 * funded-bounty-controls.html, surface one. No admin is involved in any of it.
 *
 * Self-assign: an Assign button per applicant, signed in the funder's wallet.
 * Draw: one button, whenever somebody with a wallet has applied - there is no
 * window. Unassigning follows the rule stated where it acts: freely before a
 * pull request, only by agreement after one.
 */
export function FundedBountyControls({ bountyId }: { bountyId: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const w = useFunderWallet();
  const [view, setView] = useState<FundedView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [answer, setAnswer] = useState('');
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    getFundedView(bountyId)
      .then((v) => live && (setView(v), setLoadError(null)))
      .catch((e) => live && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [bountyId, version]);

  const act = useCallback(async (label: string, work: () => Promise<string | void>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const said = await work();
      if (said) setNotice(said);
      setVersion((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const box = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const input = `min-h-[44px] px-3 rounded-[10px] border text-[13px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`;
  const btn = 'inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] text-[13px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const primary = `${btn} bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white border-white/10`;
  const secondary = `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;

  if (loadError) return <p role="alert" className={`text-[13px] ${muted}`}>{loadError}</p>;
  if (!view) {
    return <div aria-busy="true" className={`animate-pulse h-24 rounded-[16px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />;
  }

  const e = view.escrow;
  const test = e.network !== 'solana-mainnet';
  const unit = `${test ? 'test ' : ''}${e.currency}`;
  const money = (minor: string) => `${fromMinor(minor, e.decimals)} ${unit}`;
  const held = view.assignment;
  const p = view.proposal;
  const pending = p && p.status === 'pending';
  const theirProposal = pending && p.proposedBy === 'contributor';
  const yourProposal = pending && p.proposedBy === 'funder';
  const pastDeadline = Date.now() >= new Date(e.deadlineAt).getTime();
  const open = view.bountyStatus === 'posted' || view.bountyStatus === 'in_review';
  const needsWallet = view.mode === 'self_assign';

  const assign = (login: string) =>
    act(`Assigning ${login}…`, async () => {
      const prepared = await fundedAssign(bountyId, login);
      const sig = await w.send(prepared.transaction, e.network, prepared.funderWallet);
      await untilConfirmed(() => fundedAssignConfirm(bountyId, login, sig));
      return `Assigned to ${login}. They have been told, with the escrow deadline.`;
    });

  const draw = () =>
    act('Running the draw…', async () => {
      setConfirmDraw(false);
      const r = await fundedDraw(bountyId);
      if (!r.draw.winner) return 'The draw ran but nobody was eligible.';
      return r.onChain
        ? `Drawn: ${r.draw.winner.githubLogin}. They have been told.`
        : `Drawn: ${r.draw.winner.githubLogin}. The escrow is being updated; this page will show it once the chain does.`;
    });

  const unassign = () =>
    act('Unassigning…', async () => {
      const r = await fundedUnassign(bountyId, reason.trim());
      if (r.needsSignature && r.transaction) {
        const sig = await w.send(r.transaction, e.network, r.funderWallet);
        await untilConfirmed(() => fundedUnassignConfirm(bountyId, reason.trim(), sig));
      }
      setReason('');
      return `Unassigned ${r.contributor}. They have been told${reason.trim() ? ', with your reason' : ''}, and nothing is counted against them.`;
    });

  const propose = () =>
    act('Sending your proposal…', async () => {
      const r = await fundedPropose(bountyId, reason.trim());
      setReason('');
      return `Proposed. ${held?.githubLogin} has until ${humanDate(r.respondBy)} to answer; if they do not, it counts as agreeing.`;
    });

  const respond = (accept: boolean) =>
    act(accept ? 'Accepting…' : 'Refusing…', async () => {
      const r = await fundedAnswer(p!.id, accept ? 'accept' : 'refuse', answer.trim());
      setAnswer('');
      if (!accept) return 'Refused. Nothing else changes: the escrow deadline still decides.';
      return r.awaitingFunderSignature ? 'Agreed. Sign the unassignment in your wallet below to carry it out.' : 'Agreed, and done.';
    });

  const reclaim = () =>
    act('Preparing…', async () => {
      const r = await fundedReclaim(bountyId);
      await w.send(r.transaction, e.network, r.funderWallet);
      const done = await untilConfirmed(() => fundedReclaimConfirm(bountyId));
      return done.outcome === 'cancelled' ? 'Cancelled. The escrow, fee included, is back in your wallet.' : 'Refunded. The escrow is back in your wallet.';
    });

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] ${muted}`}>
        <span className={`font-semibold ${strong}`}>{view.mode === 'draw' ? 'Weighted draw' : 'You assign'}</span>
        <span>Escrow <b className={strong}>{money(e.totalMinor)}</b></span>
        <span>Contributor receives <b className={strong}>{money(e.amountMinor)}</b></span>
        <span>Refundable by you from <b className={strong}>{humanDate(e.deadlineAt)}</b></span>
        <span className="font-mono" title={e.address}>escrow · {short(e.address)}</span>
      </div>

      {error && <p role="alert" className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>{error}</p>}
      {notice && <p role="status" className={`text-[13px] ${isDark ? 'text-[#7fc08d]' : 'text-[#3f7d4e]'}`}>{notice}</p>}

      {(needsWallet || pastDeadline || (!held && open)) && !w.address && (
        <div className={`${box} flex flex-wrap items-center gap-2`}>
          <span className={`text-[12.5px] ${muted}`}>
            Your wallet signs for this escrow ({short(e.funderWallet)}){w.wallets.length ? ':' : '. No Solana wallet that can send transactions was found in this browser.'}
          </span>
          {w.wallets.map((x) => (
            <button key={x.name} type="button" className={secondary} onClick={() => void w.connect(x)}>
              <img src={x.icon} alt="" className="w-4 h-4 mr-2" />
              {x.name}
            </button>
          ))}
          {w.error && <span role="alert" className="text-[12px] text-[#c0573f]">{w.error}</span>}
        </div>
      )}

      {!held && open && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-2 ${strong}`}>{view.mode === 'draw' ? 'Run the draw' : 'Pick anyone who applied'}</h3>
          {view.applicants.length === 0 ? (
            <p className={`text-[12.5px] ${muted}`}>Nobody has applied yet. Applications stay open until you {view.mode === 'draw' ? 'draw' : 'assign it'}.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {view.applicants.map((a) => (
                <li key={a.githubLogin} className="flex items-center justify-between gap-3 flex-wrap">
                  <span className={`text-[13px] ${strong}`}>
                    <b>{a.githubLogin}</b>
                    <span className={muted}>
                      {' · '}{a.fit ?? 'plausible'} fit{' · '}
                      {a.firstApplication ? 'first application' : `${a.completions} completed`}
                      {a.status === 'lost' && ' · unassigned here before'}
                      {!a.assignable && ' · no wallet linked yet'}
                    </span>
                  </span>
                  {view.mode === 'self_assign' && (
                    <button type="button" className={secondary} disabled={busy !== null || !a.assignable || !w.address} onClick={() => void assign(a.githubLogin)}>
                      Assign
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {view.mode === 'draw' && (
            <>
              <p className={`text-[12.5px] mb-3 ${muted}`}>
                {view.applicants.length} applicant{view.applicants.length === 1 ? '' : 's'}. Applications stay open until you draw — there is no window running down.
                You choose when, never who: it is the same weighted draw as every other bounty.
                {view.drawUnavailableReason && <> <b className={strong}>{view.drawUnavailableReason}</b></>}
              </p>
              {!confirmDraw ? (
                <button type="button" className={primary} disabled={busy !== null || !view.canDraw} onClick={() => setConfirmDraw(true)}>Run the draw</button>
              ) : (
                <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm draw">
                  <span className={`text-[13px] ${strong}`}>Draw now? One applicant will be assigned and told.</span>
                  <button type="button" className={primary} disabled={busy !== null} onClick={() => void draw()}>{busy ?? 'Yes, run the draw'}</button>
                  <button type="button" className={secondary} onClick={() => setConfirmDraw(false)}>Cancel</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {held && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>
            Held by {held.githubLogin}{held.prOpen && held.prNumber ? `, pull request #${held.prNumber} open` : ''}
          </h3>
          <p className={`text-[12.5px] mb-3 ${muted}`}>
            Paid to {held.wallet ? <span className="font-mono">{short(held.wallet)}</span> : 'their wallet'} when the pull request is merged and the release is approved.
            {!held.onChain && ' The escrow is being updated to name them.'}
          </p>

          {!held.prOpen && !p?.awaitingFunderSignature && (
            <div className="flex flex-col sm:flex-row gap-3">
              <input aria-label="Reason for unassigning (optional)" className={`${input} flex-1 min-w-0`} placeholder="Reason (optional) — they are shown it" value={reason} onChange={(ev) => setReason(ev.target.value)} />
              <button type="button" className={secondary} disabled={busy !== null || (needsWallet && !w.address)} onClick={() => void unassign()}>
                {busy === 'Unassigning…' ? busy : 'Unassign'}
              </button>
            </div>
          )}

          {held.prOpen && !pending && !p?.awaitingFunderSignature && (
            <div className="flex flex-col sm:flex-row gap-3">
              <input aria-label="Why you want to end the assignment" className={`${input} flex-1 min-w-0`} placeholder="Why — they read this, and so would an admin" value={reason} onChange={(ev) => setReason(ev.target.value)} />
              <button type="button" className={secondary} disabled={busy !== null || !reason.trim()} onClick={() => void propose()}>Propose unassigning</button>
            </div>
          )}

          {yourProposal && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`text-[12.5px] ${muted}`}>
                You proposed ending it: “{p.reason}” {held.githubLogin} has until <b className={strong}>{humanDate(p.respondBy!)}</b> to answer; silence counts as agreeing.
              </p>
              <button type="button" className={secondary} disabled={busy !== null} onClick={() => void act('Withdrawing…', async () => { await fundedAnswer(p.id, 'withdraw'); return 'Withdrawn.'; })}>Withdraw</button>
            </div>
          )}

          {theirProposal && (
            <div className="space-y-2">
              <p className={`text-[12.5px] ${strong}`}>
                {held.githubLogin} proposed ending it: “{p.reason}” Answer by {humanDate(p.respondBy!)}; if you do not, it counts as agreeing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input aria-label="Your answer" className={`${input} flex-1 min-w-0`} placeholder="Your reason (needed to refuse)" value={answer} onChange={(ev) => setAnswer(ev.target.value)} />
                <button type="button" className={secondary} disabled={busy !== null} onClick={() => void respond(true)}>Agree</button>
                <button type="button" className={secondary} disabled={busy !== null || !answer.trim()} onClick={() => void respond(false)}>Refuse</button>
              </div>
            </div>
          )}

          {p?.status === 'refused' && (
            <p className={`text-[12.5px] ${muted}`}>
              Disputed: {p.proposedBy === 'funder' ? `${held.githubLogin} refused` : 'you refused'} — “{p.response}” Nothing else changes; the deadline,
              {' '}{humanDate(e.deadlineAt)}, decides.
            </p>
          )}

          {p?.awaitingFunderSignature && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`text-[12.5px] ${strong}`}>You both agreed. Sign the unassignment in your wallet to carry it out.</p>
              <button type="button" className={primary} disabled={busy !== null || !w.address} onClick={() => void unassign()}>Sign the unassignment</button>
            </div>
          )}
        </div>
      )}

      <div className={`${box} text-[12.5px] ${muted}`}>
        <p className={`font-semibold mb-1 ${strong}`}>Unassigning</p>
        <p>
          Before a pull request exists you can unassign at any time, no reason needed. The contributor is told, with your reason, and the count appears on
          your public profile.
        </p>
        <p className="mt-1">
          Once a pull request is open it takes both of you. Either can propose it; it happens when both have accepted. If they don't reply within 7 days it goes ahead.
        </p>
        <p className="mt-2">
          On your record: {view.profile.bountiesFunded} funded · {view.profile.unassignedBeforePr} unassigned before a pull request · {view.profile.disputesRaised} disputes raised.
        </p>
      </div>

      {open && (!held || pastDeadline) && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={secondary} disabled={busy !== null || !w.address} onClick={() => void reclaim()}>
            {pastDeadline ? 'Take the escrow back' : 'Cancel and take it back'}
          </button>
          <span className={`text-[12px] ${muted}`}>
            {pastDeadline
              ? 'The deadline has passed. The full escrow comes back to your wallet.'
              : 'Possible until somebody has been assigned. After that only the deadline brings it back.'}
          </span>
        </div>
      )}
    </div>
  );
}
