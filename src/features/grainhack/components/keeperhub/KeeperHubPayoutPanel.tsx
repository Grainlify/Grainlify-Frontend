import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, CircleHelp, Clock, Copy, ExternalLink, Send, XCircle } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { isApiError } from '../../../../shared/api/apiError';
import {
  getKeeperHubRun,
  readKeeperHubResults,
  releaseKeeperHubRun,
  resolveKeeperHubLeg,
  type KeeperHubLeg,
  type KeeperHubLegStatus,
  type KeeperHubRunView,
} from '../../../../shared/api/client';
import {
  ATTEMPT_STATE_LABEL,
  EXCLUSION_REASON,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  attemptsAwaitingRead,
  explorerLabel,
  formatMinor,
  legName,
  nonClosure,
  plural,
  sendState,
  shortAddress,
  shortHash,
  shortId,
  statusHint,
  statusTotals,
  whoseLegs,
  type SendState,
  type Tone,
} from './keeperhubModel';

/** The contributor pool's KeeperHub payout, for one event.
 *
 *  Built against GET /admin/hackathons/:id/keeperhub/run (Grainlify-Backend
 *  #561) and the approved legs designs. Three rules carry the design:
 *
 *  - No totals. The tiles are five separate per-status figures from
 *    derived_from_legs; nothing on this panel adds them up.
 *  - The chain belongs to the run and is shown once, in the header.
 *  - keeperhub_not_configured is a read-only state, not an error: every leg
 *    still shows, and each disabled control says why.
 *
 *  Dashboard surface: no motion anywhere, including the confirmation dialog.
 */
