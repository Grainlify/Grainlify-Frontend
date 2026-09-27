import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, ExternalLink, Smartphone } from 'lucide-react';
import type { WalletAccount } from '@wallet-standard/base';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ApiError, createBountyWalletChallenge, type BountyWalletChallenge, postBountyWalletLink} from '../../../shared/api/client';
import { formatBountyAmount, getBounty, type LinkedWallet, type PublicBounty } from '../../../shared/api/bountyAgent';
import {
  KNOWN_WALLETS,
  WalletRejectedError,
  base58,
  connectWallet,
  phoneOs,
  registerMobileWalletAdapter,
  signText,
  walletBrowseLink,
  watchSolanaWallets,
  type SolanaWallet,
} from '../../../shared/wallet/solana';
import grainlifyLogo from '../../../assets/grainlify_log.svg';

/** /bounties/link: link a Solana wallet to the signed-in GitHub account.
 *
 * Behind the sign-in guard. The GitHub account comes from the Grainlify
 * session, never from a field: Grainlify-Backend writes it into a message with
 * the wallet, a single-use nonce and a ten-minute expiry and countersigns it,
 * the wallet signs the same message, and the bounty agent checks both before
 * it stores the link. Nothing is sent on-chain and the page never sees a key.
 *
 * The frame is the sign-in page's (SignInPage) - its ground, card, logo and
 * notice box - with static glows: nothing moves behind a form, per
 * docs/design-system.md. */

type Step = 'connect' | 'sign' | 'linked';

