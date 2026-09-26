import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Wallet } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { createBountyWalletReadChallenge } from '../../../shared/api/client';
import { readWalletLink, type WalletLinkState } from '../../../shared/api/bountyAgent';

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
  const [state, setState] = useState<WalletLinkState | null>(null);
  const [failed, setFailed] = useState(false);
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
      try {
        const challenge = await createBountyWalletReadChallenge();
        const r = await readWalletLink({ message: challenge.message, countersignature: challenge.countersignature });
        if (live) setState(r);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [authLoading, isAuthenticated]);

  const card = `rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-4 sm:p-5 ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  if (authLoading) {
    return (
      <div className={card}>
        <div className="animate-pulse flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[12px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <div className={`h-4 w-40 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        </div>
      </div>
    );
  }
  if (failed) {
    return (
      <div className={card}>
        <p className={`text-[13.5px] ${muted}`}>
          We could not check whether a wallet is linked. That does not mean one is not — reload, or{' '}
          <Link to="/bounties/link" className={isDark ? 'text-[#e8c571] underline underline-offset-2' : 'text-[#5c4214] underline underline-offset-2'}>open the wallet page</Link>.
        </p>
      </div>
    );
  }
  if (state === null) {
    return (
      <div className={card}>
        <div className="animate-pulse flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[12px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <div className={`h-4 w-40 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        </div>
      </div>
    );
  }
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
