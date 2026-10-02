import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle, Send } from 'lucide-react';
import { isApiError } from '../../../../shared/api/apiError';
import {
  getHackathonSettlementPreview,
  releaseKeeperHubRun,
  type HackathonSettlementPreview,
  type LatestPayoutRun,
} from '../../../../shared/api/client';
import {
  PAYOUT_NETWORKS,
  PHASE_LABEL,
  formatMinor,
  isUuid,
  networkLabel,
  payoutNetwork,
  plural,
  releaseFailure,
  shortId,
  startState,
  type PayoutNetwork,
} from './keeperhubModel';
import { Code, ConfirmShell, PrimaryButton, SecondaryButton, type Tokens } from './keeperhubUi';

/** Settlement amounts are integer minor units of a 6-decimal asset
 *  (settlement.AssetDecimals on the backend). */
const DECIMALS = 6;

type ReadyPreview = Extract<HackathonSettlementPreview, { lines: unknown }>;

/** What the payout panel shows when an event has no KeeperHub run yet.
 *
 *  Before the event is settled it only says when a payout can start. Once it
 *  is, it reads the settlement preview (which writes nothing) and offers
 *  "Start payout": the first POST .../keeperhub/release, which plans the run
 *  - freezing each person's address and any exclusions - simulates every
 *  transfer, and only then sends.
 *
 *  The computation it pays is the event's newest, as the run endpoint reports
 *  it (latest_payout_run_id). Only a backend too old to report it gets a typed
 *  id instead, so this ships ahead of or behind that field. */
