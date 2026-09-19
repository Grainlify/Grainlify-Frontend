import { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../../../shared/components/ui/aceternity/GlassCard';
import { GridBackground } from '../../../shared/components/ui/aceternity/GridBackground';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { formatMicroUsd, getBountyLedger, type BountyLedger as Ledger, type LedgerEvent, type LedgerEventKind } from '../../../shared/api/bountyAgent';
import { LeaderboardTable, RankChip, ScorePill, useHeaderText, type LeaderboardColumn } from '../../leaderboard/components/LeaderboardTable';
import { StatusNotice } from './StatusNotice';

/** The Bounties ledger: every bounty, inference call, gate result and payout,
 * each linked to its proof. Static on purpose (a Tier B/C surface: people read
 * it). Shared by the dashboard's ?tab=bounties&subtab=ledger and the public
 * /bounties/ledger, which differ only in the chrome around it.
 *
 * Built from existing parts: the leaderboard hero treatment, KeeperHub's tiles,
 * rows and chips, the leaderboard's filter controls, and the shared
 * LeaderboardTable for the events. */

const KIND_LABEL: Record<LedgerEventKind, string> = {
  bounty_posted: 'Bounty posted',
  inference: 'Inference',
  gate_passed: 'Gate passed',
  gate_refused: 'Gate refused',
  payout: 'Payout',
};

type Tone = 'neutral' | 'gold' | 'green' | 'red';
const KIND_TONE: Record<LedgerEventKind, Tone> = { bounty_posted: 'gold', inference: 'neutral', gate_passed: 'green', gate_refused: 'red', payout: 'green' };

const PERIODS = [
  { id: 'all', label: 'All time', days: Infinity },
  { id: '30', label: '30 days', days: 30 },
  { id: '7', label: '7 days', days: 7 },
] as const;
const KINDS = [
  { id: 'all', label: 'All', kinds: null },
  { id: 'bounties', label: 'Bounties', kinds: ['bounty_posted', 'gate_passed', 'gate_refused'] },
  { id: 'inference', label: 'Inference', kinds: ['inference'] },
  { id: 'payouts', label: 'Payouts', kinds: ['payout'] },
] as const;

export function Chip({ tone, children }: { tone: Tone; children: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  // KeeperHubPayoutPanel's chip tones.
  const c = {
    neutral: dark ? 'bg-white/10 text-[#ddd2c4]' : 'bg-black/[0.06] text-[#352c24]',
    gold: `bg-[#c9983a]/20 ${dark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`,
    green: `bg-[#22c55e]/20 ${dark ? 'text-[#4ade80]' : 'text-[#123f22]'}`,
    red: dark ? 'bg-[#ef4444]/20 text-[#fca5a5]' : 'bg-[#ef4444]/15 text-[#6f1818]',
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${c}`}>{children}</span>;
}

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export function BountyLedger() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const headerText = useHeaderText();

  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('all');
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('all');

  useEffect(() => {
    let mounted = true;
    setLoadError(null);
    getBountyLedger()
      .then((l) => mounted && setLedger(l))
      .catch((e) => mounted && setLoadError(e));
    return () => {
      mounted = false;
    };
  }, [attempt]);

  const events = useMemo(() => {
    if (!ledger) return [];
    const days = PERIODS.find((p) => p.id === period)!.days;
    const kinds = KINDS.find((k) => k.id === kind)!.kinds as readonly string[] | null;
    const cutoff = Date.now() - days * 86_400_000;
    return ledger.events.filter((e) => (days === Infinity || Date.parse(e.at) >= cutoff) && (!kinds || kinds.includes(e.kind)));
  }, [ledger, period, kind]);

  // The most recent paid bounty's whole chain, oldest first.
  const chain = useMemo(() => {
    if (!ledger) return [];
    const paid = ledger.events.find((e) => e.kind === 'payout' && e.bountyId);
    if (!paid) return [];
    // Oldest first; events in the same minute keep the loop's order (posted, priced, reviewed, gated, paid).
    const order: LedgerEventKind[] = ['bounty_posted', 'inference', 'gate_passed', 'gate_refused', 'payout'];
    return ledger.events
      .filter((e) => e.bountyId === paid.bountyId)
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at) || order.indexOf(a.kind) - order.indexOf(b.kind));
  }, [ledger]);

  const strong = dark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#cdbfae]' : 'text-[#4a4038]';
  const link = dark ? 'text-[#e8c571] hover:text-[#f5d98a]' : 'text-[#5c4214] hover:text-[#2d2820]';
  const panel = `flex flex-col gap-4 rounded-[24px] border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-6 ${dark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'}`;
  const tile = `rounded-[12px] border px-3 py-2.5 sm:rounded-[14px] sm:p-3.5 ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-white/30 bg-white/[0.20]'}`;
  const seg = (active: boolean) =>
    `px-3.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold transition-all max-sm:flex-1 max-sm:min-h-[36px] max-sm:px-1.5 max-sm:text-[12px] whitespace-nowrap ${
      active ? 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-md' : dark ? 'text-[#d4d4d4] hover:bg-white/[0.08]' : 'text-[#7a6b5a] hover:bg-white/[0.12]'
    }`;
  const segWrap = `flex items-center p-1 rounded-[12px] border ${dark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'}`;

  const columns: LeaderboardColumn<LedgerEvent & { n: number }>[] = [
    { key: 'n', header: '#', headerClassName: `col-span-1 ${headerText} max-sm:col-span-1 max-sm:col-start-1 max-sm:row-start-1`, cellClassName: 'col-span-1 flex items-center max-sm:col-span-1 max-sm:col-start-1 max-sm:row-start-1 max-sm:self-start', render: (e) => <RankChip rank={e.n} /> },
    { key: 'time', header: 'Time (UTC)', headerClassName: `col-span-2 ${headerText} max-sm:hidden`, cellClassName: `col-span-2 flex items-center text-[13px] tabular-nums ${dark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'} max-sm:col-span-1 max-sm:col-start-3 max-sm:row-start-2 max-sm:justify-end max-sm:text-[12px]`, render: (e) => fmtTime(e.at) },
    { key: 'event', header: 'Event', headerClassName: `col-span-2 ${headerText} max-sm:hidden`, cellClassName: 'col-span-2 flex items-center max-sm:col-span-1 max-sm:col-start-2 max-sm:row-start-2', render: (e) => <Chip tone={KIND_TONE[e.kind]}>{`${KIND_LABEL[e.kind]}${e.test ? ' · test' : ''}`}</Chip> },
    { key: 'detail', header: 'Detail', headerClassName: `col-span-3 ${headerText} max-sm:col-span-1 max-sm:col-start-2 max-sm:row-start-1`, cellClassName: 'col-span-3 flex items-center min-w-0 max-sm:col-span-1 max-sm:col-start-2 max-sm:row-start-1', render: (e) => <span title={e.detail} className={`min-w-0 text-[13.5px] font-bold truncate max-sm:whitespace-normal max-sm:line-clamp-2 max-sm:leading-snug ${strong}`}>{e.detail}</span> },
    { key: 'amount', header: 'Amount', headerClassName: `col-span-2 ${headerText} text-right max-sm:col-span-1 max-sm:col-start-3 max-sm:row-start-1`, cellClassName: 'col-span-2 flex items-center justify-end max-sm:col-span-1 max-sm:col-start-3 max-sm:row-start-1', render: (e) => <ScorePill>{e.amount ?? (e.kind === 'inference' ? 'mock' : '—')}</ScorePill> },
    {
      key: 'proof',
      header: 'Proof',
      headerClassName: `col-span-2 ${headerText} max-sm:hidden`,
      cellClassName: 'col-span-2 flex items-center min-w-0 max-sm:col-start-2 max-sm:col-span-2 max-sm:row-start-3',
      render: (e) =>
        e.proof.url ? (
          <a href={e.proof.url} target="_blank" rel="noreferrer" className={`min-w-0 truncate font-mono text-[12px] underline underline-offset-2 ${link}`}>{e.proof.label}</a>
        ) : (
          <span className={`min-w-0 truncate font-mono text-[12px] ${muted}`}>{e.proof.label}</span>
        ),
    },
  ];

  if (loadError) return <LoadFailed what="the bounty ledger" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;

  const t = ledger?.totals;
  const tiles = [
    { label: 'Creator fees in', value: t?.feesInMicro == null ? 'After launch' : formatMicroUsd(t.feesInMicro), hint: 'GRAIN · 75% to the treasury' },
    { label: 'Inference spend', value: t ? (t.inferenceSpendMicro == null ? '$0.00' : formatMicroUsd(t.inferenceSpendMicro)) : '…', hint: t?.inferenceSpendMicro == null ? 'no real spend yet: test gateway' : `of ${formatMicroUsd(t.inferenceCeilingMicro)} lifetime` },
    { label: 'Bounties paid', value: t ? String(t.bountiesPaidMainnet) : '…', hint: t ? `mainnet · ${t.bountiesPaidTest} devnet test` : '' },
    { label: 'Inference calls', value: t ? String(t.inferenceCalls) : '…', hint: 'each with its own receipt' },
  ];

  return (
    <div className="space-y-6">
      <GlassCard tone="solid" className="rounded-[28px] overflow-hidden">
        <GridBackground variant="dots" />
        <div className="relative z-10 p-10 max-sm:p-5 text-center">
          <h1 className={`text-[44px] font-bold drop-shadow-sm max-sm:text-[30px] max-sm:leading-tight ${strong}`}>
            <span className="bg-gradient-to-br from-[#e8c87a] via-[#c9983a] to-[#a67c2e] bg-clip-text text-transparent">Bounty</span>{' '}
            <span style={{ textShadow: '0 2px 8px rgba(201, 152, 58, 0.3), 0 0 20px rgba(201, 152, 58, 0.2)' }}>Ledger</span>
          </h1>
          <p className={`mt-3 text-[14px] max-w-2xl mx-auto leading-relaxed ${dark ? 'text-[#d4d4d4]' : 'text-[#6b5d4d]'}`}>
            Every GRAIN creator fee in, every inference call bought on UsePod, every bounty paid. Each row links to its transaction or receipt.
          </p>
        </div>
      </GlassCard>

      <StatusNotice status={ledger?.status ?? null} />

      <section aria-label="Totals" className={panel}>
        <p className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${muted}`}>All time</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:gap-3">
          {tiles.map((k) => (
            <div key={k.label} className={`${tile} flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1`}>
              <div className="flex flex-col">
                <span className={`text-[12px] font-bold ${dark ? 'text-[#ddd2c4]' : 'text-[#4a4038]'}`}>{k.label}</span>
                <span className={`text-[12px] tabular-nums sm:hidden ${muted}`}>{k.hint}</span>
              </div>
              <span className={`text-[16px] font-semibold tabular-nums sm:text-[22px] ${strong}`}>{k.value}</span>
              <span className={`hidden text-[12px] tabular-nums sm:block ${muted}`}>{k.hint}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="ledger-budget" className={panel}>
          <h2 id="ledger-budget" className={`text-[16px] font-bold ${strong}`}>Inference budget</h2>
          {(ledger?.budget ?? []).map((b) => (
            <div key={b.phase} className={`${tile} flex flex-col gap-2`}>
              <div className="flex justify-between text-[13px]">
                <span className={`font-semibold ${strong}`}>{b.phase === 'P2P3' ? 'P2/P3' : b.phase}</span>
                <span className={`tabular-nums ${muted}`}>{formatMicroUsd(b.spentMicro)} of {formatMicroUsd(b.allocationMicro)}</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-white/[0.08]' : 'bg-[#2d2820]/[0.08]'}`}>
                <div className="h-2 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e]" style={{ width: `${Math.min(100, (b.spentMicro / b.allocationMicro) * 100)}%` }} />
              </div>
            </div>
          ))}
          <p className={`text-[13px] leading-[1.5] ${dark ? 'text-[#d4d4d4]' : 'text-[#2d2820]'}`}>$5.00 for the life of the project, network fees included. The agent and its payment signer each stop at that ceiling on their own.</p>
        </section>

        <section aria-labelledby="ledger-chain" className={panel}>
          <h2 id="ledger-chain" className={`text-[16px] font-bold ${strong}`}>Receipt chain · latest paid bounty</h2>
          {chain.length === 0 ? (
            <p className={`text-[13px] ${muted}`}>No bounty has been paid yet.</p>
          ) : (
            chain.map((e, i) => (
              <div key={i} className={`flex flex-col gap-2 rounded-[16px] border p-4 sm:grid sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-white/30 bg-white/[0.22]'}`}>
                <span className="justify-self-start"><Chip tone={KIND_TONE[e.kind]}>{KIND_LABEL[e.kind]}</Chip></span>
                <div className="flex min-w-0 flex-col">
                  <span className={`text-[14px] font-semibold ${strong}`}>{e.detail}</span>
                  {e.proof.url ? (
                    <a href={e.proof.url} target="_blank" rel="noreferrer" className={`break-all font-mono text-[12px] underline-offset-2 hover:underline ${link}`}>{e.proof.label}</a>
                  ) : (
                    <span className={`break-all font-mono text-[12px] ${muted}`}>{e.proof.label}</span>
                  )}
                </div>
                <span className={`text-[13px] font-semibold tabular-nums sm:text-right sm:text-[14px] ${strong}`}>{e.amount ?? (e.kind === 'inference' ? 'mock' : '—')}</span>
              </div>
            ))
          )}
        </section>
      </div>

      <section aria-label="Filters" className="bg-white/[0.12] rounded-[20px] border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-5 max-sm:p-3 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between">
        <div role="group" aria-label="Period" className={segWrap}>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)} className={seg(period === p.id)}>{p.label}</button>
          ))}
        </div>
        <div role="group" aria-label="Event type" className={segWrap}>
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={seg(kind === k.id)}>{k.label}</button>
          ))}
        </div>
      </section>

      <LeaderboardTable
        ariaLabel="Ledger events"
        columns={columns}
        rows={events.map((e, i) => ({ ...e, n: i + 1 }))}
        getKey={(e) => `${e.at}-${e.kind}-${e.n}`}
        isLoaded={ledger !== null}
        interactive={false}
      />
      {ledger && events.length === 0 && <p className={`text-[13px] ${muted}`}>No events in this range.</p>}
      <p className={`text-[12px] ${dark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Rows marked "test" are the devnet run: test tokens with no value, and inference against a test gateway. They never count toward the real $5.00.</p>
    </div>
  );
}
