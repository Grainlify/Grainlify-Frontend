import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { formatBountyAmount, getBounty, type PublicBounty } from '../../../shared/api/bountyAgent';
import {
  connectSolanaWallet,
  detectSolanaWallet,
  findSolanaWallet,
  isGitHubLogin,
  linkMessage,
  signLinkMessage,
  walletBrowseLink,
  type SolanaWalletId,
} from '../../../shared/wallet/solana';

/** /bounties/link: link a Solana wallet to a GitHub account, from a phone.
 *
 * Public, because it has to open inside the wallet app's own browser, where
 * nobody is signed in to Grainlify. It needs no account: GitHub proves who
 * posts the comment, the signature proves the wallet. Nothing is sent
 * on-chain and the page never sees a key.
 *
 * The frame is the sign-in page's (SignInPage) - its ground, card, logo tile
 * and notice box - and the parts inside are the payout-address cards'. Static
 * behind the form, per docs/design-system.md (Tier A, sign-in rule). */

type Step = 'open' | 'sign' | 'post';

const WALLETS: { id: SolanaWalletId; name: string; logo: string }[] = [
  { id: 'phantom', name: 'Phantom', logo: '/wallets/phantom.svg' },
  { id: 'solflare', name: 'Solflare', logo: '/wallets/solflare.svg' },
];

