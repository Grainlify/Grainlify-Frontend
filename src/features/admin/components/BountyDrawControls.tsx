import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  getBountyDrawState,
  getDrawSettings,
  resetDrawSetting,
  runBountyDraw,
  setDrawSetting,
  type BountyDrawState,
  type DrawResultView,
  type DrawSetting,
} from '../../../shared/api/client';
import { getBounties, formatBountyAmount, type PublicBounty } from '../../../shared/api/bountyAgent';

/**
 * The draw, from the admin side: the settings that govern it, a manual trigger
 * per bounty, and what the last run actually did.
 *
 * Two things here are deliberate rather than incidental.
 *
 * The settings are editable because a window length or a weight is exactly
 * what needs changing during a live programme, and the person who needs to
 * change it is not the person who can deploy. Each row shows the coded default
 * beside the live value, so an override is visible as an override.
 *
 * The ticket breakdown is shown AFTER a draw rather than only stored. A draw
 * whose result cannot be explained on the spot is a draw people assume is
 * rigged, and the seed and shares are the whole explanation.
 */
export function BountyDrawControls() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [settings, setSettings] = useState<DrawSetting[]>([]);
  const [bounties, setBounties] = useState<PublicBounty[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [state, setState] = useState<BountyDrawState | null>(null);
  const [result, setResult] = useState<DrawResultView | null>(null);
  const [confirming, setConfirming] = useState<null | { simulate: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getDrawSettings().then((r) => setSettings(r.settings)).catch((e) => setError(String(e instanceof Error ? e.message : e)));
    getBounties().then((r) => setBounties(r.bounties)).catch(() => setBounties([]));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setState(null);
    setResult(null);
    getBountyDrawState(selected).then(setState).catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, [selected]);

  const sections = useMemo(() => {
    const by = new Map<string, DrawSetting[]>();
    for (const s of settings) by.set(s.section, [...(by.get(s.section) ?? []), s]);
    return [...by.entries()];
  }, [settings]);

  const save = async (key: string, value: string) => {
    setSaving(key);
    setError(null);
    try {
      setSettings((await setDrawSetting(key, value)).settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };
  const reset = async (key: string) => {
    setSaving(key);
    try {
      setSettings((await resetDrawSetting(key)).settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const doRun = async (simulate: boolean) => {
    setBusy(true);
    setError(null);
    setConfirming(null);
    try {
      const r = await runBountyDraw(selected, simulate);
      setResult(r);
      setState(await getBountyDrawState(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const box = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const input = `min-h-[40px] px-3 rounded-[10px] border text-[13px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`;
  const btn = 'inline-flex items-center justify-center min-h-[40px] px-4 rounded-[10px] text-[13px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const primary = `${btn} bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white border-white/10`;
  const secondary = `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;

  const selectedBounty = bounties.find((b) => b.id === selected);

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>
          {error}
        </p>
      )}

      <div className={box}>
        <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>Run a draw</h3>
        <p className={`text-[12.5px] mb-3 ${muted}`}>
          Draws run automatically when a window closes. This runs one now, for a bounty you choose. Simulating uses the real pool and the
          real weights but assigns nobody — the way to check a weight change before it decides anything.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select aria-label="Bounty" className={`${input} flex-1`} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Choose a bounty…</option>
            {bounties.map((b) => (
              <option key={b.id} value={b.id}>
                {b.isTest ? '[TEST] ' : ''}
                {b.repo} #{b.issueNumber} — {formatBountyAmount(b)} — {b.assignedTo ? `held by ${b.assignedTo}` : b.applicationState}
              </option>
            ))}
          </select>
          <button type="button" className={secondary} disabled={!selected || busy} onClick={() => setConfirming({ simulate: true })}>
            Simulate
          </button>
          <button type="button" className={primary} disabled={!selected || busy} onClick={() => setConfirming({ simulate: false })}>
            Run draw now
          </button>
        </div>

        {confirming && (
          <div className={`mt-3 p-3 rounded-[12px] border ${isDark ? 'border-[#c9983a]/40 bg-[#c9983a]/10' : 'border-[#c9983a]/40 bg-[#c9983a]/10'}`} role="alertdialog" aria-label="Confirm draw">
            <p className={`text-[13px] mb-3 ${strong}`}>
              {confirming.simulate
                ? `Simulate the draw for ${selectedBounty?.repo} #${selectedBounty?.issueNumber}? Nobody will be assigned.`
                : `Run the draw for ${selectedBounty?.repo} #${selectedBounty?.issueNumber} now? One applicant will be assigned, and this cannot be undone from here — the assignment has to be released instead.`}
            </p>
            <div className="flex gap-2">
              <button type="button" className={primary} disabled={busy} onClick={() => doRun(confirming.simulate)}>
                {busy ? 'Running…' : confirming.simulate ? 'Yes, simulate' : 'Yes, run the draw'}
              </button>
              <button type="button" className={secondary} onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {state && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>Applications</h3>
          <p className={`text-[12.5px] mb-3 ${muted}`}>
            {state.applications.total} applied · {state.applications.eligible} in the pool · {state.applications.refused} refused. Counts are
            admin-only; the public page never shows them while a window is open.
          </p>
          {state.applications.applications.length === 0 ? (
            <p className={`text-[13px] ${muted}`}>Nobody has applied yet.</p>
          ) : (
            <ul className="space-y-1">
              {state.applications.applications.map((a) => (
                <li key={a.githubUserId} className={`text-[13px] ${strong}`}>
                  <span className="font-medium">{a.githubLogin}</span>
                  <span className={muted}>
                    {' — '}
                    {a.status}
                    {a.gateFailureReason ? ` (${a.gateFailureReason})` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && (
        <div className={box}>
          <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>
            {result.simulation ? 'Simulated draw' : 'Draw result'}
          </h3>
          <p className={`text-[12.5px] mb-3 ${muted}`}>
            Seed {result.seed} · pool of {result.poolSize} · triggered by {result.triggeredBy}
            {result.firstComeFallback ? ' · every candidate had zero tickets, so it fell back to first-come' : ''}
            {result.noWinnerReason ? ` · ${result.noWinnerReason}` : ''}
          </p>
          {result.winner && (
            <p className={`text-[14px] font-semibold mb-3 ${strong}`}>
              Winner: {result.winner.githubLogin}
              {result.staleAt && <span className={`font-normal ${muted}`}> — pull request due by {new Date(result.staleAt).toLocaleString()}</span>}
            </p>
          )}
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className={muted}>
                <th className="text-left font-semibold py-1">Applicant</th>
                <th className="text-left font-semibold py-1">Fit</th>
                <th className="text-right font-semibold py-1">Tickets</th>
                <th className="text-right font-semibold py-1">Share</th>
                <th className="text-left font-semibold py-1 pl-3">Weights</th>
              </tr>
            </thead>
            <tbody>
              {result.pool.map((c) => (
                <tr key={c.githubUserId} className={strong}>
                  <td className="py-1">{c.githubLogin}</td>
                  <td className="py-1">{c.fit}</td>
                  <td className="py-1 text-right tabular-nums">{c.tickets.toFixed(3)}</td>
                  <td className="py-1 text-right tabular-nums">{(c.share * 100).toFixed(1)}%</td>
                  <td className={`py-1 pl-3 ${muted}`}>
                    {Object.entries(c.weights).map(([k, v]) => `${k} ×${v}`).join(', ') || 'base only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={box}>
        <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>Settings</h3>
        <p className={`text-[12.5px] mb-4 ${muted}`}>
          These take effect immediately, without a deploy. A value left alone uses the default written in the code, so clearing an override
          is always a safe way back.
        </p>
        {sections.map(([section, rows]) => (
          <div key={section} className="mb-5">
            <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${muted}`}>{section}</p>
            <div className="space-y-3">
              {rows.map((s) => (
                <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`setting-${s.key}`} className={`text-[13px] font-medium ${strong}`}>
                      {s.key}
                    </label>
                    <p className={`text-[12px] ${muted}`}>{s.description}</p>
                    {s.overridden && (
                      <p className={`text-[11.5px] ${muted}`}>
                        Overridden (default {s.default}){s.updatedBy ? ` by ${s.updatedBy}` : ''}
                      </p>
                    )}
                  </div>
                  {s.type === 'bool' ? (
                    <select
                      id={`setting-${s.key}`}
                      className={`${input} w-full sm:w-36`}
                      value={s.value}
                      disabled={saving === s.key}
                      onChange={(e) => save(s.key, e.target.value)}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      id={`setting-${s.key}`}
                      className={`${input} w-full sm:w-36`}
                      defaultValue={s.value}
                      disabled={saving === s.key}
                      onBlur={(e) => e.target.value !== s.value && save(s.key, e.target.value)}
                    />
                  )}
                  <button type="button" className={secondary} disabled={!s.overridden || saving === s.key} onClick={() => reset(s.key)}>
                    Reset
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
