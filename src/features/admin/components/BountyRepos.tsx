import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, FlaskConical } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  getBountyRepos,
  setBountyRepo,
  type AgentRepoState,
  type BountyRepoProject,
} from '../../../shared/api/client';

/**
 * Which repositories may have bounties.
 *
 * This used to be an environment variable on the payout signer. It is
 * operational — it changes as projects join — and a deployment variable is the
 * wrong place for something that changes, both because editing one is friction
 * and because nobody can see who last did.
 *
 * Two conditions are shown separately because they have different owners. A
 * project is *registered* when Grainlify has verified it and our GitHub App is
 * installed; that is not something an admin can grant from this screen. On top
 * of that, an admin switches bounties on. Showing both is what makes the
 * interesting case legible: a project that has lost its verification while its
 * bounties are still switched on.
 */
export function BountyRepos() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [projects, setProjects] = useState<BountyRepoProject[] | null>(null);
  const [agent, setAgent] = useState<AgentRepoState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError(null);
    try {
      const r = await getBountyRepos();
      setProjects(r?.projects ?? []);
      setAgent(r?.agent ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const toggle = async (fullName: string, enabled: boolean) => {
    setSaving(fullName);
    setError(null);
    try {
      const r = await setBountyRepo(fullName, enabled);
      setAgent(r?.repos ?? agent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const box = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const btn = 'inline-flex items-center justify-center min-h-[40px] px-4 rounded-[10px] text-[13px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

  const stateFor = (fullName: string) => agent?.find((a) => a.fullName.toLowerCase() === fullName.toLowerCase());
  // Repos the agent knows about that are not Grainlify projects. The sandbox
  // lives here, and so would anything switched on before it was verified.
  const extras = (agent ?? []).filter((a) => !(projects ?? []).some((p) => p.full_name.toLowerCase() === a.fullName.toLowerCase()));

  if (loading) {
    return (
      <div className={box} aria-busy="true">
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-5 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} style={{ width: `${80 - i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const row = (fullName: string, registered: boolean, s: AgentRepoState | undefined) => {
    const on = s?.bountiesEnabled === true;
    const carveOut = s?.testCarveOut === true;
    const eligible = registered || carveOut;
    return (
      <div key={fullName} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b last:border-b-0 border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <p className={`text-[13.5px] font-medium ${strong}`}>{fullName}</p>
          <div className={`flex items-center gap-2 flex-wrap text-[12px] ${muted}`}>
            {carveOut ? (
              <span className="inline-flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> test carve-out
              </span>
            ) : registered ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> verified project, App installed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> not a verified project with the App installed
              </span>
            )}
            {s?.allowlisted === false && <span>· not allowlisted with the agent</span>}
            {s?.lastChangedBy && (
              <span>
                · last changed by {s.lastChangedBy}
                {s.lastChangedAt ? ` on ${new Date(s.lastChangedAt).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
          {/* The case worth noticing: switched on, but no longer eligible. */}
          {on && !eligible && (
            <p className={`text-[12px] font-medium ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>
              Bounties are on, but this repository is not eligible — the payout gate will refuse.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`${on ? 'Disable' : 'Enable'} bounties for ${fullName}`}
          disabled={saving === fullName || (!eligible && !on)}
          onClick={() => toggle(fullName, !on)}
          className={
            on
              ? `${btn} bg-[var(--brand-success)]/25 border-[var(--brand-success)]/40 ${isDark ? 'text-[var(--brand-success-text)]' : 'text-[var(--brand-success-text-deep)]'}`
              : `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`
          }
        >
          {saving === fullName ? 'Saving…' : on ? 'Bounties on' : 'Bounties off'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>
          {error}
        </p>
      )}
      {agent === null && !error && (
        <p className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>
          The bounty agent could not be reached, so what is currently switched on is unknown. The list below is projects only.
        </p>
      )}

      <div className={box}>
        <p className={`text-[12.5px] mb-2 ${muted}`}>
          A repository needs both: Grainlify has verified the project and our GitHub App is installed, and an admin has switched bounties on.
          Turning one off is enough to stop new bounties and to make the payout gate refuse existing ones.
        </p>
        {(projects ?? []).length === 0 ? (
          <p className={`text-[13px] ${muted}`}>No projects yet.</p>
        ) : (
          (projects ?? []).map((p) => row(p.full_name, p.registered_project, stateFor(p.full_name)))
        )}
      </div>

      {extras.length > 0 && (
        <div className={box}>
          <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${muted}`}>Known to the agent, not a Grainlify project</p>
          {extras.map((a) => row(a.fullName, a.registeredProject, a))}
        </div>
      )}

      <p className={`text-[12px] ${muted}`}>
        The payout signer keeps its own short list of repositories as a coarse backstop. It is edited rarely and by hand, deliberately: the
        signer does not trust this screen or the database behind it.
      </p>
    </div>
  );
}