export function WalletLinkPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { user } = useAuth();
  const login = user?.github?.login ?? null;
  const [params] = useSearchParams();
  const bountyId = params.get('bounty');
  const os = useMemo(() => phoneOs(), []);

  const [bounty, setBounty] = useState<PublicBounty | null>(null);
  const [wallets, setWallets] = useState<SolanaWallet[]>([]);
  const [step, setStep] = useState<Step>('connect');
  const [wallet, setWallet] = useState<SolanaWallet | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [challenge, setChallenge] = useState<BountyWalletChallenge | null>(null);
  const [linked, setLinked] = useState<LinkedWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void registerMobileWalletAdapter(window.location.origin);
    return watchSolanaWallets(setWallets);
  }, []);

  useEffect(() => {
    if (!bountyId) return;
    let mounted = true;
    getBounty(bountyId)
      .then((r) => mounted && setBounty(r.bounty))
      .catch(() => mounted && setBounty(null)); // the page works without it; the claim box just isn't shown
    return () => {
      mounted = false;
    };
  }, [bountyId]);

  const c = {
    strong: dark ? 'text-[#f5efe5]' : 'text-[#2d2820]',
    muted: dark ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]',
    card: dark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25',
    notice: dark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20',
    picker: dark ? 'border-white/15 bg-black/25 text-[#f5efe5]' : 'border-black/15 bg-white/[0.35] text-[#2d2820]',
    msg: dark ? 'border-white/12 bg-black/25 text-[#f5efe5]' : 'border-black/12 bg-white/[0.45] text-[#2d2820]',
    green: dark ? 'text-[var(--brand-success-text)]' : 'text-[var(--brand-success-on)]',
    secondary: dark ? 'border-white/15 text-[#b8a898] hover:bg-white/[0.06]' : 'border-black/15 text-[#4a4038] hover:bg-white/[0.30]',
  };
  const primary = 'min-h-[52px] w-full rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[16px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center';
  const row = `flex min-h-[52px] items-center gap-3 rounded-[12px] border px-3 py-2 text-left hover:border-[#c9983a]/60 ${c.picker}`;
  const pill = `rounded-full bg-[var(--brand-success)]/20 px-2.5 py-1 text-[12px] font-bold ${c.green}`;

  const here = window.location.href;
  const origin = window.location.origin;
  const detected = wallets.filter((w) => !w.mobileAdapter);
  const mwa = wallets.find((w) => w.mobileAdapter) ?? null;
  const notDetected = KNOWN_WALLETS.filter((k) => !detected.some((w) => w.name === k.name));
  // On a phone outside any wallet, the page has to move into the wallet app's browser.
  const outsideWalletOnPhone = os !== null && detected.length === 0;

  function explain(e: unknown): string {
    if (e instanceof WalletRejectedError) return e.message + " Sign again when you're ready.";
    if (e instanceof ApiError && (e.data as { error?: string } | undefined)?.error === 'github_not_linked') {
      return 'Your Grainlify account has no GitHub account attached, and bounties are paid by GitHub account. Sign in with GitHub and try again.';
    }
    return e instanceof Error ? e.message : 'Something went wrong. Try again.';
  }

  async function connect(w: SolanaWallet) {
    setError(null);
    setBusy(true);
    try {
      const acc = await connectWallet(w);
      const ch = await createBountyWalletChallenge(acc.address);
      setWallet(w);
      setAccount(acc);
      setChallenge(ch);
      setStep('sign');
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!wallet || !account || !challenge) return;
    setError(null);
    setBusy(true);
    try {
      // A request older than its ten minutes would be refused; fetch a fresh one first.
      let ch = challenge;
      if (Date.parse(ch.expires_at) - Date.now() < 30_000) {
        ch = await createBountyWalletChallenge(account.address);
        setChallenge(ch);
      }
      const signature = await signText(wallet, account, ch.message);
      // Through Grainlify, not straight to the agent: a wallet extension
      // re-issuing that cross-origin POST is what broke the read path.
      const result = await postBountyWalletLink({ message: ch.message, countersignature: ch.countersignature, walletSignature: base58(signature) });
      setLinked(result);
      setStep('linked');
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    { id: 'connect', label: 'Connect' },
    { id: 'sign', label: 'Sign' },
    { id: 'linked', label: 'Linked' },
  ];
  const stepIndex = step === 'linked' ? steps.length : steps.findIndex((s) => s.id === step);
  const who = (
    <p className={`text-[15px] ${c.muted}`}>
      Payouts for <span className={`font-semibold ${c.strong}`}>@{login ?? 'you'}</span> go to the wallet you link.
    </p>
  );

  return (
    <div className={`min-h-screen flex items-start sm:items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden ${dark ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]' : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'}`}>
      {/* The sign-in page's two glows, without its pulse: nothing moves behind a form. */}
      <div aria-hidden="true" className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/30 blur-3xl" />
      <div aria-hidden="true" className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/20 blur-3xl" />

      <Link to="/dashboard?tab=bounties" className={`absolute top-6 left-6 flex items-center space-x-2 hover:text-[#c9983a] font-medium ${c.muted}`}>
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Grainlify</span>
      </Link>

      <div className="relative w-full max-w-md">
        <div className={`backdrop-blur-[40px] border rounded-[28px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col gap-5 ${c.card}`}>
          <div className="flex items-center justify-center space-x-3">
            <img src={grainlifyLogo} alt="" className="w-10 h-10" />
            <span className={`text-2xl font-semibold ${c.strong}`}>Grainlify</span>
          </div>

          <ol aria-label="Progress" className="flex justify-center gap-5 text-[13px]">
            {steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1.5" aria-current={i === stepIndex ? 'step' : undefined}>
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold ${
                    i < stepIndex ? `bg-[var(--brand-success)]/20 ${c.green}` : i === stepIndex ? 'bg-[#7d5c20] text-white' : `border-[1.5px] ${dark ? 'border-white/30' : 'border-black/25'} ${c.muted}`
                  }`}
                >
                  {i < stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className={i === stepIndex ? `font-semibold ${c.strong}` : c.muted}>{s.label}</span>
              </li>
            ))}
          </ol>

          {bounty && step !== 'linked' && (
            <div className={`flex flex-col gap-1 rounded-[12px] border p-3 text-[13px] leading-[1.5] ${c.strong} ${dark ? 'border-[#c9983a]/30 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/35 bg-[#c9983a]/10'}`}>
              <span className="font-semibold">You're claiming</span>
              <span>
                {bounty.repo} #{bounty.issueNumber} · {formatBountyAmount(bounty)}
              </span>
            </div>
          )}

          {step === 'connect' && (
            <>
              <div className="text-center">
                <h1 className={`text-[26px] leading-tight font-bold mb-2 ${c.strong}`}>Link a wallet to get paid</h1>
                {who}
              </div>

              {outsideWalletOnPhone ? (
                <>
                  {mwa && (
                    <button type="button" disabled={busy} onClick={() => connect(mwa)} className={row}>
                      <span className="w-8 h-8 inline-flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </span>
                      <span className="flex-1 text-[15px] font-semibold">Use a wallet app on this phone</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  <span className={`text-[13px] ${c.muted}`}>{mwa ? 'Or open this page inside your wallet' : 'Open this page inside your wallet app'}</span>
                  {(['Phantom', 'Solflare'] as const).map((name) => (
                    <a key={name} href={walletBrowseLink(name, here, origin)} className={row}>
                      <img src={KNOWN_WALLETS.find((k) => k.name === name)!.icon} alt="" className="w-8 h-8 rounded-[8px]" />
                      <span className="flex-1 text-[15px] font-semibold">Open in {name}</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  ))}
                  <a href="https://backpack.app/download" target="_blank" rel="noreferrer" className={row}>
                    <img src="/wallets/backpack.png" alt="" className="w-8 h-8 rounded-[8px]" />
                    <span className="flex-1 text-[15px] font-semibold">Get Backpack</span>
                    <span className={`inline-flex items-center gap-1.5 text-[13px] ${c.muted}`}>
                      Install <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </a>
                </>
              ) : (
                <>
                  {detected.length > 0 && <span className={`text-[13px] ${c.muted}`}>Found in this browser</span>}
                  {detected.map((w) => (
                    <button key={w.name} type="button" disabled={busy} onClick={() => connect(w)} className={row}>
                      <img src={w.icon} alt="" className="w-8 h-8 rounded-[8px]" />
                      <span className="flex-1 text-[15px] font-semibold">{w.name}</span>
                      <span className={pill}>Detected</span>
                    </button>
                  ))}
                  {notDetected.length > 0 && (
                    <span className={`text-[13px] ${c.muted}`}>{detected.length ? 'Other Solana wallets' : 'No Solana wallet found in this browser. Install one:'}</span>
                  )}
                  {notDetected.map((k) => (
                    <a key={k.name} href={k.install} target="_blank" rel="noreferrer" className={row}>
                      <img src={k.icon} alt="" className="w-8 h-8 rounded-[8px]" />
                      <span className="flex-1 text-[15px] font-semibold">{k.name}</span>
                      <span className={`inline-flex items-center gap-1.5 text-[13px] ${c.muted}`}>
                        Install <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </a>
                  ))}
                </>
              )}
            </>
          )}

          {step === 'sign' && wallet && account && challenge && (
            <>
              <div className="text-center">
                <h1 className={`text-[26px] leading-tight font-bold mb-2 ${c.strong}`}>Sign to confirm</h1>
                {who}
              </div>
              <div className={`flex min-h-[52px] items-center gap-3 rounded-[12px] border px-3 py-2 ${c.picker}`}>
                <img src={wallet.icon} alt="" className="w-8 h-8 rounded-[8px]" />
                <span className="flex-1 min-w-0 truncate font-mono text-[13px]">
                  {account.address.slice(0, 6)}…{account.address.slice(-5)}
                </span>
                <span className={pill}>Connected</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={`text-[13px] ${c.muted}`}>Your wallet will show exactly this:</span>
                <pre className={`whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[12px] border p-3 font-mono text-[11px] leading-[1.6] ${c.msg}`}>{challenge.message}</pre>
              </div>
            </>
          )}

          {step === 'linked' && linked && (
            <>
              <div className="text-center">
                <h1 className={`text-[26px] leading-tight font-bold mb-2 ${c.strong}`}>Wallet linked</h1>
                <p className={`text-[15px] ${c.muted}`}>
                  Bounties you win as <span className={`font-semibold ${c.strong}`}>@{linked.githubLogin}</span> are paid here.
                </p>
              </div>
              <div className={`flex flex-col gap-1 rounded-[12px] border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/[0.08] p-3 text-[13px] leading-[1.5] ${c.strong}`}>
                <span className={`font-semibold ${c.green}`}>{linked.unchanged ? 'Already linked' : 'Linked just now'}</span>
                <span className="font-mono break-all">{linked.wallet}</span>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className={`rounded-[12px] border p-3 text-[13px] ${dark ? 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]' : 'border-[#ef4444]/25 bg-[#ef4444]/[0.06] text-[#6f1818]'}`}>
              {error}
            </p>
          )}

          {step === 'sign' && (
            <>
              <button type="button" disabled={busy} onClick={sign} className={primary}>
                {busy ? 'Waiting for the wallet…' : error ? 'Try again' : 'Sign message'}
              </button>
              <p className={`rounded-[12px] border p-3 text-center text-[12px] ${c.notice} ${c.muted}`}>Free. No transaction. Valid once, for 10 minutes. We never ask for a recovery phrase.</p>
            </>
          )}

          {step === 'linked' && (
            <>
              <Link to="/dashboard?tab=bounties" className={primary}>
                Back to Bounties
              </Link>
              <Link to="/dashboard?tab=bounties&subtab=ledger" className={`min-h-[52px] rounded-[12px] border bg-transparent inline-flex items-center justify-center text-[15px] font-medium ${c.secondary}`}>
                Open the ledger
              </Link>
            </>
          )}

          <Link to="/support" className="self-center text-[13px] font-medium text-[#c9983a] hover:text-[#d4af37]">
            Get help
          </Link>
        </div>
      </div>
    </div>
  );
}
