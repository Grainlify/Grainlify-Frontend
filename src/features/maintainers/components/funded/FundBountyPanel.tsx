import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  confirmFundedBounty,
  getFundedQuote,
  getMyProjects,
  prepareFundedBounty,
  type FundedQuote,
  type FundedStatus,
} from '../../../../shared/api/client';
import { humanDate } from '../../../../shared/utils/humanDate';
import { short, untilConfirmed, useFunderWallet } from './useFunderWallet';

/** Minor units from what a person types, or null if it is not an amount. */
export function toMinor(text: string, decimals: number): string | null {
  const t = text.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [whole, frac = ''] = t.split('.');
  if (frac.length > decimals) return null;
  const minor = BigInt(whole!) * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
  return minor > 0n ? minor.toString() : null;
}

export function fromMinor(minor: string, decimals: number): string {
  const n = BigInt(minor);
  const base = 10n ** BigInt(decimals);
  const frac = (n % base).toString().padStart(decimals, '0').slice(0, 2);
  return `${n / base}.${frac}`;
}

/**
 * Fund a bounty: the design approved as escrow-funding-design.html.
 *
 * The two ways of choosing a contributor are two equal buttons, neither
 * pre-selected as recommended. The numbers come from the agent's quote - the
 * same arithmetic the escrow will do - and change as the amount is typed. The
 * paragraph about what signing commits a funder to sits directly above the
 * button, in words, because it is the one thing about an escrow a funder
 * could be surprised by later.
 */
