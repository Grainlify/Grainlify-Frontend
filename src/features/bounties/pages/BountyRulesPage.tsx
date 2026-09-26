import { useEffect, useState } from 'react';
import { ScrollText, ShieldCheck, EyeOff } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { getBountyRules, type BountyRules } from '../../../shared/api/bountyAgent';

/**
 * Every rule the draw runs on, with its live value.
 *
 * AI-specs.md §4.5, applied to bounties: "Publish the weights on the platform
 * before the event. A contributor who reads them and responds by writing
 * better code is not farming - that is the platform working."
 *
 * The page shows the coded default beside every live value, so an override is
 * visible as an override rather than looking like it was always that way, and
 * names whoever changed it. Odds nobody can check are indistinguishable from
 * odds that are made up.
 */
export function BountyRulesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [rules, setRules] = useState<BountyRules | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoadError(null);
    getBountyRules()
      .then((r) => mounted && setRules(r))
      .catch((e) => mounted && setLoadError(e));
    return () => {
      mounted = false;
    };
  }, [attempt]);

  const card = `rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  if (loadError) return <LoadFailed what="the bounty rules" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!rules) {
    return (
      <div className={`${card} p-6`}>
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-4 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} style={{ width: `${70 - i * 15}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const bySection = new Map<string, typeof rules.settings>();
  for (const s of rules.settings) bySection.set(s.section, [...(bySection.get(s.section) ?? []), s]);

  return (
    <div className="space-y-6">
      <div className={`${card} p-6`}>
        <div className="flex items-center gap-2 mb-2">
          <ScrollText className="w-5 h-5 text-[#c9983a]" />
          <h1 className={`text-[22px] font-bold ${strong}`}>How bounties are assigned</h1>
        </div>
        <p className={`text-[13.5px] leading-[1.55] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>
          Bounties are assigned by a weighted draw before any code is written. You apply during a window; when it closes one applicant is
          drawn and assigned, and only then does anyone write the patch. Everything the draw uses is on this page, with its live value.
          Reading these and responding by writing better code is the point, not a loophole.
        </p>

        <div className={`mt-4 rounded-[14px] border p-4 ${isDark ? 'border-[#c9983a]/40 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/40 bg-[#c9983a]/[0.06]'}`}>
          <p className={`flex items-center gap-2 text-[13px] font-bold mb-1 ${strong}`}>
            <ShieldCheck className="w-4 h-4 text-[#c9983a]" />
            Prior wins are capped at {rules.structural.priorCompletionCap}
          </p>
          <p className={`text-[13px] leading-[1.5] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>{rules.structural.priorCompletionCapNote}</p>
        </div>

        <div className={`mt-3 rounded-[14px] border p-4 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-white/[0.25]'}`}>
          <p className={`flex items-center gap-2 text-[13px] font-bold mb-1 ${strong}`}>
            <EyeOff className="w-4 h-4" />
            What the draw cannot see
          </p>
          <ul className={`text-[13px] leading-[1.6] list-disc pl-5 ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>
            {rules.structural.neverWeighted.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`mt-2 text-[12.5px] ${muted}`}>{rules.structural.neverWeightedNote}</p>
        </div>
      </div>

      {[...bySection.entries()].map(([section, rows]) => (
        <div key={section} className={`${card} p-5 sm:p-6`}>
          <h2 className={`text-[15px] font-bold mb-3 ${strong}`}>{section}</h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className={muted}>
                <th className="text-left font-semibold py-1">Rule</th>
                <th className="text-right font-semibold py-1 w-24">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.key} className="align-top">
                  <td className="py-2 pr-3">
                    <p className={`font-medium ${strong}`}>{s.key}</p>
                    <p className={`text-[12.5px] ${muted}`}>{s.description}</p>
                    {s.overridden && (
                      <p className={`text-[11.5px] ${muted}`}>
                        Changed from the default of {s.default}
                        {s.updatedBy ? ` by ${s.updatedBy}` : ''}
                        {s.updatedAt ? ` on ${new Date(s.updatedAt).toLocaleDateString()}` : ''}
                      </p>
                    )}
                  </td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${strong}`}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className={`text-[12.5px] ${muted}`}>
        These values are live: this page reads them from the service that runs the draw, not from a copy. Every draw also stores the seed
        and the full ticket breakdown it used, so a result can be recomputed rather than argued about.
      </p>
    </div>
  );
}