export function WalletLinkPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [params] = useSearchParams();
  const bountyId = params.get('bounty');

  const [bounty, setBounty] = useState<PublicBounty | null>(null);
  const [step, setStep] = useState<Step>(() => (detectSolanaWallet() ? 'sign' : 'open'));
  const [login, setLogin] = useState('');
  const [walletId, setWalletId] = useState<SolanaWalletId | null>(() => detectSolanaWallet());
  const [address, setAddress] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const preview = useMemo(() => linkMessage(login || 'your-github-username', address ?? 'your-wallet-address', new Date().toISOString().slice(0, 17) + '00Z'), [login, address]);

  const c = {
    strong: dark ? 'text-[#f5efe5]' : 'text-[#2d2820]',
    muted: dark ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]',
    card: dark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25',
    notice: dark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20',
    picker: dark ? 'border-white/15 bg-black/25 text-[#f5efe5]' : 'border-black/15 bg-white/[0.35] text-[#2d2820]',
    input: dark ? 'bg-white/[0.06] border-white/10 text-[#f5efe5] placeholder:text-white/30' : 'bg-white/[0.4] border-white/40 text-[#2d2820] placeholder:text-black/30',
    msg: dark ? 'border-white/12 bg-black/25 text-[#f5efe5]' : 'border-black/12 bg-white/[0.45] text-[#2d2820]',
    green: dark ? 'text-[#4ade80]' : 'text-[#123f22]',
    secondary: dark ? 'border-white/15 text-[#b8a898] hover:bg-white/[0.06]' : 'border-black/15 text-[#4a4038] hover:bg-white/[0.30]',
  };
  const primary = 'min-h-[52px] w-full rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[16px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center';

  const here = typeof window !== 'undefined' ? window.location.href : 'https://grainlify.com/bounties/link';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://grainlify.com';

  async function connect(id: SolanaWalletId) {
    setError(null);
    const provider = findSolanaWallet(id);
    if (!provider) {
      setError(`${id === 'phantom' ? 'Phantom' : 'Solflare'} is not available in this browser. Open this page from the wallet app.`);
      return;
    }
    try {
      setWalletId(id);
      setAddress(await connectSolanaWallet(provider));
    } catch {
      setError('The wallet did not connect. Try again, and approve the request in the wallet.');
    }
  }

  async function sign() {
    if (!walletId || !address) return;
    const provider = findSolanaWallet(walletId);
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const r = await signLinkMessage(provider, login, address);
      setComment(r.comment);
      setStep('post');
      try {
        await navigator.clipboard.writeText(r.comment);
        setCopied(true);
      } catch {
        setCopied(false); // some in-app browsers refuse; the copy button is still there
      }
    } catch {
      setError('Signing was cancelled or failed. Nothing was sent.');
    } finally {
      setBusy(false);
    }
  }

  const steps: { id: Step; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'sign', label: 'Sign' },
    { id: 'post', label: 'Post' },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className={`min-h-screen flex items-start sm:items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden ${dark ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]' : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'}`}>
      {/* The sign-in page's two glows, without its pulse: nothing moves behind a form. */}
      <div aria-hidden="true" className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/30 blur-3xl" />
      <div aria-hidden="true" className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/20 blur-3xl" />

      {/* Home, not the dashboard: inside a wallet's browser nobody is signed in. */}
      <Link to="/" className={`absolute top-6 left-6 flex items-center space-x-2 hover:text-[#c9983a] font-medium ${c.muted}`}>
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Grainlify</span>
      </Link>

      <div className="relative w-full max-w-md">
        <div className={`backdrop-blur-[40px] border rounded-[28px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col gap-5 ${c.card}`}>
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c9983a] to-[#d4af37] shadow-[0_2px_8px_rgba(201,152,58,0.4)]" />
            <span className={`text-2xl font-semibold ${c.strong}`}>Grainlify</span>
          </div>

          <ol aria-label="Progress" className="flex justify-center gap-5 text-[13px]">
            {steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1.5" aria-current={i === stepIndex ? 'step' : undefined}>
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold ${
                    i < stepIndex ? `bg-[#22c55e]/20 ${c.green}` : i === stepIndex ? 'bg-[#7d5c20] text-white' : `border-[1.5px] ${dark ? 'border-white/30' : 'border-black/25'} ${c.muted}`
                  }`}
                >
                  {i < stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className={i === stepIndex ? `font-semibold ${c.strong}` : c.muted}>{s.label}</span>
              </li>
            ))}
          </ol>

          {bounty && (
            <div className={`flex flex-col gap-1 rounded-[12px] border p-3 text-[13px] leading-[1.5] ${c.strong} ${dark ? 'border-[#c9983a]/30 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/35 bg-[#c9983a]/10'}`}>
              <span className="font-semibold">You're claiming</span>
              <span>
                {bounty.repo} #{bounty.issueNumber} · {formatBountyAmount(bounty)}
              </span>
            </div>
          )}

          {step === 'open' && (
            <>
              <div className="text-center">
                <h1 className={`text-[26px] leading-tight font-bold mb-2 ${c.strong}`}>Link a wallet to get paid</h1>
                <p className={`text-[16px] ${c.muted}`}>Sign one message in your wallet app.</p>
              </div>
              {WALLETS.map((w) => (
                <a key={w.id} href={walletBrowseLink(w.id, here, origin)} className={`flex min-h-[52px] items-center gap-3 rounded-[12px] border px-3 py-2 hover:border-[#c9983a]/60 ${c.picker}`}>
                  <img src={w.logo} alt="" className="w-8 h-8 rounded-[8px]" />
                  <span className="flex-1 text-[15px] font-semibold">Open in {w.name}</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              ))}
              <button type="button" onClick={() => setStep('sign')} className={`min-h-[52px] rounded-[12px] border border-dashed text-[14px] ${dark ? 'border-white/15' : 'border-black/15'} ${c.muted}`}>
                Already in your wallet's browser? Continue
              </button>
            </>
          )}

          {step === 'sign' && (
            <>
              <h1 className={`text-center text-[26px] leading-tight font-bold ${c.strong}`}>Sign with your wallet</h1>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gh-login" className={`text-[14px] font-semibold ${c.strong}`}>Your GitHub username</label>
                <input
                  id="gh-login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value.trim())}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="octocat"
                  className={`min-h-[44px] rounded-[12px] border px-4 py-2.5 text-[16px] ${c.input}`}
                />
                {login && !isGitHubLogin(login) && <span className={`text-[12px] ${dark ? 'text-[#fca5a5]' : 'text-[#6f1818]'}`}>That is not a valid GitHub username.</span>}
              </div>

              {address ? (
                <div className={`flex min-h-[52px] items-center gap-3 rounded-[12px] border px-3 py-2 ${c.picker}`}>
                  <img src={WALLETS.find((w) => w.id === walletId)!.logo} alt="" className="w-8 h-8 rounded-[8px]" />
                  <span className="flex-1 min-w-0 truncate font-mono text-[13px]">{address.slice(0, 6)}…{address.slice(-5)}</span>
                  <span className={`rounded-full bg-[#22c55e]/20 px-2.5 py-1 text-[12px] font-bold ${c.green}`}>Connected</span>
                </div>
              ) : (
                WALLETS.map((w) => (
                  <button key={w.id} type="button" onClick={() => connect(w.id)} className={`flex min-h-[52px] items-center gap-3 rounded-[12px] border px-3 py-2 text-left hover:border-[#c9983a]/60 ${c.picker}`}>
                    <img src={w.logo} alt="" className="w-8 h-8 rounded-[8px]" />
                    <span className="flex-1 text-[15px] font-semibold">Connect {w.name}</span>
                  </button>
                ))
              )}

              <div className="flex flex-col gap-1.5">
                <span className={`text-[13px] ${c.muted}`}>You're signing exactly this:</span>
                <pre className={`whitespace-pre-wrap break-all rounded-[12px] border p-3 font-mono text-[11px] leading-[1.6] ${c.msg}`}>{preview}</pre>
              </div>

              <button type="button" disabled={!address || !isGitHubLogin(login) || busy} onClick={sign} className={primary}>
                {busy ? 'Waiting for the wallet…' : 'Sign message'}
              </button>
              <p className={`rounded-[12px] border p-3 text-center text-[12px] ${c.notice} ${c.muted}`}>Free. No transaction. We never ask for a recovery phrase.</p>
            </>
          )}

          {step === 'post' && comment && (
            <>
              <div className="text-center">
                <h1 className={`text-[26px] leading-tight font-bold mb-2 ${c.strong}`}>Now post it on GitHub</h1>
                <p className={`text-[15px] ${c.muted}`}>
                  Paste it as a comment {bounty ? 'on the bounty issue' : 'on any bounty issue'} from @{login}, within 24 hours.
                </p>
              </div>
              <div className={`flex flex-col gap-1 rounded-[12px] border border-[#22c55e]/30 bg-[#22c55e]/[0.08] p-3 text-[13px] leading-[1.5] ${c.strong}`}>
                <span className={`font-semibold ${c.green}`}>{copied ? 'Signed and copied' : 'Signed'}</span>
                <span>The agent replies on the issue once your wallet is linked.</span>
              </div>
              <pre className={`whitespace-pre-wrap break-all rounded-[12px] border p-3 font-mono text-[11px] leading-[1.6] ${c.msg}`}>{comment}</pre>
              <button
                type="button"
                className={primary}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(comment);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? 'Copied' : 'Copy comment'}
              </button>
              {bounty && (
                <a href={bounty.issueUrl} target="_blank" rel="noreferrer" className={`min-h-[52px] rounded-[12px] border bg-transparent inline-flex items-center justify-center text-[15px] font-medium ${c.secondary}`}>
                  Open the issue on GitHub
                </a>
              )}
            </>
          )}

          {error && (
            <p role="alert" className={`rounded-[12px] border p-3 text-[13px] ${dark ? 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]' : 'border-[#ef4444]/25 bg-[#ef4444]/[0.06] text-[#6f1818]'}`}>
              {error}
            </p>
          )}

          <Link to="/support" className="self-center text-[13px] font-medium text-[#c9983a] hover:text-[#d4af37]">
            Get help
          </Link>
        </div>
      </div>
    </div>
  );
}
