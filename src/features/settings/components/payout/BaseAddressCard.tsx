import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Copy, ShieldCheck, Wallet } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  getPayoutAddress,
  createPayoutAddressChallenge,
  registerPayoutAddress,
  type PayoutAddress,
} from '../../../../shared/api/client';
import {
  connectEvmWallet,
  signEvmChallenge,
  watchEvmWallets,
  type EvmWallet,
} from '../../../../shared/wallet/evm';
import { formatRegistrationDate } from './claimAddressCopy';
import { classifyBaseFailure, type BaseFailure } from './baseAddressFailure';

/** Which chain_configs row this card registers against.
 *
 *  Both 'base' and 'base-sepolia' are enabled rows on the backend. The card is
 *  pointed at one of them by deploy config rather than guessing, and defaults
 *  to the testnet, the same stage the Aptos card defaults to. */
export const BASE_PAYOUT_CHAIN_ID: string =
  import.meta.env.VITE_BASE_PAYOUT_CHAIN_ID || 'base-sepolia';

type Phase =
  | { kind: 'idle' }
  | { kind: 'picking' }
  | { kind: 'connecting' }
  | { kind: 'signing'; address: string; message: string }
  | { kind: 'verifying'; address: string }
  | { kind: 'closed' }
  | { kind: 'failed'; failure: BaseFailure; address?: string };

type Tone = 'neutral' | 'gold' | 'amber' | 'red' | 'green';

const shortAddress = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

/** The Base payout address: USDC sent straight to the address, nothing to claim.
 *
 *  A separate card from the Aptos one on purpose - the two chains pay
 *  differently (Aptos is claimed, Base is pushed), and the header line says so
 *  in every state. Every state below is drawn on the approved "every state"
 *  sheet (Base card, states 1-15) with the server code that produces it.
 *
 *  Static on purpose: this is a dashboard surface, so no spinners or
 *  transitions. In-flight states say what they are waiting for instead.
 */
