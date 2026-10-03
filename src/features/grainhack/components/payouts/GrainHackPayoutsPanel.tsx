import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, CircleHelp, Clock, Copy, ExternalLink, FileSignature, PauseCircle, ShieldCheck, Terminal, Wallet } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { isApiError } from '../../../../shared/api/apiError';
import { getResultsStatement, issueResultsStatement, type GrainHackStatementState } from '../../../../shared/api/client';
import { getGrainHackPayouts } from '../../../../shared/api/bountyAgent';
import { explorerNameForUrl, isTestNetwork, networkLabel, shortTx } from '../../../../shared/utils/payoutNetwork';
import { plural } from '../keeperhub/keeperhubModel';
import { Code, ConfirmShell, PrimaryButton, SecondaryButton, tokens, type Tokens } from '../keeperhub/keeperhubUi';
import {
  WINNER_STATUS_HINT,
  WINNER_STATUS_LABEL,
  WINNER_STATUS_TONE,
  agentBehind,
  agentImported,
  approveCommand,
  payoutTotals,
  shortUuid,
  statementRefusal,
  usdc,
  winnerRows,
  winnerWithoutGitHubName,
  type AgentRead,
  type StatementRefusal,
  type WinnerRow,
  type WinnerStatus,
} from './payoutsModel';

/** The contributor pool's payout on Solana, for one event (payout contract §4).
 *
 *  Sits beside the KeeperHub panel while both exist. This panel never moves
 *  money: it issues the signed results statement (backend), shows what the
 *  agent has done with it, and hands the approver the one command that pays,
 *  which runs on their own machine because the approval key never leaves it.
 *
 *  Dashboard surface: no motion, as the KeeperHub panel. */