export function StartPayout({
  t,
  hackathonId,
  phase,
  latestPayoutRun,
  onDone,
}: {
  t: Tokens;
  hackathonId: string;
  phase: string | undefined;
  latestPayoutRun: LatestPayoutRun | undefined;
  onDone: () => Promise<void> | void;
}) {
  const [preview, setPreview] = useState<HackathonSettlementPreview | undefined>(undefined);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [chainId, setChainId] = useState(PAYOUT_NETWORKS[0].chainId);
  const [computationId, setComputationId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<{ message: string; code: string } | null>(null);

  useEffect(() => {
    if (phase !== 'settled' || latestPayoutRun?.id === null) return;
    let cancelled = false;
    setPreviewError(null);
    // The chain only labels the preview; amounts are the same on every chain.
    getHackathonSettlementPreview(hackathonId, PAYOUT_NETWORKS[0].chainId)
      .then((p) => !cancelled && setPreview(p))
      .catch((e) => {
        if (cancelled) return;
        setPreviewError(isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : 'load_failed');
      });
    return () => {
      cancelled = true;
    };
  }, [hackathonId, phase, latestPayoutRun?.id]);

  const state = startState(phase, preview, previewError, latestPayoutRun);
  const quiet = (text: string, code?: string) => (
    <>
      <p className={`text-[13px] ${t.muted}`}>{text}</p>
      {code && <Code t={t}>{code}</Code>}
    </>
  );

  switch (state.kind) {
    case 'phase_unknown':
      return quiet("No KeeperHub payout run for this event's contributor pool yet.", '404 not_found');
    case 'not_settled':
      return quiet(
        `No KeeperHub payout run for this event's contributor pool yet. A payout can start once the event is settled; it is ${PHASE_LABEL[state.phase] ?? state.phase} now.`,
        `phase ${state.phase}`,
      );
    case 'no_computation':
      return quiet(
        "This event has no payout computation yet, so there is nothing to start. It is written once, when the event moves to Settled: that step closes the appeal window and divides the pool. On a settled event its absence means that recompute failed - for example because an appeal was still pending - while the phase change went through.",
        'latest_payout_run_id null',
      );
    case 'loading':
      return quiet('No payout run yet. Reading what this event would pay…');
    case 'preview_failed':
      return quiet(
        "No payout run yet, and what this event would pay couldn't be read, so a payout can't be started from here. Reload to try again.",
        state.code,
      );
    case 'nothing_to_settle':
      return quiet(`There is nothing to pay for this event, so there is no payout to start. ${state.reason}`, 'nothing_to_settle');
    case 'settled_on_aptos':
      return quiet(
        "This pool is already settled on the Aptos rail, so it can't also be paid through KeeperHub.",
        `settlement ${state.settlementId ?? ''}`.trim(),
      );
    case 'does_not_sum':
      return quiet(
        "The computed amounts don't add up to the pool, so a payout can't be started. This needs a look at the event's verdicts before anything is sent.",
        'sums_to_pool false',
      );
  }

  const p = state.preview;
  const network = payoutNetwork(chainId) ?? PAYOUT_NETWORKS[0];
  const payable = p.lines.filter((l) => BigInt(l.amount_minor) > 0n);
  const money = (minor: string) => formatMinor(minor, DECIMALS, 'USDC');
  // The server's computation when it reports one; otherwise the typed id.
  const reported = latestPayoutRun?.id ?? null;
  const payoutRunId = reported ?? computationId.trim();
  const idReady = reported !== null || isUuid(computationId);
  const computedAt = latestPayoutRun?.createdAt ? format(new Date(latestPayoutRun.createdAt), 'd MMM yyyy, HH:mm') : null;
  const computationLabel = reported
    ? `${shortId(reported)}${computedAt ? ` · computed ${computedAt}` : ''}`
    : payoutRunId;

  const start = async () => {
    setSending(true);
    try {
      const res = await releaseKeeperHubRun(hackathonId, { payoutRunId, chainId, pool: 'contributor' });
      const excluded = res.release.exclusions?.length ?? 0;
      toast.success(
        `KeeperHub accepted ${plural(res.release.dispatched_leg_ids.length, 'leg', 'legs')} on ${network.name} (${network.network}).` +
          `${excluded > 0 ? ` ${plural(excluded, 'person was', 'people were')} excluded and not sent.` : ''}` +
          ' Accepted is not paid: read the results once the execution finishes.',
      );
      setLastError(null);
    } catch (e) {
      const code = isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : '';
      const detail = isApiError(e) && typeof e.data?.detail === 'string' ? e.data.detail : '';
      const message = releaseFailure(code, detail, { starting: true });
      toast.error(message);
      setLastError({ message, code: code || (e instanceof Error ? e.message : 'failed') });
    } finally {
      setSending(false);
      setConfirmOpen(false);
      // A refusal after planning (everyone excluded, a preflight that would
      // revert) still leaves a run behind, so the panel always re-reads.
      await onDone();
    }
  };

  return (
    <>
      <div
        data-testid="keeperhub-start-box"
        className={`flex flex-col gap-4 rounded-[16px] border p-4 sm:p-5 ${t.banner.gold}`}
      >
        <div className="flex flex-col gap-1.5">
          <p className={`text-[15px] font-bold ${t.strong}`}>Start the payout</p>
          <p className={`text-[13px] leading-[1.5] ${t.body}`}>
            Nothing has been sent for this event yet. Starting prepares the run from the settled results, freezes each
            person&apos;s verified address, simulates every transfer, and sends them to KeeperHub as one execution.
          </p>
          <p className={`text-[13px] tabular-nums ${t.muted}`} data-testid="keeperhub-start-summary">
            Contributor pool · {money(p.pool_minor)} · {plural(payable.length, 'person', 'people')} to pay
            {p.line_count > payable.length && `, ${p.line_count - payable.length} rounded to nothing`}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={`mb-2 text-[13px] font-semibold ${t.strong}`}>Network</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PAYOUT_NETWORKS.map((n) => (
              <label
                key={n.chainId}
                className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-[12px] border p-3 ${chainId === n.chainId ? t.radioOn : t.radioOff}`}
              >
                <input
                  type="radio"
                  name="keeperhub-start-network"
                  checked={chainId === n.chainId}
                  onChange={() => setChainId(n.chainId)}
                  className="mt-0.5 h-4 w-4 accent-[#a67c2e]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className={`text-[13px] font-semibold ${t.strong}`}>
                    {n.name} · {n.network}
                  </span>
                  <span className={`text-[12px] ${t.muted}`}>
                    chain {n.evmChainId} · {n.network === 'testnet' ? 'test USDC, no real value' : 'real USDC'}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {network.network === 'mainnet' && (
            <p className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.warnBox}`}>
              Mainnet sends real USDC. The KeeperHub workflow pays on the network fixed inside it; if that is Base Sepolia,
              results read back on the wrong chain are refused.
            </p>
          )}
        </fieldset>

        {reported !== null ? (
          <div className="flex flex-col gap-1" data-testid="keeperhub-start-computation">
            <span className={`text-[13px] font-semibold ${t.strong}`}>Pays computation</span>
            <span className={`text-[13px] ${t.body}`}>
              <span className="font-mono" title={reported}>{shortId(reported)}</span>
              {computedAt && <span className={t.muted}> · computed {computedAt}</span>}
            </span>
            <span className={`text-[12px] ${t.muted}`}>
              The event&apos;s newest payout computation, written when it moved to Settled. Release pays only this one.
            </span>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5" htmlFor="keeperhub-start-computation">
            <span className={`text-[13px] font-semibold ${t.strong}`}>
              Payout computation id <span className={`font-normal ${t.muted}`}>(required)</span>
            </span>
            <span className={`text-[12px] ${t.muted}`}>
              This server doesn&apos;t report the event&apos;s payout computation, so give its id: the newest
              hackathon_payout_runs row for this event, written when it moved to Settled.
            </span>
            <input
              id="keeperhub-start-computation"
              value={computationId}
              onChange={(e) => setComputationId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              spellCheck={false}
              className={`min-h-[44px] rounded-[12px] border px-3 font-mono text-[12px] ${t.input}`}
            />
            {computationId.trim() !== '' && !idReady && (
              <span className={`text-[12px] ${t.toneText.red}`} data-testid="keeperhub-start-id-hint">
                That isn&apos;t an id: it should look like 8-4-4-4-12 hexadecimal characters.
              </span>
            )}
          </label>
        )}

        {lastError && (
          <div data-testid="keeperhub-start-error" className={`flex flex-col gap-1 rounded-[12px] border px-3 py-2.5 text-[13px] ${t.errorBox}`}>
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {lastError.message}
            </span>
            <Code t={t}>{lastError.code}</Code>
          </div>
        )}

        <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <span className={`text-[12px] ${t.muted}`}>Opens a confirmation first</span>
          <PrimaryButton onClick={() => setConfirmOpen(true)} disabled={!idReady || sending || payable.length === 0}>
            <Send className="h-4 w-4" aria-hidden />
            Start payout
          </PrimaryButton>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmStart
          t={t}
          network={network}
          payable={payable}
          money={money}
          computation={computationLabel}
          computationId={payoutRunId}
          busy={sending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void start()}
        />
      )}
    </>
  );
}

