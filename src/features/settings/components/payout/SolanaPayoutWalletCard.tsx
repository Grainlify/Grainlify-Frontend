import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, ShieldCheck, Wallet } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getBountyWalletLink, type LinkedWalletState } from '../../../../shared/api/client';
import { formatRegistrationDate } from './claimAddressCopy';

export const WALLET_LINK_PATH = '/bounties/link';

/** The Solana wallet that Bounties and GrainHack pay.
 *
 *  It is the same wallet link the bounty agent already holds (linked on
 *  /bounties/link with one signature), shown here because GrainHack now pays
 *  to it too and this tab is where people look for "where am I paid". The
 *  card only reads; linking stays on the link page, which knows how to talk to
 *  a phone wallet.
 *
 *  Three states and no guessing, as ConnectedWallet: linked, not linked, and
 *  couldn't check. "Not linked" is never shown for a failed read. */
export function SolanaPayoutWalletCard() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [state, setState] = useState<LinkedWalletState | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getBountyWalletLink()
      .then((r) => live && setState(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const c = {
    strong: dark ? 'text-[#f5efe5]' : 'text-[#2d2820]',
    muted: dark ? 'text-[#b8a898]' : 'text-[#4a4038]',
    icon: dark ? 'text-[#e8c571]' : 'text-[#5c4214]',
    shell: dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30',
    secondary: dark ? 'border-white/15 text-[#d4d4d4] hover:bg-white/[0.06]' : 'border-black/15 text-[#2d2820] hover:bg-white/[0.30]',
  };

  const pill = (tone: 'neutral' | 'green', label: string) => (
    <span
      data-testid="solana-wallet-pill"
      className={`inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold ${
        tone === 'green'
          ? dark ? 'bg-[#22c55e]/20 text-[#4ade80]' : 'bg-[#22c55e]/20 text-[#123f22]'
          : dark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#4a4038]'
      }`}
    >
      {tone === 'green' && <ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </span>
  );

  const header = (pillNode: ReactNode) => (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#c9983a]/20 ${c.icon}`}>
        <Wallet className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-0.5">
        <p className={`text-[15px] font-bold ${c.strong}`}>Solana payout wallet</p>
        <div className="sm:hidden">{pillNode}</div>
        <p className={`text-[13px] ${c.muted}`}>Bounties and GrainHack pay USDC on Solana, straight to this wallet. Nothing to claim.</p>
      </div>
      <div className="hidden sm:block">{pillNode}</div>
    </div>
  );

  const shell = (children: ReactNode, s: string) => (
    <section aria-label="Solana payout wallet" data-testid="solana-wallet-card" data-state={s} className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:p-5 ${c.shell}`}>
      {children}
    </section>
  );

  const linkButton = (label: string, primary: boolean) => (
    <Link
      to={WALLET_LINK_PATH}
      className={
        primary
          ? 'inline-flex min-h-[44px] items-center justify-center self-stretch rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-4 py-2 text-[13px] font-semibold text-white sm:min-h-[40px] sm:self-start'
          : `inline-flex min-h-[44px] items-center justify-center self-stretch rounded-[12px] border bg-transparent px-4 py-2 text-[13px] sm:min-h-[40px] sm:self-start ${c.secondary}`
      }
    >
      {label}
    </Link>
  );

  const history = (
    <p className={`border-l-2 border-[#c9983a] py-0.5 pl-3 text-[13px] leading-[1.5] ${c.muted}`}>
      GrainHack&apos;s first event paid test USDC on the Base Sepolia testnet, to the Base address below. GrainHack payouts are now
      made on Solana, to this wallet.
    </p>
  );

  if (failed) {
    return shell(
      <>
        {header(pill('neutral', "Couldn't check"))}
        <p className={`text-[13px] leading-[1.5] ${c.muted}`}>
          Couldn&apos;t check which Solana wallet is linked. This doesn&apos;t change a wallet you&apos;ve already linked; reload to try again.
        </p>
      </>,
      'load-failed',
    );
  }
  if (state === null) {
    return shell(<p className={`text-[14px] ${c.muted}`}>Checking your Solana payout wallet…</p>, 'loading');
  }

  if (state.linked && state.wallet) {
    const wallet = state.wallet;
    return shell(
      <>
        {header(pill('green', 'Linked'))}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span data-testid="solana-wallet-address" className={`break-all font-mono text-[13px] ${c.strong}`}>{wallet}</span>
            <button
              type="button"
              aria-label="Copy wallet address"
              onClick={() => {
                navigator.clipboard.writeText(wallet).then(
                  () => toast.success('Address copied.'),
                  () => toast.error("Couldn't copy the address."),
                );
              }}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] sm:h-8 sm:w-8 ${c.muted}`}
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className={`text-[13px] ${c.muted}`}>
            Linked {formatRegistrationDate(state.linked_at) ?? 'earlier'} · Solana · checked by signature
          </p>
        </div>
        <p className={`text-[14px] leading-[1.55] ${c.muted}`}>
          Bounty and GrainHack payouts are sent to this wallet. Linking a different wallet replaces it; a payout that is already
          waiting for approval keeps the wallet it was prepared with.
        </p>
        {history}
        {linkButton('Link a different wallet', false)}
      </>,
      'linked',
    );
  }

  return shell(
    <>
      {header(pill('neutral', 'Not linked'))}
      <p className={`text-[14px] leading-[1.55] ${c.muted}`}>
        Link a Solana wallet to be paid for Bounties and GrainHack. It takes one signature from the wallet, which costs nothing and
        moves no funds. A GrainHack winner with no wallet linked isn&apos;t dropped: their payout waits until they link one.
      </p>
      {history}
      {linkButton('Link a Solana wallet', true)}
    </>,
    'not-linked',
  );
}
