import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, FlaskConical, Search } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  ApiError,
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
/** A refusal code is not a sentence.
 *
 *  This screen printed whatever the API put in `error` straight onto the page,
 *  so an admin looking for their projects was shown the word "lookup_failed"
 *  and nothing else - no indication of what had failed, whether it was their
 *  doing, or what to try. The code stays in the network tab where it is useful;
 *  the page gets words.
 */
function plainly(e: unknown): string {
  const code = e instanceof ApiError ? String(e.data?.error ?? e.message) : e instanceof Error ? e.message : String(e);
  switch (code) {
    case 'lookup_failed':
      return 'Could not read the list of projects. This is a fault on our side, not something you did — the list below may be incomplete or empty until it is fixed.';
    case 'agent_unreachable':
      return 'The bounty agent did not answer, so what is currently switched on is unknown. Nothing has been changed.';
    case 'agent_refused':
      return 'The bounty agent refused the request. Nothing has been changed.';
    case 'bounty_draw_unconfigured':
      return 'This deployment has no signing key for the bounty agent, so admin actions cannot be sent to it.';
    case 'not_a_registered_project':
      return 'That repository is not a verified Grainlify project with our GitHub App installed, so bounties cannot be switched on for it.';
    case 'forbidden':
    case 'unauthorized':
      return 'You are not signed in as an admin.';
    default:
      return `Something went wrong (${code}).`;
  }
}

/** A repository this screen can offer, whether or not the agent knows it yet. */
interface Candidate {
  fullName: string;
  registered: boolean;
  state: AgentRepoState | undefined;
}

/** Enough matches to choose from, few enough to read without scrolling. */
const MAX_MATCHES = 8;

export function BountyRepos() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [projects, setProjects] = useState<BountyRepoProject[] | null>(null);
  const [agent, setAgent] = useState<AgentRepoState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setError(null);
    try {
      const r = await getBountyRepos();
      setProjects(r?.projects ?? []);
      setAgent(r?.agent ?? null);
    } catch (e) {
      setError(plainly(e));
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
      setError(plainly(e));
    } finally {
      setSaving(null);
    }
  };

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const box = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const btn = 'inline-flex items-center justify-center min-h-[40px] px-4 rounded-[10px] text-[13px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

  const stateFor = (fullName: string) => agent?.find((a) => a.fullName.toLowerCase() === fullName.toLowerCase());

  // Every repository this screen can talk about: Grainlify's projects, plus
  // anything the agent already knows that is not one (the sandbox lives here,
  // and so would anything switched on before it was verified).
  const candidates: Candidate[] = [
    ...(projects ?? []).map((p) => ({ fullName: p.full_name, registered: p.registered_project, state: stateFor(p.full_name) })),
    ...(agent ?? [])
      .filter((a) => !(projects ?? []).some((p) => p.full_name.toLowerCase() === a.fullName.toLowerCase()))
      .map((a) => ({ fullName: a.fullName, registered: a.registeredProject, state: a })),
  ];

  // What is switched on is the list worth always showing; everything else is
  // found by searching. There are hundreds of the latter.
  const on = candidates
    .filter((c) => c.state?.bountiesEnabled === true)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const needle = query.trim().toLowerCase();
  const allMatches = needle
    ? candidates
        .filter((c) => c.state?.bountiesEnabled !== true && c.fullName.toLowerCase().includes(needle))
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
    : [];
  const matches = allMatches.slice(0, MAX_MATCHES);
  const hiddenMatchCount = allMatches.length - matches.length;

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
        {/* Add and Remove, not a state label you have to interpret.
            "Bounties off" read as a status, so the button that would turn them
            ON was labelled with the thing it was not. */}
        <button
          type="button"
          aria-label={`${on ? 'Remove' : 'Add'} bounties for ${fullName}`}
          disabled={saving === fullName || (!eligible && !on)}
          onClick={() => toggle(fullName, !on)}
          className={
            on
              ? `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`
              : `${btn} bg-[var(--brand-success)]/25 border-[var(--brand-success)]/40 ${isDark ? 'text-[var(--brand-success-text)]' : 'text-[var(--brand-success-text-deep)]'}`
          }
        >
          {saving === fullName ? 'Saving…' : on ? 'Remove' : 'Add'}
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
        <p className={`text-[12.5px] mb-3 ${muted}`}>
          A repository needs both: Grainlify has verified the project and our GitHub App is installed, and an admin has switched bounties on.
          Turning one off is enough to stop new bounties and to make the payout gate refuse existing ones.
        </p>

        <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${muted}`}>
          Bounties on ({on.length})
        </p>
        {on.length === 0 ? (
          <p className={`text-[13px] ${muted}`}>
            No repository has bounties switched on. Search below to add one.
          </p>
        ) : (
          on.map((r) => row(r.fullName, r.registered, r.state))
        )}
      </div>

      <div className={box}>
        <label htmlFor="bounty-repo-search" className={`block text-[11px] font-bold uppercase tracking-wide mb-2 ${muted}`}>
          Add a repository
        </label>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${muted}`} />
          <input
            id="bounty-repo-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by owner or repository name"
            autoComplete="off"
            className={`w-full min-h-[40px] pl-9 pr-3 rounded-[10px] border text-[13.5px] outline-none transition-colors ${
              isDark
                ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5] placeholder:text-[#8a7e70] focus:border-white/30'
                : 'bg-white/[0.35] border-black/15 text-[#2d2820] placeholder:text-[#9a8b7a] focus:border-black/30'
            }`}
          />
        </div>

        {/* Nothing is listed until something is typed. There are hundreds of
            projects; rendering them all was a wall an admin had to scroll
            rather than a list they could use. */}
        {query.trim() === '' ? (
          <p className={`text-[12.5px] mt-3 ${muted}`}>
            {candidates.length} repositories are eligible. Type to find one.
          </p>
        ) : matches.length === 0 ? (
          <p className={`text-[12.5px] mt-3 ${muted}`}>
            Nothing matches “{query.trim()}”. A repository appears here once Grainlify has verified the project and our GitHub App is
            installed on it.
          </p>
        ) : (
          <div className="mt-2">
            {matches.map((r) => row(r.fullName, r.registered, r.state))}
            {hiddenMatchCount > 0 && (
              <p className={`text-[12px] pt-3 ${muted}`}>
                {hiddenMatchCount} more match “{query.trim()}”. Narrow the search to see them.
              </p>
            )}
          </div>
        )}
      </div>

      <p className={`text-[12px] ${muted}`}>
        The payout signer keeps its own short list of repositories as a coarse backstop. It is edited rarely and by hand, deliberately: the
        signer does not trust this screen or the database behind it.
      </p>
    </div>
  );
}