export function BaseAddressCard({ chainId = BASE_PAYOUT_CHAIN_ID }: { chainId?: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [existing, setExisting] = useState<PayoutAddress | null>(null);
  const [wallets, setWallets] = useState<EvmWallet[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const c = {
    strong: dark ? 'text-[#f5efe5]' : 'text-[#2d2820]',
    muted: dark ? 'text-[#b8a898]' : 'text-[#4a4038]',
    icon: dark ? 'text-[#e8c571]' : 'text-[#5c4214]',
    shell: dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30',
    secondary: dark
      ? 'border-white/15 text-[#b8a898] hover:bg-white/[0.06]'
      : 'border-black/15 text-[#4a4038] hover:bg-white/[0.30]',
    row: dark
      ? 'border-white/15 bg-black/25 text-[#f5efe5] hover:border-[#c9983a]/60'
      : 'border-black/15 bg-white/[0.35] text-[#2d2820] hover:border-[#c9983a]/60',
    dashed: dark ? 'border-white/30' : 'border-black/25',
    messageBlock: dark ? 'border-white/12 bg-black/25 text-[#f5efe5]' : 'border-black/12 bg-white/[0.45] text-[#2d2820]',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setExisting(await getPayoutAddress(chainId));
    } catch {
      // A failed load is not "none registered" - see PayoutAddressCard.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live for as long as the card is mounted: a wallet that announces late is
  // added, and "no wallet" turns into the picker without a reload.
  useEffect(() => watchEvmWallets(setWallets), []);

  const busy = phase.kind === 'connecting' || phase.kind === 'signing' || phase.kind === 'verifying';

  const register = async (wallet: EvmWallet) => {
    setPhase({ kind: 'connecting' });
    let address: string | undefined;
    try {
      address = await connectEvmWallet(wallet);
      const challenge = await createPayoutAddressChallenge(chainId, address);
      setPhase({ kind: 'signing', address, message: challenge.message });
      // The server's message, byte for byte. See signEvmChallenge.
      const signature = await signEvmChallenge(wallet, challenge.message, address);
      setPhase({ kind: 'verifying', address });
      const saved = await registerPayoutAddress({
        chainId,
        address,
        publicKey: '',
        signature,
        nonce: challenge.nonce,
      });
      setExisting(saved);
      setPhase({ kind: 'idle' });
      toast.success(
        saved.replaced
          ? `Base payout address verified. ${shortAddress(saved.replaced.address)} is no longer your Base payout address.`
          : 'Base payout address verified.',
      );
    } catch (e) {
      const failure = classifyBaseFailure(e);
      setPhase(failure.kind === 'closed' ? { kind: 'closed' } : { kind: 'failed', failure, address });
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied.');
    } catch {
      toast.error("Couldn't copy the address.");
    }
  };

  // ---- pieces ------------------------------------------------------------

  const pill = (tone: Tone, label: string, withIcon = false) => {
    const tones: Record<Tone, string> = {
      neutral: dark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#4a4038]',
      gold: dark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#5c4214]',
      amber: dark ? 'bg-[#f59e0b]/20 text-[#fbbf24]' : 'bg-[#f59e0b]/20 text-[#7c2d12]',
      red: dark ? 'bg-[#ef4444]/15 text-[#fca5a5]' : 'bg-[#ef4444]/15 text-[#6f1818]',
      green: dark ? 'bg-[#22c55e]/20 text-[#4ade80]' : 'bg-[#22c55e]/20 text-[#123f22]',
    };
    return (
      <span
        data-testid="base-pill"
        className={`inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold ${tones[tone]}`}
      >
        {withIcon && <ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </span>
    );
  };

  const callout = (tone: 'gold' | 'red' | 'green', children: ReactNode, testId: string) => {
    const tones = {
      gold: dark ? 'border-[#c9983a]/30 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/35 bg-[#c9983a]/10',
      red: dark ? 'border-[#ef4444]/25 bg-[#ef4444]/10' : 'border-[#ef4444]/25 bg-[#ef4444]/[0.06]',
      green: dark ? 'border-[#22c55e]/30 bg-[#22c55e]/[0.08]' : 'border-[#22c55e]/30 bg-[#22c55e]/[0.08]',
    };
    return (
      <div
        role={tone === 'green' ? 'status' : 'alert'}
        data-testid={testId}
        className={`flex flex-col gap-1 rounded-[12px] border p-3 text-[13px] leading-[1.5] ${c.strong} ${tones[tone]}`}
      >
        {children}
      </div>
    );
  };

  const primary = (label: string, onClick?: () => void, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] self-stretch rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[40px] sm:self-start"
    >
      {label}
    </button>
  );

  const secondary = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] self-stretch rounded-[12px] border bg-transparent px-4 py-2 text-[13px] sm:min-h-[40px] sm:self-start ${c.secondary}`}
    >
      {label}
    </button>
  );

  const step = (n: number, label: ReactNode, state: 'done' | 'current' | 'todo') => (
    <li className={`flex items-center gap-2 text-[13px] ${state === 'current' ? `font-semibold ${c.strong}` : c.muted}`}>
      {state === 'done' ? (
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#22c55e]/20 ${dark ? 'text-[#4ade80]' : 'text-[#123f22]'}`} aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
      ) : state === 'current' ? (
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#7d5c20] text-[12px] font-bold text-white" aria-hidden>{n}</span>
      ) : (
        <span className={`box-border flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] text-[12px] font-bold ${dark ? 'border-white/30' : 'border-black/25'}`} aria-hidden>{n}</span>
      )}
      <span>{label}</span>
    </li>
  );

  const header = (pillNode: ReactNode) => (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#c9983a]/20 ${c.icon}`}>
        <Wallet className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-0.5">
        <p className={`text-[15px] font-bold ${c.strong}`}>Base payout address</p>
        <div className="sm:hidden">{pillNode}</div>
        <p className={`text-[13px] ${c.muted}`}>USDC on Base, sent straight to this address. Nothing to claim.</p>
      </div>
      <div className="hidden sm:block">{pillNode}</div>
    </div>
  );

  const shell = (children: ReactNode, state: string) => (
    <section
      aria-label="Base payout address"
      data-testid="base-address-card"
      data-state={state}
      className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:p-5 ${c.shell}`}
    >
      {children}
    </section>
  );

  // ---- states ------------------------------------------------------------

  if (loading) {
    return shell(<p className={`text-[14px] ${c.muted}`}>Checking your Base payout address…</p>, 'loading');
  }

  // 1
  if (loadFailed) {
    return shell(
      <>
        {header(pill('neutral', "Couldn't check"))}
        <p className={`text-[13px] leading-[1.5] ${c.muted}`}>
          Couldn't check your Base payout address. This doesn't affect one you've already registered — reload to try again.
        </p>
      </>,
      'load-failed',
    );
  }

  // 2
  if (phase.kind === 'closed') {
    return shell(
      <>
        {header(pill('neutral', 'Not open yet'))}
        <p className={`text-[13px] leading-[1.5] ${c.muted}`}>Payouts on Base aren't open yet. There's nothing to do for now.</p>
      </>,
      'closed',
    );
  }

  const failure = phase.kind === 'failed' ? phase.failure : null;
  const replacing = existing !== null;
  const reset = () => setPhase({ kind: 'idle' });
  const start = () => setPhase({ kind: 'picking' });
  const noWallet = wallets.length === 0;

  const verifiedPill = pill('green', 'Verified', true);

  let pillNode: ReactNode;
  if (existing) pillNode = verifiedPill;
  else if (phase.kind === 'connecting' || phase.kind === 'signing') pillNode = pill('gold', 'Waiting for your wallet');
  else if (phase.kind === 'verifying') pillNode = pill('gold', 'Checking signature');
  else if (failure?.kind === 'signature_invalid' || failure?.kind === 'address_rejected') pillNode = pill('amber', 'Action needed');
  else if (failure?.kind === 'another_account') pillNode = pill('red', "Can't use this address");
  else pillNode = pill('neutral', 'Not registered');

  // 13, 15 and the not-registered intro share the three steps.
  const steps = (current: 1 | 2) => (
    <ol className="flex flex-col gap-2" aria-label="Steps">
      {current === 1
        ? step(1, phase.kind === 'picking' ? 'Choose a wallet' : 'Connect wallet', 'current')
        : step(1, <>Wallet connected: <span className={`font-mono text-[12px] ${c.strong}`}>{phase.kind === 'signing' ? shortAddress(phase.address) : ''}</span></>, 'done')}
      {step(2, 'Sign one message', current === 2 ? 'current' : 'todo')}
      {step(3, 'Verified', 'todo')}
    </ol>
  );

  const existingBlock = existing && (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span data-testid="base-address" className={`break-all font-mono text-[13px] ${c.strong}`}>{existing.address}</span>
        <button
          type="button"
          onClick={() => void copyAddress(existing.address)}
          aria-label="Copy address"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] sm:h-8 sm:w-8 ${c.muted}`}
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className={`text-[13px] ${c.muted}`}>
        {failure && failure.kind !== 'unchanged'
          ? 'Still your payout address'
          : `Verified ${formatRegistrationDate(existing.verified_at) ?? 'recently'} · ${existing.chain_id} · checked by signature`}
      </p>
    </div>
  );

  // 3-12, 14: what went wrong, in the words approved for each.
  const failureNode = (() => {
    if (!failure) return null;
    const lead = (text: string) => <span className="font-bold">{text}</span>;
    const body = (text: ReactNode) => <span className={c.muted}>{text}</span>;
    const replacedLead = "The new address wasn't saved.";
    const testId = `base-failure-${failure.kind}`;
    switch (failure.kind) {
      case 'declined':
        return callout('gold', replacing
          ? <span>{lead(replacedLead)} You declined the signature in your wallet, so your current address is unchanged.</span>
          : lead('You declined the signature in your wallet. Nothing was saved.'), testId);
      case 'request_pending':
        return callout('gold', <span>{lead('Your wallet already has a request open.')} Finish or cancel it in your wallet, then try again. Nothing was saved.</span>, testId);
      case 'signature_invalid':
        return replacing
          ? callout('gold', <span>{lead(replacedLead)} The signature didn't verify, so your current address is unchanged.</span>, testId)
          : callout('gold', <>
              {lead("The signature didn't verify. Nothing was saved.")}
              {body(<>Make sure your wallet is signing with {phase.kind === 'failed' && phase.address
                ? <><span className="font-mono text-[12px]">{shortAddress(phase.address)}</span>, the account shown here</>
                : 'the account you connected'}. Smart-contract wallets such as Safe can't be verified yet.</>)}
            </>, testId);
      case 'address_rejected':
        return callout('gold', <>
          {lead(replacing ? `${replacedLead} Your wallet gave an address we couldn't accept.` : "Your wallet gave an address we couldn't accept. Nothing was saved.")}
          {failure.detail && <span className={`text-[12px] ${c.muted}`}>Details: {failure.detail}</span>}
        </>, testId);
      case 'nonce_expired':
        return callout('gold', <span>{lead(replacing ? replacedLead : 'The signing request expired.')} {replacing ? 'The signing request expired. It only lasts ten minutes.' : 'It only lasts ten minutes. Nothing was saved.'}</span>, testId);
      case 'nonce_spent':
        return callout('gold', <span>{lead(replacing ? replacedLead : 'That signing request was already used.')} {replacing ? 'That signing request was already used. Start again to get a new one.' : 'Start again to get a new one.'}</span>, testId);
      case 'another_account':
        return callout('red', <>
          <span className={`font-bold ${dark ? 'text-[#fca5a5]' : 'text-[#6f1818]'}`}>
            {replacing ? `${replacedLead} This address belongs to another Grainlify account.` : 'This address belongs to another Grainlify account.'}
          </span>
          {failure.detail && body(failure.detail)}
        </>, testId);
      case 'unchanged':
        return callout('green', <>
          {lead('That address is already your Base payout address.')}
          {body("Your registration wasn't touched: it keeps its original verified date. The signature you just made has been used up, so to change your address, start again with the new one.")}
        </>, testId);
      case 'store_failed':
        return callout('gold', <>
          {lead(replacing ? `${replacedLead} Your signature checked out, but we couldn't save the address.` : "Your signature checked out, but we couldn't save the address.")}
          {body("Nothing was saved. That signature can't be reused, so start again and sign once more.")}
        </>, testId);
      default:
        return callout('gold', <span>{lead(replacing ? replacedLead : "Couldn't verify that address.")} Nothing was saved. Start again.</span>, testId);
    }
  })();

  const failureAction = (() => {
    if (!failure) return null;
    switch (failure.kind) {
      case 'unchanged':
        // The copy tells them to start again with the new address; without a
        // control they would be stuck here until a reload.
        return secondary('Register a different address', start);
      case 'declined':
      case 'request_pending':
      case 'signature_invalid':
        return replacing ? secondary('Try a different address again', start) : primary('Try again', start);
      case 'address_rejected':
        return secondary('Start again', start);
      case 'another_account':
        return secondary('Use a different address', start);
      default:
        return replacing ? secondary('Try a different address again', start) : primary('Start again', start);
    }
  })();

  // 15
  const picker = (
    <div className="flex flex-col gap-3" data-testid="base-wallet-picker">
      <p className={`text-[14px] font-bold ${c.strong}`}>Choose a wallet</p>
      <p className={`text-[13px] leading-[1.5] ${c.muted}`}>Pick the wallet holding the address you want paid on Base.</p>
      <ul className="flex flex-col gap-2">
        {wallets.map((w) => (
          <li key={w.key}>
            {w.conflict ? (
              <div
                aria-disabled="true"
                data-testid="base-wallet-conflict"
                className={`flex min-h-[52px] items-center gap-3 rounded-[12px] border border-dashed px-3 py-2 ${dark ? 'border-white/15' : 'border-black/15'}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-dashed text-[12px] font-bold ${c.dashed} ${c.muted}`} aria-hidden>!</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`break-all font-mono text-[12px] font-semibold ${c.strong}`}>{w.rdns}</span>
                  <span className={`text-[12px] leading-[1.4] ${c.muted}`}>
                    Two installed extensions both claim to be this wallet. We can't tell them apart, so we won't connect to either. Disable the one you don't use, then reload.
                  </span>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void register(w)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-[12px] border px-3 py-2 text-left ${c.row}`}
              >
                {w.icon ? (
                  // <img> only: the icon may be SVG, which runs script anywhere else.
                  <img src={w.icon} alt="" className="h-8 w-8 shrink-0 rounded-[8px]" />
                ) : (
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-dashed ${c.dashed} ${c.muted}`} aria-hidden>
                    <Wallet className="h-4 w-4" />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-semibold">{w.name}</span>
                  <span className={`break-all font-mono text-[11px] ${c.muted}`}>{w.rdns ?? 'window.ethereum'}</span>
                </span>
                <ChevronRight className={`h-4 w-4 shrink-0 ${c.muted}`} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {secondary('Cancel', reset)}
    </div>
  );

  const noWalletNode = callout('gold', <span><span className="font-bold">No Ethereum wallet found in this browser.</span> Install one, then reload this page.</span>, 'base-no-wallet');

  let state: string = phase.kind === 'failed' ? `failed-${phase.failure.kind}` : phase.kind;
  let content: ReactNode;

  if (phase.kind === 'picking') {
    // Wallets can vanish only on reload, but guard anyway: an empty picker is
    // the no-wallet state.
    content = (
      <>
        {existingBlock}
        {!existing && steps(1)}
        {noWallet ? noWalletNode : picker}
      </>
    );
  } else if (phase.kind === 'connecting') {
    content = (
      <>
        {existingBlock}
        {!existing && steps(1)}
        <p className={`text-[13px] leading-[1.5] ${c.muted}`}>Approve the connection in your wallet.</p>
        {primary('Waiting for your wallet…', undefined, true)}
      </>
    );
  } else if (phase.kind === 'signing') {
    // 13
    content = (
      <>
        {existingBlock}
        {!existing && steps(2)}
        <p className={`text-[13px] leading-[1.5] ${c.muted}`}>
          Approve the signature in your wallet. It should show exactly this message. Signing it costs nothing and sends no transaction.
        </p>
        {/* The server's message field, verbatim. pre-wrap keeps its line
            breaks without the browser rebuilding anything. */}
        <pre
          data-testid="base-signed-message"
          className={`m-0 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[12px] border p-3 font-mono text-[11px] leading-[1.6] sm:text-[12px] ${c.messageBlock}`}
        >
          {phase.message}
        </pre>
        {primary('Waiting for signature…', undefined, true)}
      </>
    );
  } else if (phase.kind === 'verifying') {
    // 5
    content = (
      <>
        {existingBlock}
        <p className={`text-[13px] leading-[1.5] ${c.muted}`}>
          Signed. Checking the signature for <span className={`font-mono text-[12px] ${c.strong}`}>{shortAddress(phase.address)}</span> — this takes a moment.
        </p>
        {primary('Verifying your signature…', undefined, true)}
      </>
    );
  } else if (failure) {
    // 4, 6-12, 14
    content = (
      <>
        {existingBlock}
        {failureNode}
        {failureAction}
      </>
    );
  } else if (existing) {
    state = 'verified';
    content = (
      <>
        {existingBlock}
        <p className={`text-[14px] leading-[1.55] ${c.muted}`}>
          Payouts on Base are sent to this address. Registering a different address replaces it. A payout that has already been prepared keeps the address it was prepared with.
        </p>
        {noWallet && noWalletNode}
        {secondaryOrDisabled('Register a different address', start, noWallet)}
      </>
    );
  } else {
    // not registered, and 3 when no wallet has been found
    state = noWallet ? 'no-wallet' : 'not-registered';
    content = (
      <>
        <p className={`text-[14px] leading-[1.55] ${c.muted}`}>
          Connect an Ethereum wallet and sign one message. Signing costs no gas and moves no funds — it only proves you control the address. Any regular Ethereum wallet works, on any network.
        </p>
        {steps(1)}
        <p className={`border-l-2 border-[#c9983a] py-0.5 pl-3 text-[13px] leading-[1.5] ${c.muted}`}>
          Use a wallet you control directly, not an exchange deposit address. Smart-contract wallets such as Safe can't be verified yet.
        </p>
        {noWallet && noWalletNode}
        {primary('Connect wallet and sign', start, noWallet || busy)}
      </>
    );
  }

  return shell(
    <>
      {header(pillNode)}
      {content}
    </>,
    state,
  );

  function secondaryOrDisabled(label: string, onClick: () => void, disabled: boolean) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`min-h-[44px] self-stretch rounded-[12px] border bg-transparent px-4 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[40px] sm:self-start ${c.secondary}`}
      >
        {label}
      </button>
    );
  }
}