export function FundBountyPanel({ status, onFunded, onClose }: { status: FundedStatus; onFunded: (bountyId: string) => void; onClose: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const w = useFunderWallet();
  const [projects, setProjects] = useState<{ full: string; verified: boolean }[] | null>(null);
  const [repo, setRepo] = useState('');
  const [issue, setIssue] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(status.currencies[0]?.currency ?? 'USDC');
  const [mode, setMode] = useState<'draw' | 'self_assign' | null>(null);
  const minDate = useMemo(() => isoDate(addDays(new Date(), status.minDeadlineDays)), [status.minDeadlineDays]);
  const maxDate = useMemo(() => isoDate(addDays(new Date(), status.maxDeadlineDays)), [status.maxDeadlineDays]);
  const [deadline, setDeadline] = useState(isoDate(addDays(new Date(), 21)));
  const [quote, setQuote] = useState<FundedQuote | null>(null);
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);

  const cur = status.currencies.find((c) => c.currency === currency) ?? status.currencies[0];
  const decimals = cur?.decimals ?? 6;
  const minor = toMinor(amount, decimals);
  const overCap = minor !== null && cur ? BigInt(minor) > BigInt(cur.maxMinor) : false;
  const test = status.network !== 'solana-mainnet';
  const label = `${test ? 'test ' : ''}${currency}`;

  useEffect(() => {
    let live = true;
    getMyProjects()
      .then((ps) => live && setProjects(ps.map((p) => ({ full: p.github_full_name, verified: Boolean((p as { verified_at?: string | null }).verified_at) }))))
      .catch(() => live && setProjects([]));
    return () => {
      live = false;
    };
  }, []);

  // The live numbers. Quoted by the agent rather than computed here, so the
  // screen says what the chain will charge and not an approximation of it.
  useEffect(() => {
    if (!minor || overCap) {
      setQuote(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      getFundedQuote(minor).then((q) => live && setQuote(q)).catch(() => live && setQuote(null));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [minor, overCap]);

  const deadlineIso = new Date(`${deadline}T23:59:00Z`).toISOString();
  const ready = Boolean(repo && Number(issue) > 0 && minor && !overCap && mode && quote && w.address && deadline >= minDate && deadline <= maxDate);

  const lock = async () => {
    if (!ready || !mode || !minor || !w.address) return;
    setError(null);
    try {
      setBusy('Preparing the escrow…');
      const p = await prepareFundedBounty({
        repo, issueNumber: Number(issue), amountMinor: minor, currency, mode, deadline: deadlineIso, funderWallet: w.address,
      });
      setBusy('Approve the transaction in your wallet…');
      const sig = await w.send(p.transaction, p.network, w.address);
      setBusy('Waiting for the chain to show the funds locked…');
      await untilConfirmed(() => confirmFundedBounty(p.bountyId, sig));
      onFunded(p.bountyId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const card = `rounded-[20px] border p-5 ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;
  const input = `w-full min-h-[44px] px-3 rounded-[10px] border text-[14px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`;
  const lbl = `block text-[12px] font-semibold mb-1 ${muted}`;
  const btn = 'inline-flex items-center justify-center min-h-[44px] px-5 rounded-[12px] text-[13.5px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const primary = `${btn} bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white border-white/10`;
  const secondary = `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;
  const choice = (on: boolean) =>
    `flex-1 min-w-0 text-left rounded-[14px] border p-4 transition-colors ${
      on
        ? 'border-[#c9983a] bg-[#c9983a]/15'
        : isDark ? 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]' : 'border-black/10 bg-white/[0.25] hover:bg-white/[0.4]'
    }`;
  const panel = `rounded-[14px] border p-4 text-[13px] ${isDark ? 'border-[#c9983a]/35 bg-[#c9983a]/10 text-[#e8dccb]' : 'border-[#a67c2e]/30 bg-[#c9983a]/10 text-[#4a3b28]'}`;
  const verified = (projects ?? []).filter((p) => p.verified);

  return (
    <section className={card} aria-labelledby="fund-title">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 id="fund-title" className={`text-[17px] font-bold ${strong}`}>Fund this bounty</h2>
        <button type="button" className={`text-[12.5px] underline underline-offset-2 ${muted}`} onClick={onClose}>Close</button>
      </div>
      <p className={`text-[13px] mb-4 ${muted}`}>
        Put your own money behind an issue. It is locked in an on-chain escrow before the bounty appears, so nobody can apply for a bounty
        that is not funded.{test && <> <b className={strong}>This is {status.network}: test tokens with no value.</b></>}
      </p>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div className="min-w-0">
          <label className={lbl} htmlFor="fund-repo">Repository</label>
          <select id="fund-repo" className={input} value={repo} onChange={(e) => setRepo(e.target.value)}>
            <option value="">{projects === null ? 'Loading your projects…' : verified.length ? 'Choose a verified project' : 'No verified projects yet'}</option>
            {verified.map((p) => <option key={p.full} value={p.full}>{p.full}</option>)}
          </select>
          {projects !== null && verified.length === 0 && (
            <p className={`text-[12px] mt-1 ${muted}`}>Funded bounties are for projects registered and verified on Grainlify, with the GitHub App installed.</p>
          )}
        </div>
        <div>
          <label className={lbl} htmlFor="fund-issue">Issue number</label>
          <input id="fund-issue" className={input} inputMode="numeric" placeholder="41" value={issue} onChange={(e) => setIssue(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px] mt-4">
        <div className="min-w-0">
          <label className={lbl} htmlFor="fund-amount">Amount the contributor receives</label>
          <input id="fund-amount" className={`${input} tabular-nums`} inputMode="decimal" placeholder="50" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {overCap && cur && <p role="alert" className="text-[12px] mt-1 text-[#c0573f]">Funded bounties are capped at {fromMinor(cur.maxMinor, decimals)} {label} for now.</p>}
        </div>
        <div>
          <label className={lbl} htmlFor="fund-currency">Currency</label>
          <select id="fund-currency" className={input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {status.currencies.map((c) => <option key={c.currency} value={c.currency}>{c.currency}</option>)}
          </select>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className={lbl}>How the contributor is chosen</legend>
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" aria-pressed={mode === 'draw'} className={choice(mode === 'draw')} onClick={() => setMode('draw')}>
            <span className={`block text-[14px] font-bold ${strong}`}>Weighted draw</span>
            <span className={`block text-[12.5px] mt-1 ${muted}`}>You run the draw when you are ready, from everyone who applied. Favours fit with the issue and first-time applicants.</span>
          </button>
          <button type="button" aria-pressed={mode === 'self_assign'} className={choice(mode === 'self_assign')} onClick={() => setMode('self_assign')}>
            <span className={`block text-[14px] font-bold ${strong}`}>I'll assign it myself</span>
            <span className={`block text-[12.5px] mt-1 ${muted}`}>You pick the contributor. No draw, no window — the issue is yours to hand out.</span>
          </button>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <div>
          <label className={lbl} htmlFor="fund-deadline">Deadline to deliver</label>
          <input id="fund-deadline" type="date" className={input} min={minDate} max={maxDate} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="min-w-0">
          <span className={lbl}>Your wallet</span>
          {w.address ? (
            <p className={`min-h-[44px] flex items-center text-[13.5px] font-mono ${strong}`}>{short(w.address)}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {w.wallets.length === 0 && <p className={`text-[12.5px] ${muted}`}>No Solana wallet that can send transactions was found in this browser.</p>}
              {w.wallets.map((x) => (
                <button key={x.name} type="button" className={secondary} onClick={() => void w.connect(x)}>
                  <img src={x.icon} alt="" className="w-4 h-4 mr-2" />
                  {x.name}
                </button>
              ))}
            </div>
          )}
          {w.error && <p role="alert" className="text-[12px] mt-1 text-[#c0573f]">{w.error}</p>}
        </div>
      </div>

      <dl className={`grid grid-cols-3 gap-3 mt-5 rounded-[14px] border p-4 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-white/[0.3]'}`}>
        <div>
          <dt className={`text-[11.5px] ${muted}`}>The contributor receives</dt>
          <dd className={`text-[16px] font-extrabold tabular-nums ${strong}`}>{quote ? `${fromMinor(quote.amountMinor, decimals)} ${label}` : '—'}</dd>
        </div>
        <div>
          <dt className={`text-[11.5px] ${muted}`}>Platform fee</dt>
          <dd className={`text-[16px] font-extrabold tabular-nums ${strong}`}>{quote ? `${fromMinor(quote.feeAmountMinor, decimals)} ${label}` : '—'}</dd>
          {quote?.flooredByMinimum && (
            <p className={`text-[11.5px] mt-0.5 ${muted}`}>The 25¢ minimum applies: {Math.round(quote.effectiveRate * 100)}% of this bounty.</p>
          )}
        </div>
        <div>
          <dt className={`text-[11.5px] ${muted}`}>You pay</dt>
          <dd className={`text-[16px] font-extrabold tabular-nums ${strong}`}>{quote ? `${fromMinor(quote.totalMinor, decimals)} ${label}` : '—'}</dd>
        </div>
      </dl>
      <p className={`text-[11.5px] mt-1 ${muted}`}>2.5% with a 25¢ minimum, charged on top, so the contributor receives exactly the amount the bounty shows.</p>

      {mode && (
        <div className={`${panel} mt-4`} role="note">
          <p className="font-bold mb-1">Before you sign</p>
          {mode === 'draw' ? (
            <p>In draw mode, Grainlify picks who gets assigned. You can refund yourself after the deadline without us. Choose self-assign if you'd rather keep that control.</p>
          ) : (
            <p>You assign it, and only you can: the escrow refuses an assignment from anybody else, Grainlify included. You can also unassign on-chain without us. Contributors are told that plainly before they apply.</p>
          )}
          <p className="mt-2">
            Funding is the release: after you sign, Grainlify can pay the assigned contributor when the work is merged, without asking you again.
            That is what lets someone be paid if you go quiet — and it is the part to be sure about now.
          </p>
        </div>
      )}

      {quote && (
        <p className={`text-[12.5px] mt-3 ${muted}`}>
          ↩ You can take the full {fromMinor(quote.totalMinor, decimals)} {label} back yourself, with no Grainlify involvement, from{' '}
          <b className={strong}>{humanDate(deadlineIso)}</b> — if nothing has been delivered. Before anyone is assigned you can cancel at any time.
        </p>
      )}

      {error && <p role="alert" className="text-[13px] mt-3 text-[#c0573f]">{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
        <button type="button" className={primary} disabled={!ready || busy !== null} onClick={() => void lock()}>
          {busy ?? 'Lock the funds'}
        </button>
        <button type="button" className={secondary} onClick={onClose} disabled={busy !== null}>Cancel</button>
        <p className={`text-[12px] ${muted}`}>You'll sign one transaction. Nothing is charged until it confirms.</p>
      </div>
    </section>
  );
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
