import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Wallet } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getBountyWalletLink } from '../../../shared/api/client';

/** Shortened for display only. Both ends are kept because the middle is what
 *  varies least: a wallet is recognised by its first and last characters. */
export function shortAddress(a: string): string {
  return a.length <= 12 ? a : `${a.slice(0, 4)}…${a.slice(-4)}`;
}

/**
 * Whether a wallet is linked, and which one.
 *
 * This exists because the page previously could not answer that question: the
 * agent could store a link and not read one back, so somebody who had linked a
 * wallet was still shown "Link your wallet" and reasonably concluded it had not
 * worked. Three states, and they are deliberately distinct — linked, not
 * linked, and could-not-tell. Showing "not linked" when the answer is unknown
 * is the bug we are fixing, so an error says so rather than guessing.
 */
export function ConnectedWallet() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<{ linked: boolean; wallet: string | null } | null>(null);
  /** Which call failed and how, so the screen itself says the cause. */
  const [failed, setFailed] = useState<{ step: 'challenge' | 'agent'; detail: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Wait for the session before asking. apiRequest sends a requiresAuth call
    // with NO Authorization header when the token is not there yet, and the
    // 401 handler then calls removeAuthToken() -- so firing this on mount does
    // not merely fail, it can sign the person out. That is what made this card
    // say "could not check" on a page where the wallet was linked and the user
    // was signed in.
    if (authLoading || !isAuthenticated) return;
    let live = true;
    (async () => {
      // One call. Grainlify asks the agent on our behalf, so there is no
      // browser-to-agent request for an extension to sit in the middle of.
      try {
        const r = await getBountyWalletLink();
        if (live) setState({ linked: r.linked, wallet: r.wallet });
      } catch (e) {
        const status = (e as { status?: number })?.status;
        console.error('[wallet] link lookup failed:', status ?? e, e);
        if (live) setFailed({ step: 'challenge', detail: status ? `HTTP ${status}` : 'network' });
      }
    })();
    return () => {
      live = false;
    };
  }, [authLoading, isAuthenticated]);

  const card = `rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-4 sm:p-5 ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  // The "No wallet linked" layout, because that is what a new visitor gets,
  // held invisible under the pulse. The words are neutral ones of the same
  // length rather than the real ones: "No wallet linked" must never be in the
  // page before the answer is known, even hidden. The old placeholder was one 40px row, and the
  // real panel stacks text over a 44px button on a phone: 58px of jump for
  // everything below it. A linked wallet is taller again (icon, text and two
  // buttons stacked) and still moves, by less than it did.
  const placeholder = (
    <div className={card} aria-busy="true" aria-label="Checking whether a wallet is linked">
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3" aria-hidden="true">
        <div className="flex-1 invisible">
          <p className="text-[15px] font-bold">Checking wallet…</p>
          <p className="text-[13px]">Looking for a wallet linked to this GitHub account</p>
        </div>
        <div className={`animate-pulse min-h-[44px] w-full sm:w-[168px] rounded-[12px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        <div className="absolute left-0 top-0 animate-pulse flex flex-col gap-2 pt-1 w-2/3">
          <div className={`h-4 w-40 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <div className={`h-3 w-full rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        </div>
      </div>
    </div>
  );

  if (authLoading) return placeholder;
  if (failed) {
    const where = 'Grainlify';
    return (
      <div className={card}>
        <p className={`text-[13.5px] ${muted}`}>
          Could not check whether a wallet is linked — <span className="font-mono">{where}: {failed.detail}</span>. That does not
          mean one is not linked. Reload, or{' '}
          <Link to="/bounties/link" className={isDark ? 'text-[#e8c571] underline underline-offset-2' : 'text-[#5c4214] underline underline-offset-2'}>open the wallet page</Link>.
        </p>
      </div>
    );
  }
  if (state === null) return placeholder;
  if (!state.linked || !state.wallet) {
    return (
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className={`text-[15px] font-bold ${strong}`}>No wallet linked</p>
            <p className={`text-[13px] ${muted}`}>You need one to be paid. A phone wallet is enough.</p>
          </div>
          <Link
            to="/bounties/link"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13.5px] shadow-[0_4px_14px_rgba(162,121,44,0.35)] border border-white/10"
          >
            <Wallet className="w-4 h-4" />
            Link your wallet
          </Link>
        </div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.wallet!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // A clipboard the browser refuses is not worth an error state: the full
      // address is in the title attribute, so it can still be read and copied.
    }
  };

  return (
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${isDark ? 'bg-[#c9983a]/20' : 'bg-[#c9983a]/15'}`}>
          <Wallet className="w-5 h-5 text-[#c9983a]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-bold ${strong}`}>Wallet linked</p>
          <p className={`text-[13px] font-mono ${muted}`} title={state.wallet}>
            {shortAddress(state.wallet)} · Solana
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Address copied' : 'Copy wallet address'}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-[12px] border text-[13px] font-medium transition-colors ${
              isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]' : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <Link
            to="/bounties/link"
            className={`inline-flex items-center min-h-[44px] px-4 rounded-[12px] border text-[13px] font-medium transition-colors ${
              isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]' : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]'
            }`}
          >
            Change
          </Link>
        </div>
      </div>
    </div>
  );
}