export function GrainHackPayoutsPanel({ hackathonId }: { hackathonId: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const t = tokens(dark);

  const [state, setState] = useState<GrainHackStatementState | undefined>(undefined);
  const [agent, setAgent] = useState<AgentRead | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [refusal, setRefusal] = useState<StatementRefusal | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await getResultsStatement(hackathonId);
      setState(s);
      setLoadError(null);
      if (s.view) {
        // The agent's read is separate on purpose: a statement is worth
        // showing even when the agent can't be reached.
        setAgent(await getGrainHackPayouts(hackathonId).catch(() => 'unavailable' as const));
      } else {
        setAgent(null);
      }
    } catch (e) {
      setLoadError(isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : 'load_failed');
    }
  }, [hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const issue = async () => {
    setIssuing(true);
    setRefusal(null);
    try {
      const next = await issueResultsStatement(hackathonId, { payoutRunId: state?.currentPayoutRunId ?? null });
      toast.success(
        next.view?.supersedes
          ? 'New statement issued. It supersedes the previous one; nobody already paid is paid again.'
          : 'Results statement issued and signed. Nobody is paid until an approver runs approve-event.',
      );
    } catch (e) {
      const code = isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : '';
      const r = statementRefusal(code, isApiError(e) ? e.data : undefined);
      setRefusal(r);
      toast.error(r.message);
    } finally {
      setIssuing(false);
      setConfirmOpen(false);
      await load();
    }
  };

  const chip = (tone: keyof Tokens['chip'], label: string, testId?: string) => (
    <span data-testid={testId} className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${t.chip[tone]}`}>
      {label}
    </span>
  );

  const shell = (children: ReactNode, dataState: string) => (
    <section
      aria-labelledby="grainhack-payouts-title"
      data-testid="grainhack-payouts-panel"
      data-state={dataState}
      className={`flex flex-col gap-5 rounded-[24px] border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-[40px] sm:p-6 ${t.panel}`}
    >
      {children}
    </section>
  );

  const networkChip = (network: string | null) =>
    network === null
      ? null
      : isTestNetwork(network)
        ? chip('amber', `${networkLabel(network)} · test USDC, no value`, 'grainhack-network-chip')
        : chip('gold', `${networkLabel(network)} · real USDC`, 'grainhack-network-chip');

  const header = (sub: ReactNode, chips: ReactNode) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-1.5">
        <h3 id="grainhack-payouts-title" className={`text-[16px] font-bold ${t.strong}`}>
          Payouts on Solana
        </h3>
        <p className={`text-[13px] tabular-nums ${t.muted}`}>{sub}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{chips}</div>
    </div>
  );

  const refusalBox = (network: string | null) =>
    refusal && (
      <div data-testid="grainhack-refusal" data-code={refusal.code} role="alert" className={`flex flex-col gap-2 rounded-[12px] border px-3 py-2.5 text-[13px] ${t.errorBox}`}>
        <p className="font-semibold">{refusal.message}</p>
        {refusal.winners.length > 0 && (
          <ul className="flex list-disc flex-col gap-1 pl-5" data-testid="grainhack-refusal-winners">
            {refusal.winners.map((w) => (
              <li key={w.user_id}>
                {winnerWithoutGitHubName(w)} · {usdc(w.amount_minor, network)} · user id <span className="font-mono">{w.user_id}</span>
              </li>
            ))}
          </ul>
        )}
        {refusal.detail && <p className="text-[12px] opacity-80">{refusal.detail}</p>}
      </div>
    );

  if (loadError) {
    return shell(
      <>
        {header('Contributor pool', null)}
        <p className={`text-[13px] ${t.muted}`}>
          Couldn&apos;t load the results statement. Nothing about this event&apos;s payout is known from this page right now; reload to try again.
        </p>
        <Code t={t}>{loadError}</Code>
      </>,
      'load-failed',
    );
  }
  if (state === undefined) {
    return shell(<>{header('Contributor pool', null)}<p className={`text-[13px] ${t.muted}`}>Loading the results statement…</p></>, 'loading');
  }

  const confirm = confirmOpen && (
    <ConfirmIssue
      t={t}
      superseding={state.view !== null}
      network={state.view?.network ?? null}
      busy={issuing}
      onCancel={() => setConfirmOpen(false)}
      onConfirm={() => void issue()}
    />
  );

  if (!state.view) {
    return shell(
      <>
        {header('Contributor pool · no statement yet', null)}
        <div data-testid="grainhack-issue-box" className={`flex flex-col gap-4 rounded-[16px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${t.banner.gold}`}>
          <div className="flex min-w-0 flex-1 gap-3">
            <FileSignature className={`mt-0.5 h-5 w-5 shrink-0 ${t.muted}`} aria-hidden />
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className={`text-[15px] font-bold ${t.strong}`}>Issue the results statement</p>
              <p className={`text-[13px] leading-[1.5] ${t.body}`}>
                The backend signs the event&apos;s payout computation as the statement the signer pays from: each winner, their
                amount, and whether they are payable or held for KYC. It can&apos;t be edited once issued. Issuing pays nobody.
              </p>
              <p className={`text-[12px] ${t.muted}`}>
                Refused until the event is settled with appeals closed, and refused for a pool that already has a KeeperHub run.
              </p>
              {state.currentPayoutRunId === null && (
                <p data-testid="grainhack-no-computation" className={`text-[12px] ${t.muted}`}>
                  The event has no payout computation yet, so there is nothing to put on a statement.
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
            <PrimaryButton onClick={() => setConfirmOpen(true)} disabled={issuing}>
              <FileSignature className="h-4 w-4" aria-hidden />
              Issue statement
            </PrimaryButton>
            <span className={`text-[12px] ${t.muted}`}>Opens a confirmation first</span>
          </div>
        </div>
        {refusalBox(null)}
        {confirm}
      </>,
      'no-statement',
    );
  }

  const s = state.view;
  const canon = state.canonical;
  const agentRead = agent ?? null;
  const rows = winnerRows(s, agentRead);
  const totals = payoutTotals(s.pool_minor, rows);
  const money = (minor: string) => usdc(minor, s.network);
  const held = rows.filter((r) => r.status === 'held_kyc' || r.status === 'held_kyc_cleared');
  const waiting = rows.filter((r) => r.status === 'waiting');
  const behind = agentBehind(s, agentRead);
  const chainAt = s.chain.indexOf(s.statement_id);

  const fact = (label: string, value: ReactNode, testId?: string) => (
    <div className="flex min-w-0 flex-col gap-0.5" data-testid={testId}>
      <dt className={`text-[12px] font-semibold ${t.muted}`}>{label}</dt>
      <dd className={`min-w-0 break-all text-[13px] ${t.strong}`}>{value}</dd>
    </div>
  );

  const statementBox = (
    <div data-testid="grainhack-statement" className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:p-5 ${t.tile}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[14px] font-bold ${t.strong}`}>Results statement</p>
        {chip('green', 'Issued · signed · immutable', 'grainhack-statement-status')}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
        {fact(
          'Statement',
          <span className="inline-flex items-center gap-1">
            <span className="font-mono">{shortUuid(s.statement_id)}</span>
            <CopyButton t={t} value={s.statement_id} label="Copy statement id" />
          </span>,
        )}
        {fact('Format', canon ? `v${canon.v} · ${canon.kind}` : 'Unreadable', 'grainhack-statement-version')}
        {fact(
          'Supersedes',
          s.supersedes ? <span className="font-mono">{shortUuid(s.supersedes)}</span> : <span className={t.muted}>Nothing: the first statement</span>,
          'grainhack-statement-supersedes',
        )}
        {fact(
          'Issued',
          <>
            {format(new Date(s.issued_at), 'd MMM yyyy, HH:mm')} · by admin <span className="font-mono">{shortUuid(s.issued_by)}</span>
          </>,
          'grainhack-statement-issued',
        )}
        {fact('Computation', <span className="font-mono">{shortUuid(s.computation_id)}</span>)}
        {fact(
          'Chain',
          s.chain.length > 1 && chainAt >= 0 ? `Statement ${chainAt + 1} of ${s.chain.length}` : 'The only statement',
          'grainhack-statement-chain',
        )}
        {fact('Signature', s.signature ? <span className="font-mono">{shortTx(s.signature)}</span> : <span className={t.muted}>Not returned</span>)}
        {fact('SHA-256', <span className="font-mono">{shortTx(s.statement_sha256)}</span>)}
      </dl>
    </div>
  );

  const totalsBox = (
    <div className="flex flex-col gap-2.5">
      <p className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>Against the pool</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:gap-3" data-testid="grainhack-totals">
        {[
          { key: 'pool', label: 'Pool', value: money(totals.poolMinor), hint: plural(rows.length, 'winner', 'winners'), tone: 'neutral' as const },
          { key: 'paid', label: 'Paid', value: money(totals.paidMinor), hint: 'confirmed on chain', tone: 'green' as const },
          { key: 'sending', label: 'Sending', value: money(totals.sendingMinor), hint: 'sent, not yet confirmed or reported', tone: 'amber' as const },
          { key: 'outstanding', label: 'Not paid yet', value: money(totals.outstandingMinor), hint: 'held, waiting or awaiting approval', tone: 'neutral' as const },
        ].map((k) => (
          <li
            key={k.key}
            data-total={k.key}
            className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:rounded-[14px] sm:p-3.5 ${k.key === 'sending' && totals.sendingMinor !== '0' ? t.tileAlert : t.tile}`}
          >
            <span className={`text-[12px] font-bold ${t.toneText[k.tone]}`}>{k.label}</span>
            <span className="flex flex-col items-end gap-0.5 sm:items-start">
              <span className={`text-[14px] font-semibold tabular-nums sm:text-[18px] ${t.strong}`}>{k.value}</span>
              <span className={`text-[12px] ${t.muted}`}>{k.hint}</span>
            </span>
          </li>
        ))}
      </ul>
      {totals.sumsToPool ? (
        <p className={`text-[12px] ${t.muted}`} data-testid="grainhack-sums">
          Every line, payable and held, adds up to the pool exactly. Paid, sending and not paid yet add up to it too.
        </p>
      ) : (
        <p data-testid="grainhack-sums" className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.errorBox}`}>
          The statement&apos;s lines add up to {money(totals.linesMinor)}, not the pool of {money(totals.poolMinor)}. The signer
          refuses a statement like this; check the computation before anyone approves.
        </p>
      )}
    </div>
  );

  const command = approveCommand(s.hackathon_id);
  const approveBox = (
    <div data-testid="grainhack-approve" className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:p-5 ${waiting.length > 0 ? t.banner.gold : t.banner.neutral}`}>
      <div className="flex gap-3">
        <Terminal className={`mt-0.5 h-5 w-5 shrink-0 ${t.muted}`} aria-hidden />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className={`text-[15px] font-bold ${t.strong}`}>
            {waiting.length > 0
              ? `${plural(waiting.length, 'payable winner is', 'payable winners are')} waiting for a wallet or approval`
              : 'Nobody payable is waiting right now'}
          </p>
          <p className={`text-[13px] leading-[1.5] ${t.body}`}>
            Payments are approved in the agent repo, on the approver&apos;s own machine: the key never leaves it. The command lists
            every winner and the total, then asks for each amount to be typed before signing it. One signature per winner, never a
            batch.
          </p>
        </div>
      </div>
      <div className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 ${t.pillBox}`}>
        <code data-testid="grainhack-approve-command" className={`min-w-0 flex-1 break-all font-mono text-[13px] ${t.strong}`}>
          {command}
        </code>
        <CopyButton t={t} value={command} label="Copy the approve-event command" />
      </div>
    </div>
  );

  const agentNote =
    agent === 'unavailable' ? (
      <p data-testid="grainhack-agent-note" className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.warnBox}`}>
        Couldn&apos;t read the agent&apos;s payouts. Held winners are known from the statement; everyone else&apos;s payment status
        isn&apos;t known from this page until it can be read.
      </p>
    ) : !agentImported(agentRead) ? (
      <p data-testid="grainhack-agent-note" className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.note} ${t.body}`}>
        The agent hasn&apos;t imported this statement yet. It does so on its own poll, or run{' '}
        <Code t={t}>pnpm cli grainhack import {s.statement_id}</Code> in the agent repo.
      </p>
    ) : behind ? (
      <p data-testid="grainhack-agent-note" className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.warnBox}`}>
        The agent is still on an older statement (issued{' '}
        {format(new Date((agentRead as Exclude<AgentRead, null | 'unavailable'>).statement!.issuedAt), 'd MMM yyyy, HH:mm')}), not this
        one. Until it imports <span className="font-mono">{shortUuid(s.statement_id)}</span> its waiting and sending statuses below
        are from the older statement.
      </p>
    ) : null;

  const winnerRow = (r: WinnerRow) => (
    <li
      key={r.github_user_id}
      data-testid="grainhack-winner"
      data-status={r.status}
      className={`flex flex-col gap-2 rounded-[16px] p-4 ${r.status === 'sending' ? t.legAlert : t.leg}`}
    >
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-2 sm:grid-cols-[190px_minmax(0,1fr)_minmax(0,1.2fr)_150px] sm:items-center sm:gap-4">
        <StatusPill t={t} status={r.status} />
        <span className={`justify-self-end whitespace-nowrap text-[13px] font-semibold tabular-nums sm:order-last sm:text-[14px] ${t.strong}`}>{money(r.amount_minor)}</span>
        <span className={`col-span-2 text-[14px] font-semibold sm:col-span-1 ${t.strong}`}>@{r.login}</span>
        <div className={`col-span-2 flex flex-col gap-0.5 text-[12px] sm:col-span-1 ${t.muted}`}>
          {r.txSignature ? (
            r.txUrl ? (
              <a href={r.txUrl} target="_blank" rel="noreferrer" className={`inline-flex min-h-[32px] items-center gap-1.5 underline-offset-2 hover:underline sm:min-h-0 ${t.link}`}>
                <span className="font-mono">{shortTx(r.txSignature)}</span> {explorerNameForUrl(r.txUrl)}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <span className="font-mono">{shortTx(r.txSignature)}</span>
            )
          ) : null}
          <span>{WINNER_STATUS_HINT[r.status]}</span>
          {r.kycLapsed && (
            <span data-testid="grainhack-kyc-lapsed" className={t.toneText.amber}>
              Their KYC is no longer verified. The signer still pays a payable line; a superseding statement would hold it.
            </span>
          )}
        </div>
      </div>
    </li>
  );

  const order: WinnerStatus[] = ['sending', 'paid_unreported', 'held_kyc_cleared', 'waiting', 'held_kyc', 'not_imported', 'agent_unavailable', 'paid'];
  const sorted = rows.slice().sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return shell(
    <>
      {header(
        `Contributor pool · ${money(s.pool_minor)} · ${plural(rows.length, 'winner', 'winners')}${held.length > 0 ? `, ${held.length} held for KYC` : ''}`,
        <>
          {networkChip(s.network)}
          {chip(totals.paidMinor === totals.poolMinor ? 'green' : 'neutral', totals.paidMinor === totals.poolMinor ? 'Every winner paid' : `${rows.filter((r) => r.status === 'paid').length} of ${rows.length} paid`, 'grainhack-state-chip')}
        </>,
      )}
      {statementBox}
      {totalsBox}
      {agentNote}
      <div className="flex flex-col gap-2">
        <h4 className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>Winners ({rows.length})</h4>
        <ul className="flex flex-col gap-2">{sorted.map(winnerRow)}</ul>
      </div>
      {approveBox}
      {(s.supersede_available || held.length > 0) && (
        <div
          data-testid="grainhack-supersede"
          data-available={s.supersede_available ? 'yes' : 'no'}
          className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${s.supersede_available ? t.banner.gold : t.banner.neutral}`}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className={`text-[14px] font-bold ${t.strong}`}>
              {s.supersede_available ? "A winner's KYC has changed since this statement" : "When a held winner's KYC clears"}
            </p>
            <p className={`text-[13px] leading-[1.5] ${t.body}`}>
              {s.supersede_available
                ? 'Issue a new statement. It supersedes this one with the same computation and amounts, with each line held or payable as their KYC is now. Anyone already paid stays paid and is never paid twice.'
                : 'Nothing has changed yet. Once their KYC is verified, this offers a new statement that supersedes this one and marks them payable.'}
            </p>
          </div>
          {s.supersede_available && (
            <SecondaryButton t={t} onClick={() => setConfirmOpen(true)} disabled={issuing}>
              Issue a superseding statement
            </SecondaryButton>
          )}
        </div>
      )}
      {refusalBox(s.network)}
      {confirm}
    </>,
    'issued',
  );
}