export function KeeperHubPayoutPanel({ hackathonId }: { hackathonId: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const t = tokens(dark);

  const [view, setView] = useState<KeeperHubRunView | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [reading, setReading] = useState(false);
  const [resolvingLeg, setResolvingLeg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await getKeeperHubRun(hackathonId));
      setLoadError(null);
    } catch (e) {
      setLoadError(isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : 'load_failed');
    }
  }, [hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shell = (children: ReactNode, state: string) => (
    <section
      aria-labelledby="keeperhub-payout-title"
      data-testid="keeperhub-panel"
      data-state={state}
      className={`flex flex-col gap-5 rounded-[24px] border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-[40px] sm:p-6 ${t.panel}`}
    >
      {children}
    </section>
  );
  const title = (
    <h3 id="keeperhub-payout-title" className={`text-[16px] font-bold ${t.strong}`}>
      Payout on KeeperHub
    </h3>
  );

  if (loadError) {
    return shell(
      <>
        {title}
        <p className={`text-[13px] ${t.muted}`}>
          {loadError === 'database_not_configured'
            ? "The payout run can't be read: this server has no database configured."
            : "Couldn't load the KeeperHub payout. Nothing about the run is known from this page right now — reload to try again."}
        </p>
        <Code t={t}>{loadError}</Code>
      </>,
      'load-failed',
    );
  }
  if (view === undefined) {
    return shell(<>{title}<p className={`text-[13px] ${t.muted}`}>Loading the payout run…</p></>, 'loading');
  }
  if (view === null) {
    return shell(
      <>
        {title}
        <p className={`text-[13px] ${t.muted}`}>No KeeperHub payout run for this event&apos;s contributor pool yet.</p>
        <Code t={t}>404 not_found</Code>
      </>,
      'no-run',
    );
  }

  const { run } = view;
  const money = (minor: string) => formatMinor(minor, run.asset_decimals, run.asset_symbol);
  const ordinalOf = new Map(view.attempts.map((a) => [a.id, a.ordinal]));
  const state = sendState(view);
  const readOnly = state.kind === 'not_configured';
  const legsBy = (s: KeeperHubLegStatus) => view.legs.filter((l) => l.status === s);
  const sendable = view.legs.filter((l) => view.resume.sendable_leg_ids.includes(l.id));
  const paid = legsBy('confirmed');
  const gap = nonClosure(view);

  // ---- actions -------------------------------------------------------------

  const send = async () => {
    setSending(true);
    try {
      const res = await releaseKeeperHubRun(hackathonId, { payoutRunId: run.payout_run_id, chainId: run.chain_id, pool: run.pool });
      toast.success(
        `KeeperHub accepted ${plural(res.release.dispatched_leg_ids.length, 'leg', 'legs')}. Accepted is not paid: read the results once the execution finishes.`,
      );
    } catch (e) {
      toast.error(releaseFailure(e));
    } finally {
      setSending(false);
      setConfirmOpen(false);
      // Whatever happened, the legs may have moved (a failed dispatch can
      // leave them unknown), so the page never keeps the old picture.
      await load();
    }
  };

  const readResults = async (attemptId: string) => {
    setReading(true);
    try {
      const res = await readKeeperHubResults(hackathonId, attemptId);
      if (!res.intake.finished) {
        toast.message('KeeperHub is still running this attempt. Nothing was recorded; read again shortly.');
      } else if (res.blocking) {
        toast.warning('Results read. Some legs came back without a result and now need resolving before anything else is sent.');
      } else if (res.intake.already_reconciled) {
        toast.message('These results were already read. Nothing changed.');
      } else {
        toast.success('Results read.');
      }
    } catch (e) {
      const code = isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : '';
      toast.error(
        code === 'execution_input_mismatch'
          ? "The execution KeeperHub returned doesn't match what was sent. Nothing was marked paid; check the attempt on KeeperHub."
          : `Couldn't read the results${code ? ` (${code})` : ''}. Nothing was recorded.`,
      );
    } finally {
      setReading(false);
      await load();
    }
  };

  // ---- pieces --------------------------------------------------------------

  const chip = (tone: Tone | 'gold', label: string, testId?: string) => (
    <span data-testid={testId} className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${t.chip[tone]}`}>
      {label}
    </span>
  );

  const stateChip = (() => {
    switch (state.kind) {
      case 'allowed':
        return chip('amber', `${plural(sendable.length, 'leg', 'legs')} ready to ${paid.length > 0 || view.attempts.length > 0 ? 'resend' : 'send'}`, 'keeperhub-state-chip');
      case 'not_configured':
        return chip('neutral', 'Read-only: KeeperHub not configured', 'keeperhub-state-chip');
      case 'may_have_paid':
        return chip('amber', `Blocked: ${plural(legsBy('unknown').length, 'leg', 'legs')} may have paid`, 'keeperhub-state-chip');
      case 'awaiting_result':
        return chip('neutral', 'Awaiting results', 'keeperhub-state-chip');
      case 'run_failed':
        return chip('red', 'Run failed', 'keeperhub-state-chip');
      case 'nothing_unpaid':
        return chip('green', 'Every leg paid', 'keeperhub-state-chip');
      default:
        return chip('neutral', 'Sending unavailable', 'keeperhub-state-chip');
    }
  })();

  const tiles = (
    <div className="flex flex-col gap-2.5">
      <p className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>
        Legs by status · five separate counts, not parts of one total
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-3" data-testid="keeperhub-tiles">
        {STATUS_ORDER.map((s) => {
          const tot = statusTotals(view, s);
          const hint = statusHint(s, tot.count);
          const highlight = s === 'unknown' && tot.count > 0;
          return (
            <li
              key={s}
              data-status={s}
              className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:rounded-[14px] sm:p-3.5 ${highlight ? t.tileAlert : t.tile}`}
            >
              <span className={`text-[12px] font-bold ${t.toneText[STATUS_TONE[s]]}`}>{STATUS_LABEL[s]}</span>
              <span className="flex items-baseline gap-2 sm:flex-col sm:items-start sm:gap-1">
                <span className={`text-[16px] font-semibold tabular-nums sm:text-[22px] ${t.strong}`}>{tot.count}</span>
                <span className={`text-right text-[12px] tabular-nums sm:text-left ${t.muted}`}>
                  {money(tot.amount_minor)}
                  <span className="hidden sm:inline">{hint ? ` · ${hint}` : ''}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {gap ? (
        <div data-testid="keeperhub-nonclosure" className={`rounded-[12px] border px-3 py-2.5 text-[13px] leading-[1.5] ${t.note}`}>
          <p className={`font-bold ${t.strong}`}>These don&apos;t add up to the pool, and aren&apos;t meant to.</p>
          <p className={t.body}>
            {nonClosureSentence(gap, money)}
          </p>
        </div>
      ) : (
        <p className={`text-[12px] ${t.muted}`}>
          Counted from the legs below. KeeperHub returns no total for a partly failed run, and excluded people aren&apos;t
          legs, so they aren&apos;t counted here.
        </p>
      )}
    </div>
  );

  const reasonCode = (text: ReactNode) => <Code t={t}>{text}</Code>;
  const readButton = (() => {
    const attempt = attemptsAwaitingRead(view)[0];
    if (!attempt) return null;
    return (
      <SecondaryButton t={t} disabled={readOnly || reading} onClick={() => void readResults(attempt.id)}>
        {reading ? 'Reading results…' : 'Read results'}
      </SecondaryButton>
    );
  })();

  const banner = (tone: 'gold' | 'neutral' | 'red', icon: ReactNode, heading: string, body: ReactNode, foot: ReactNode, action?: ReactNode) => (
    <div data-testid="keeperhub-send-box" className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${t.banner[tone]}`}>
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className={`text-[15px] font-bold ${t.strong}`}>{heading}</p>
          <div className={`text-[13px] leading-[1.5] ${t.body}`}>{body}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">{foot}</div>
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">{action}</div>}
    </div>
  );

  const sendBox = (() => {
    const s: SendState = state;
    const unknownLegs = legsBy('unknown');
    const failedLegs = legsBy('failed');
    switch (s.kind) {
      case 'allowed': {
        const amount = view.resume.sendable_amount_minor ?? '0';
        const noun = sendable.length === 1 ? 'leg' : 'legs';
        return (
          <div data-testid="keeperhub-send-box" className={`flex flex-col gap-4 rounded-[16px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${t.banner.gold}`}>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className={`text-[15px] font-bold ${t.strong}`}>Send the unpaid {noun}</p>
              <p className={`text-[13px] leading-[1.5] ${t.body}`}>
                Only Failed and Pending legs are sent.
                {paid.length > 0 && ` The ${plural(paid.length, 'paid leg is', 'paid legs are')} left out and never sent again.`}{' '}
                This goes to KeeperHub as a new execution under a new request key.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className={`font-semibold ${t.strong}`}>Sends only</span>
                {sendable.map((l) => (
                  <span key={l.id} className={`inline-flex flex-wrap items-center gap-x-2 rounded-[12px] border px-2.5 py-1 sm:rounded-full sm:py-0.5 ${t.pillBox}`}>
                    <span className={t.strong}>{legName(l)}</span>
                    <span className={`font-mono text-[12px] ${t.muted}`}>{shortAddress(l.address)}</span>
                    <span className={`font-semibold tabular-nums ${t.strong}`}>{money(l.amount_minor)}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
              <PrimaryButton onClick={() => setConfirmOpen(true)} disabled={sending}>
                <Send className="h-4 w-4" aria-hidden />
                <span className="tabular-nums">Send {plural(sendable.length, 'unpaid leg', 'unpaid legs')} · {money(amount)}</span>
              </PrimaryButton>
              <span className={`text-[12px] ${t.muted}`}>Opens a confirmation first</span>
            </div>
          </div>
        );
      }
      case 'not_configured':
        return banner(
          'neutral',
          <AlertTriangle className={`h-5 w-5 ${t.toneText.amber}`} />,
          "Nothing can be sent, read back or resolved: KeeperHub isn't configured on this server",
          <>The payout rail&apos;s KeeperHub settings are missing. Everything below comes from Grainlify&apos;s own records and is complete{unknownLegs.length > 0 ? ' — including the leg that may have paid, which still needs checking on Basescan once sending is available again' : ''}.</>,
          <>{reasonCode('resume.reason keeperhub_not_configured')}<span className={`text-[12px] ${t.muted}`}>send, read-results and resolve answer 503 until it&apos;s configured</span></>,
          <PrimaryButton disabled>Send unpaid legs</PrimaryButton>,
        );
      case 'may_have_paid':
        return (
          <div className="flex flex-col gap-3">
            {banner(
              'neutral',
              <AlertTriangle className={`h-5 w-5 ${t.toneText.amber}`} />,
              'Nothing can be sent while a leg may have paid',
              <>
                {failedLegs.length > 0 ? `${whoseLegs(failedLegs)} ${failedLegs.length === 1 ? 'is' : 'are'} ready to resend, but ` : ''}
                {whoseLegs(unknownLegs)} came back from KeeperHub with no result. Sending again could pay twice. Check Basescan and
                record what you find below; then the send unlocks.
              </>,
              reasonCode('resume.reason unreconciled_legs'),
              <PrimaryButton disabled>Send unpaid legs</PrimaryButton>,
            )}
            {legsBy('dispatched').length > 0 && awaitingBanner()}
          </div>
        );
      case 'awaiting_result':
        return awaitingBanner();
      case 'run_failed':
        return banner(
          'red',
          <XCircle className={`h-5 w-5 ${t.toneText.red}`} />,
          'This run has failed and needs a person before anything more is sent',
          <>{view.resume.detail ? <span className="block">{view.resume.detail}</span> : null}<span className="block">There is no way to reopen a failed run yet.</span></>,
          reasonCode('resume.reason run_failed'),
        );
      case 'nothing_unpaid':
        return banner(
          'neutral',
          <CheckCircle2 className={`h-5 w-5 ${t.toneText.green}`} />,
          'Every leg is paid. Nothing is left to send.',
          null,
          <>{reasonCode('resume.reason nothing_unpaid')}<span className={`text-[12px] ${t.muted}`}>with no leg blocking</span></>,
        );
      default:
        return banner(
          'neutral',
          <AlertTriangle className={`h-5 w-5 ${t.toneText.amber}`} />,
          'Nothing can be sent right now',
          view.resume.detail || 'Release would refuse this run.',
          reasonCode(`resume.reason ${s.kind === 'other' ? s.reason : ''}`),
          <PrimaryButton disabled>Send unpaid legs</PrimaryButton>,
        );
    }

    function awaitingBanner() {
      const attempt = attemptsAwaitingRead(view!)[0];
      return banner(
        'neutral',
        <Clock className={`h-5 w-5 ${t.muted}`} />,
        attempt ? `KeeperHub accepted attempt ${attempt.ordinal}: results not read yet` : 'KeeperHub accepted the last send: results not read yet',
        'Accepted is not paid. Its legs are marked awaiting result until they are read. Nothing else can be sent until then.',
        reasonCode('per-leg block_reason awaiting_result'),
        readButton,
      );
    }
  })();

  const failedHeading = readOnly
    ? 'resendable once sending is available'
    : state.kind === 'allowed'
      ? 'included in the next send'
      : 'resendable once the send unlocks';

  const groups: Array<{ status: KeeperHubLegStatus; heading: string }> = [
    { status: 'unknown', heading: 'May have paid · blocks every send' },
    { status: 'failed', heading: `Failed · ${failedHeading}` },
    { status: 'pending', heading: `Pending · ${state.kind === 'allowed' ? 'included in the next send' : 'not sent yet'}` },
    { status: 'dispatched', heading: 'Awaiting result · blocks every send' },
    { status: 'confirmed', heading: 'Paid · never sent again' },
  ];

  const legRow = (leg: KeeperHubLeg) => {
    const ordinal = leg.last_attempt_id ? ordinalOf.get(leg.last_attempt_id) : undefined;
    const unknown = leg.status === 'unknown';
    const open = resolvingLeg === leg.id;
    return (
      <li
        key={leg.id}
        data-testid="keeperhub-leg"
        data-status={leg.status}
        className={`flex flex-col gap-3 rounded-[16px] p-4 ${unknown ? t.legAlert : t.leg}`}
      >
        <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 sm:grid-cols-[150px_minmax(0,1.4fr)_minmax(0,1fr)_150px] sm:items-center sm:gap-4">
          <StatusPill t={t} status={leg.status} />
          <span className={`justify-self-end whitespace-nowrap text-[14px] font-semibold tabular-nums sm:order-last ${t.strong}`}>{money(leg.amount_minor)}</span>
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5 sm:col-span-1">
            <span className={`text-[14px] font-semibold ${leg.github_login ? t.strong : `italic ${t.muted}`}`}>{legName(leg)}</span>
            <span className={`flex items-center gap-1.5 ${t.muted}`}>
              <span className="break-all font-mono text-[12px]">{leg.address}</span>
              <CopyButton t={t} value={leg.address} label="Copy address" />
            </span>
          </div>
          <div className={`col-span-2 flex flex-col gap-0.5 text-[12px] sm:col-span-1 ${t.muted}`}>
            {leg.tx_hash ? (
              leg.explorer_url ? (
                <a href={leg.explorer_url} target="_blank" rel="noreferrer" className={`inline-flex min-h-[32px] items-center gap-1.5 underline-offset-2 hover:underline sm:min-h-0 ${t.link}`}>
                  <span className="font-mono">{shortHash(leg.tx_hash)}</span> {explorerLabel(leg.explorer_url)}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                <span className="font-mono">{shortHash(leg.tx_hash)}</span>
              )
            ) : (
              <span>No transaction hash recorded</span>
            )}
            {ordinal !== undefined && (
              <span>
                Attempt {ordinal}
                {leg.execution_id && !leg.tx_hash && <> · execution <span className="font-mono">{shortId(leg.execution_id)}</span></>}
              </span>
            )}
          </div>
        </div>

        {leg.last_error && leg.status !== 'confirmed' && (
          <p className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.errorBox}`}>{leg.last_error}</p>
        )}
        {leg.resolution_note && (
          <p className={`text-[12px] ${t.muted}`}>Resolved by an admin: {leg.resolution_note}</p>
        )}

        {unknown && (
          <>
            <p className={`rounded-[12px] border px-3 py-2.5 text-[13px] ${t.warnBox}`}>
              {readOnly
                ? 'Resolving is unavailable until KeeperHub is configured. You can still check Basescan now and note what you find.'
                : 'KeeperHub returned no result for this leg — treat it as unknown and resolve it before any resume.'}
            </p>
            {open && !readOnly ? (
              <ResolveForm
                t={t}
                leg={leg}
                attemptOrdinal={ordinal}
                explorerName={run.explorer_url_template ? explorerLabel(run.explorer_url_template.replace('%s', '0x')) : 'the explorer'}
                onCancel={() => setResolvingLeg(null)}
                onSubmit={async (input) => {
                  try {
                    await resolveKeeperHubLeg(hackathonId, leg.id, input);
                    toast.success(input.status === 'confirmed' ? 'Recorded as paid.' : 'Recorded as not paid. It goes out with the next send.');
                    setResolvingLeg(null);
                  } catch (e) {
                    const code = isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : '';
                    toast.error(`Nothing was recorded${code ? ` (${code})` : ''}.`);
                  } finally {
                    await load();
                  }
                }}
              />
            ) : (
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <SecondaryButton t={t} disabled={readOnly} onClick={() => setResolvingLeg(leg.id)}>
                  Resolve this leg
                </SecondaryButton>
              </div>
            )}
          </>
        )}
      </li>
    );
  };

  const history = view.attempts.length > 0 && (
    <div className="flex flex-col gap-2">
      <h4 className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>Send history</h4>
      <ol className="flex flex-col gap-2">
        {view.attempts.map((a) => {
          const noResult = view.legs.filter((l) => l.status === 'unknown' && l.last_attempt_id === a.id).length;
          const label = a.state === 'reconciled' && noResult > 0
            ? `Read · ${plural(noResult, 'leg', 'legs')} without result`
            : ATTEMPT_STATE_LABEL[a.state] ?? a.state;
          const tone: Tone = a.state === 'reconciled' ? (noResult > 0 ? 'amber' : 'green') : a.state === 'rejected' || a.state === 'mismatch' ? 'red' : 'neutral';
          return (
            <li key={a.id} data-testid="keeperhub-attempt" className={`flex flex-col gap-1.5 rounded-[14px] border px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between ${t.tile}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`font-semibold ${t.strong}`}>Attempt {a.ordinal}</span>
                <span className={`tabular-nums ${t.muted}`}>{format(new Date(a.created_at), 'd MMM yyyy, HH:mm')}</span>
                {chip(tone, label)}
              </div>
              <div className={`flex flex-wrap items-center gap-x-1 text-[12px] ${t.muted}`}>
                <span>{plural(a.leg_count, 'leg', 'legs')}</span>
                {a.execution_id && <span className="break-all">· execution <span className="font-mono">{a.execution_id}</span></span>}
                {a.idempotency_key && <span>· key <span className="font-mono">{shortId(a.idempotency_key)}</span></span>}
                {a.error && <span className={`basis-full ${t.toneText.red}`}>{a.error}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );

  const unpaidNames = new Set(sendable.map((l) => l.id));

  return shell(
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          {title}
          <p className={`text-[13px] tabular-nums ${t.muted}`}>
            Contributor pool · {money(run.pool_minor)} · {plural(view.derived_from_legs.leg_count, 'leg', 'legs')}
            {view.exclusions.length > 0 && `, ${view.exclusions.length} excluded`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chip('neutral', `Run pays on ${run.chain_id} · chain ${run.evm_chain_id}`, 'keeperhub-chain-chip')}
          {stateChip}
        </div>
      </div>

      {readOnly ? <>{sendBox}{tiles}</> : <>{tiles}{sendBox}</>}

      {groups.map(({ status, heading }) => {
        const legs = legsBy(status);
        if (legs.length === 0) return null;
        return (
          <div key={status} className="flex flex-col gap-2">
            <h4 className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${status === 'unknown' ? t.toneText.amber : t.muted}`}>
              {heading} ({legs.length})
            </h4>
            <ul className="flex flex-col gap-2">{legs.map(legRow)}</ul>
          </div>
        );
      })}

      {view.exclusions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>
            Not in this run · not a leg, never sent ({view.exclusions.length})
          </h4>
          <ul className="flex flex-col gap-2">
            {view.exclusions.map((e) => (
              <li key={e.user_id} data-testid="keeperhub-exclusion" className={`flex flex-col gap-1 rounded-[16px] border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between ${t.dashed}`}>
                <div className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    {chip('neutral', 'Excluded')}
                    <span className={`text-[14px] font-semibold ${e.github_login ? t.strong : `italic ${t.muted}`}`}>{legName(e)}</span>
                  </span>
                  <span className={`text-[12px] ${t.muted}`}>{EXCLUSION_REASON[e.reason] ?? e.reason}</span>
                </div>
                <span className={`text-[14px] font-semibold tabular-nums ${t.muted}`}>{money(e.amount_minor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history}

      {confirmOpen && (
        <ConfirmSend
          t={t}
          chain={`${run.chain_id} (chain ${run.evm_chain_id})`}
          sendable={sendable}
          paid={paid.filter((l) => !unpaidNames.has(l.id))}
          excluded={view.exclusions.map((e) => legName(e))}
          amount={money(view.resume.sendable_amount_minor ?? '0')}
          money={money}
          busy={sending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void send()}
        />
      )}
    </>,
    state.kind,
  );
}

function nonClosureSentence(gap: NonNullable<ReturnType<typeof nonClosure>>, money: (m: string) => string): string {
  const parts: string[] = [];
  if (gap.unknownLegs.length > 0) {
    parts.push(`${money(gap.unknownMinor)} sits in ${gap.unknownLegs.length === 1 ? 'a leg' : 'legs'} that may or may not have left the wallet`);
  }
  if (gap.dispatchedLegs.length > 0) {
    parts.push(`${money(gap.dispatchedMinor)} was accepted by KeeperHub but its result hasn't been read`);
  }
  if (gap.excludedMinor !== '0') {
    parts.push(`${money(gap.excludedMinor)} was excluded before anything was sent`);
  }
  const first = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}` : parts[0];
  const until = gap.unknownLegs.length > 0
    ? `until ${whoseLegs(gap.unknownLegs)} ${gap.unknownLegs.length === 1 ? 'is' : 'are'} resolved`
    : 'until the results are read';
  return `${first}. How much has been paid can't be settled ${until}.`;
}

function joinWords(words: string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function releaseFailure(e: unknown): string {
  const code = isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : '';
  const detail = isApiError(e) && typeof e.data?.detail === 'string' ? e.data.detail : '';
  switch (code) {
    case 'dispatch_outcome_unknown':
      return "KeeperHub's answer never came back, so the legs in this send may have paid. They are now marked May have paid: check the explorer before anything else.";
    case 'dispatch_rejected':
      return "KeeperHub refused the request, so nothing was sent. The legs stay failed and can be sent once that's fixed.";
    case 'concurrent_release':
      return 'Another send for this run is already in progress. Nothing new was sent.';
    case 'unreconciled_legs':
      return 'Nothing was sent: a leg may have paid or is still awaiting its result.';
    case 'nothing_unpaid':
      return 'Nothing was sent: every leg is already paid.';
    case 'keeperhub_not_configured':
      return "Nothing was sent: KeeperHub isn't configured on this server.";
    default:
      return `Nothing was sent${code ? ` (${code})` : ''}.${detail ? ` ${detail}` : ''}`;
  }
}

// ---- small components --------------------------------------------------------

type Tokens = ReturnType<typeof tokens>;

function tokens(dark: boolean) {
  return {
    panel: dark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20',
    strong: dark ? 'text-[#f5f5f5]' : 'text-[#2d2820]',
    body: dark ? 'text-[#d4d4d4]' : 'text-[#2d2820]',
    // Brighter than the settings card's #b8a898: this panel's tinted rows sit
    // on a lighter composite, and #b8a898 measured 4.1:1 there.
    muted: dark ? 'text-[#cdbfae]' : 'text-[#4a4038]',
    link: dark ? 'text-[#e8c571] hover:text-[#f5d98a]' : 'text-[#5c4214] hover:text-[#2d2820]',
    tile: dark ? 'border-white/10 bg-white/[0.04]' : 'border-white/30 bg-white/[0.20]',
    tileAlert: dark ? 'border-[#f59e0b]/45 bg-[#f59e0b]/[0.08] border-2' : 'border-[#b45309]/45 bg-[#f59e0b]/[0.10] border-2',
    note: dark ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/40 bg-white/[0.25]',
    leg: dark ? 'border border-white/10 bg-white/[0.06]' : 'border border-white/30 bg-white/[0.22]',
    legAlert: dark ? 'border-2 border-[#f59e0b]/55 bg-white/[0.06]' : 'border-2 border-[#b45309]/50 bg-white/[0.22]',
    dashed: dark ? 'border-white/20' : 'border-black/20',
    pillBox: dark ? 'border-white/10 bg-white/[0.08]' : 'border-white/40 bg-white/[0.30]',
    errorBox: dark ? 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]' : 'border-[#ef4444]/25 bg-[#ef4444]/[0.08] text-[#6f1818]',
    warnBox: dark ? 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fcd34d]' : 'border-[#b45309]/30 bg-[#f59e0b]/10 text-[#7c2d12]',
    banner: {
      gold: dark ? 'border-[#c9983a]/35 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/40 bg-[#c9983a]/10',
      neutral: dark ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/40 bg-white/[0.25]',
      red: dark ? 'border-[#ef4444]/30 bg-[#ef4444]/[0.08]' : 'border-[#ef4444]/30 bg-[#ef4444]/[0.06]',
    },
    chip: {
      neutral: dark ? 'bg-white/10 text-[#ddd2c4]' : 'bg-black/[0.06] text-[#352c24]',
      gold: dark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#5c4214]',
      amber: dark ? 'bg-[#f59e0b]/20 text-[#fbbf24]' : 'bg-[#f59e0b]/20 text-[#5f230e]',
      red: dark ? 'bg-[#ef4444]/20 text-[#fca5a5]' : 'bg-[#ef4444]/15 text-[#6f1818]',
      green: dark ? 'bg-[#22c55e]/20 text-[#4ade80]' : 'bg-[#22c55e]/20 text-[#123f22]',
    },
    toneText: {
      neutral: dark ? 'text-[#ddd2c4]' : 'text-[#4a4038]',
      amber: dark ? 'text-[#fbbf24]' : 'text-[#7c2d12]',
      red: dark ? 'text-[#fca5a5]' : 'text-[#6f1818]',
      green: dark ? 'text-[#4ade80]' : 'text-[#123f22]',
    },
    input: dark
      ? 'border-white/15 bg-white/[0.06] text-[#f5f5f5] placeholder:text-[#8f8272]'
      : 'border-black/15 bg-white/[0.35] text-[#2d2820] placeholder:text-[#6b5d4f]',
    secondary: dark
      ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]'
      : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]',
    dialog: dark ? 'bg-[#2d2820] border-white/10 text-[#f5f5f5]' : 'bg-[#e6dccd] border-white/50 text-[#2d2820]',
    radioOn: dark ? 'border-[#c9983a] bg-[#c9983a]/[0.12]' : 'border-[#8a6420] bg-[#c9983a]/[0.15]',
    radioOff: dark ? 'border-white/15 bg-white/[0.04]' : 'border-black/15 bg-white/[0.20]',
  };
}

function Code({ t, children }: { t: Tokens; children: ReactNode }) {
  return <span className={`font-mono text-[12px] ${t.muted}`}>{children}</span>;
}

function StatusPill({ t, status }: { t: Tokens; status: KeeperHubLegStatus }) {
  const tone = STATUS_TONE[status];
  const Icon = status === 'confirmed' ? CheckCircle2 : status === 'failed' ? XCircle : status === 'unknown' ? CircleHelp : Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold ${t.chip[tone]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_20px_rgba(162,121,44,0.35)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ t, children, onClick, disabled }: { t: Tokens; children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-[12px] border px-4 py-2 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px] ${t.secondary}`}
    >
      {children}
    </button>
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

function ResolveForm({
  t,
  leg,
  attemptOrdinal,
  explorerName,
  onCancel,
  onSubmit,
}: {
  t: Tokens;
  leg: KeeperHubLeg;
  attemptOrdinal: number | undefined;
  explorerName: string;
  onCancel: () => void;
  onSubmit: (input: { status: 'confirmed' | 'failed'; txHash: string; note: string }) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<'confirmed' | 'failed' | null>(null);
  const [txHash, setTxHash] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const missing: string[] = [];
  if (!outcome) missing.push('what you found');
  if (outcome === 'confirmed' && !txHash.trim()) missing.push('the transaction hash');
  if (!note.trim()) missing.push('what you checked');
  const ready = missing.length === 0;
  const hint = ready
    ? null
    : `Add ${joinWords(missing)} to record ${outcome === 'failed' ? 'it as not paid' : outcome === 'confirmed' ? 'it as paid' : 'a resolution'}.`;

  const option = (value: 'confirmed' | 'failed', label: string, sub: string) => (
    <label className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-[12px] border p-3 ${outcome === value ? t.radioOn : t.radioOff}`}>
      <input
        type="radio"
        id={`resolve-${leg.id}-${value}`}
        name={`resolve-${leg.id}`}
        checked={outcome === value}
        onChange={() => setOutcome(value)}
        className="mt-0.5 h-4 w-4 accent-[#a67c2e]"
      />
      <span className="flex flex-col gap-0.5">
        <span className={`text-[13px] font-semibold ${t.strong}`}>{label}</span>
        <span className={`text-[12px] ${t.muted}`}>{sub}</span>
      </span>
    </label>
  );

  return (
    <form
      data-testid="keeperhub-resolve-form"
      className={`flex flex-col gap-3 border-t pt-3 ${t.dashed}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || !outcome) return;
        setBusy(true);
        await onSubmit({ status: outcome, txHash: outcome === 'confirmed' ? txHash.trim() : '', note: note.trim() });
        setBusy(false);
      }}
    >
      <p className={`text-[14px] font-bold ${t.strong}`}>What did you find on {explorerName}?</p>
      <p className={`text-[13px] ${t.muted}`}>
        Look for a USDC transfer from the payout wallet to <span className="font-mono">{shortAddress(leg.address)}</span>
        {attemptOrdinal !== undefined ? ` after attempt ${attemptOrdinal} was sent.` : '.'}
      </p>
      <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <legend className="sr-only">Outcome</legend>
        {option('confirmed', 'It paid: I found the transfer', 'Marks the leg paid. It is never sent again.')}
        {option('failed', 'It did not pay: nothing reached this address', 'Marks the leg failed. It goes out with the next send.')}
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5" htmlFor={`resolve-${leg.id}-tx`}>
          <span className={`text-[13px] font-semibold ${t.strong}`}>
            Transaction hash <span className={`font-normal ${t.muted}`}>(required when it paid)</span>
          </span>
          <input
            id={`resolve-${leg.id}-tx`}
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            disabled={outcome === 'failed'}
            placeholder="0x…"
            className={`min-h-[44px] rounded-[12px] border px-3 font-mono text-[12px] disabled:opacity-50 ${t.input}`}
          />
        </label>
        <label className="flex flex-col gap-1.5" htmlFor={`resolve-${leg.id}-note`}>
          <span className={`text-[13px] font-semibold ${t.strong}`}>
            What you checked <span className={`font-normal ${t.muted}`}>(required)</span>
          </span>
          <textarea
            id={`resolve-${leg.id}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Transfer of the leg's amount in block …, matches this leg"
            className={`min-h-[72px] rounded-[12px] border px-3 py-2.5 text-[13px] ${t.input}`}
          />
        </label>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {hint && <span className={`text-[12px] sm:mr-auto ${t.muted}`} data-testid="keeperhub-resolve-hint">{hint}</span>}
        <SecondaryButton t={t} onClick={onCancel}>Cancel</SecondaryButton>
        <button
          type="submit"
          disabled={!ready || busy}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]"
        >
          {busy ? 'Recording…' : 'Record resolution'}
        </button>
      </div>
    </form>
  );
}