function ConfirmStart({
  t,
  network,
  payable,
  money,
  computation,
  computationId,
  busy,
  onCancel,
  onConfirm,
}: {
  t: Tokens;
  network: PayoutNetwork;
  payable: ReadyPreview['lines'];
  money: (m: string) => string;
  computation: string;
  computationId: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const testnet = network.network === 'testnet';
  return (
    <ConfirmShell t={t} testId="keeperhub-start-confirm" titleId="keeperhub-start-title" busy={busy} onCancel={onCancel}>
      <div className="flex flex-col gap-1.5">
        <h2 id="keeperhub-start-title" className="text-[18px] font-bold">
          Start the payout on {network.name} {testnet ? '(testnet)' : '(mainnet)'}?
        </h2>
        <p className={`text-[13px] ${t.muted}`} data-testid="keeperhub-start-network">
          Contributor pool · pays on {networkLabel(network)} · {testnet ? 'test USDC, no real value' : 'real USDC'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>
          Up to {plural(payable.length, 'transfer', 'transfers')}, one per person
        </p>
        <ul className="flex flex-col gap-2" data-testid="keeperhub-start-lines">
          {payable.map((l) => (
            <li key={l.user_id} className={`flex items-center justify-between gap-3 rounded-[14px] border px-3.5 py-3 ${t.banner.gold}`}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] font-semibold">Person {shortId(l.user_id)}</span>
                <span className={`break-all font-mono text-[12px] ${t.muted}`}>user {l.user_id}</span>
              </span>
              <span className="whitespace-nowrap text-[14px] font-semibold tabular-nums">{money(l.amount_minor)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`flex flex-col gap-1.5 rounded-[14px] border px-3.5 py-3 text-[13px] leading-[1.5] ${t.banner.neutral}`}>
        <p>
          Each person is paid at their verified {network.name} address, read and frozen the moment you confirm. Anyone
          without a linked GitHub account, a verified identity, or a verified address on {network.name} is excluded and
          not sent; their amount is held, and they&apos;re listed once the run exists.
        </p>
        <p>
          Every transfer is simulated before anything is sent. If one would fail (a payout wallet short of USDC or gas,
          a bad address), nothing is sent.
        </p>
        <p className={t.muted}>
          Computation <span className="font-mono" title={computationId}>{computation}</span>
        </p>
      </div>

      <p className={`text-[13px] leading-[1.5] ${t.body}`}>
        This goes to KeeperHub as one execution. KeeperHub accepting it is not payment: a leg shows as Paid only after
        its result is read back.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5">
        <SecondaryButton t={t} onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={busy}>
          <Send className="h-4 w-4" aria-hidden />
          {busy ? 'Starting…' : `Start payout on ${network.name}`}
        </PrimaryButton>
      </div>
    </ConfirmShell>
  );
}