function StatusPill({ t, status }: { t: Tokens; status: WinnerStatus }) {
  const Icon =
    status === 'paid' || status === 'paid_unreported' ? CheckCircle2
      : status === 'sending' ? CircleHelp
        : status === 'held_kyc' ? PauseCircle
          : status === 'held_kyc_cleared' ? ShieldCheck
            : status === 'waiting' ? Wallet
              : status === 'agent_unavailable' ? AlertTriangle
                : Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold ${t.chip[WINNER_STATUS_TONE[status]]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {WINNER_STATUS_LABEL[status]}
    </span>
  );
}

function CopyButton({ t, value, label }: { t: Tokens; value: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => toast.success('Copied.'),
          () => toast.error("Couldn't copy."),
        );
      }}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${t.muted}`}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function ConfirmIssue({
  t,
  superseding,
  network,
  busy,
  onCancel,
  onConfirm,
}: {
  t: Tokens;
  superseding: boolean;
  network: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmShell t={t} testId="grainhack-issue-confirm" titleId="grainhack-issue-confirm-title" busy={busy} onCancel={onCancel}>
      <div className="flex flex-col gap-1.5">
        <h2 id="grainhack-issue-confirm-title" className="text-[18px] font-bold">
          {superseding ? 'Issue a superseding statement?' : 'Issue the results statement?'}
        </h2>
        <p className={`text-[13px] ${t.muted}`}>
          Contributor pool · {network ? `${networkLabel(network)}${isTestNetwork(network) ? ', test USDC with no value' : ', real USDC'}` : 'network as configured on the backend'}
        </p>
      </div>
      <ul className={`flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-[1.5] ${t.body}`}>
        <li>The backend signs it. It can&apos;t be edited afterwards; a correction is another statement that supersedes it.</li>
        <li>Winners held for KYC stay on it, held, and are told in-app. Winners with no Solana wallet are asked to link one.</li>
        <li>Nobody is paid by issuing. Each payment still needs its own approval with approve-event.</li>
        {superseding && <li>Anyone already paid under an earlier statement stays paid and is never paid again.</li>}
      </ul>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5">
        <SecondaryButton t={t} onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={busy}>
          <FileSignature className="h-4 w-4" aria-hidden />
          {busy ? 'Issuing…' : superseding ? 'Issue superseding statement' : 'Issue statement'}
        </PrimaryButton>
      </div>
    </ConfirmShell>
  );
}