/** Static confirmation. Not the shared Modal: that one animates in, and this is
 *  a no-motion surface. */
function ConfirmSend({
  t,
  chain,
  sendable,
  paid,
  excluded,
  amount,
  money,
  busy,
  onCancel,
  onConfirm,
}: {
  t: Tokens;
  chain: string;
  sendable: KeeperHubLeg[];
  paid: KeeperHubLeg[];
  excluded: string[];
  amount: string;
  money: (m: string) => string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const legs = plural(sendable.length, 'leg', 'legs');
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keeperhub-confirm-title"
        data-testid="keeperhub-confirm"
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full max-w-[540px] flex-col gap-4 overflow-y-auto rounded-[24px] border p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)] sm:p-6 ${t.dialog}`}
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="keeperhub-confirm-title" className="text-[18px] font-bold tabular-nums">
            Send {plural(sendable.length, 'unpaid leg', 'unpaid legs')}?
          </h2>
          <p className={`text-[13px] ${t.muted}`}>Contributor pool · the run pays on {chain}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>Will be sent</p>
          <ul className="flex flex-col gap-2">
            {sendable.map((l) => (
              <li key={l.id} className={`flex items-center justify-between gap-3 rounded-[14px] border px-3.5 py-3 ${t.banner.gold}`}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14px] font-semibold">{legName(l)}</span>
                  <span className={`break-all font-mono text-[12px] ${t.muted}`}>{l.address}</span>
                </span>
                <span className="whitespace-nowrap text-[14px] font-semibold tabular-nums">{money(l.amount_minor)}</span>
              </li>
            ))}
          </ul>
        </div>
        {(paid.length > 0 || excluded.length > 0) && (
          <div className="flex flex-col gap-2">
            <p className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${t.muted}`}>Not sent</p>
            <div className={`flex flex-col gap-1.5 rounded-[14px] border px-3.5 py-3 text-[13px] ${t.banner.neutral}`}>
              {paid.length > 0 && (
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-3">
                  <span>{paid.map(legName).join(', ')}</span>
                  <span className={`font-semibold ${t.toneText.green}`}>Already paid · never sent again</span>
                </div>
              )}
              {excluded.length > 0 && (
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-3">
                  <span>{excluded.join(', ')}</span>
                  <span className={t.muted}>Excluded from this run</span>
                </div>
              )}
            </div>
          </div>
        )}
        <p className={`text-[13px] leading-[1.5] ${t.body}`}>
          This goes to KeeperHub as a new execution under a new request key. KeeperHub accepting it is not payment: a leg
          shows as Paid only after its result is read back.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5">
          <SecondaryButton t={t} onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onConfirm} disabled={busy}>
            <Send className="h-4 w-4" aria-hidden />
            <span className="tabular-nums">{busy ? 'Sending…' : `Send ${legs} · ${amount}`}</span>
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
