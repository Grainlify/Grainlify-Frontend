/** Solana wallets for Grainlify Bounties: find them, connect, sign one message.
 *
 *  Built on the Wallet Standard, which is how Phantom, Solflare, Backpack and
 *  the rest announce themselves to a page. Wallets register with an event
 *  whenever their script runs, so one that injects after the page has loaded
 *  still shows up; the hand-rolled version looked at window.solflare once, on
 *  first render, and measurably missed wallets that arrived milliseconds later.
 *
 *  What actually broke Solflare, measured with the extension: its injected
 *  provider's connect() resolves to a BOOLEAN, and the old code then ran
 *  `'publicKey' in res` on it, which throws for a non-object - so connecting
 *  failed every time, approved or not. Nothing here reads a provider's shape:
 *  standard:connect returns accounts, and that is what we use.
 *
 *  On Android the Mobile Wallet Adapter registers as one more wallet: it signs
 *  with a wallet app installed on the phone without leaving the browser. iOS
 *  has no equivalent, so there the page opens itself inside the wallet app's
 *  own browser through the wallet's universal link.
 *
 *  Only this module talks to wallets, and only the link page imports it, so
 *  none of this reaches any other page's bundle. Nothing here sends a
 *  transaction: the only request made of a wallet is to sign one plain-text
 *  message, which the wallet shows the person in full.
 */

import { getWallets } from '@wallet-standard/app';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import {
  SolanaSignMessage,
  type SolanaSignMessageFeature,
} from '@solana/wallet-standard-features';

const STANDARD_CONNECT = 'standard:connect';
type ConnectFeature = {
  [STANDARD_CONNECT]: { connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }> };
};

export interface SolanaWallet {
  name: string;
  icon: string;
  /** True for the Mobile Wallet Adapter on Android. */
  mobileAdapter: boolean;
  raw: Wallet;
}

export const MWA_NAME = 'Mobile Wallet Adapter';

/** A wallet we can use: it connects, signs messages, and speaks Solana. */
function usable(w: Wallet): boolean {
  return (
    STANDARD_CONNECT in w.features &&
    SolanaSignMessage in w.features &&
    w.chains.some((c) => c.startsWith('solana:'))
  );
}

function toSolanaWallet(w: Wallet): SolanaWallet {
  return { name: w.name, icon: w.icon, mobileAdapter: w.name === MWA_NAME, raw: w };
}

/** The wallets registered so far, and a subscription for any that register later.
 *
 *  Deduplicated by name: Phantom registers twice (observed with the extension,
 *  which announces a standard wallet and a compatibility shim), and one wallet
 *  listed twice reads as a fault in the page. */
export function watchSolanaWallets(onChange: (wallets: SolanaWallet[]) => void): () => void {
  const api = getWallets();
  const emit = () => {
    const byName = new Map<string, SolanaWallet>();
    for (const w of api.get().filter(usable).map(toSolanaWallet)) if (!byName.has(w.name)) byName.set(w.name, w);
    onChange([...byName.values()]);
  };
  emit();
  const offRegister = api.on('register', emit);
  const offUnregister = api.on('unregister', emit);
  return () => {
    offRegister();
    offUnregister();
  };
}

let mwaRegistered = false;
/** Registers the Mobile Wallet Adapter on Android only; a no-op anywhere else. */
export async function registerMobileWalletAdapter(origin: string): Promise<void> {
  if (mwaRegistered || typeof navigator === 'undefined' || !/android/i.test(navigator.userAgent)) return;
  mwaRegistered = true;
  const m = await import('@solana-mobile/wallet-standard-mobile');
  m.registerMwa({
    appIdentity: { name: 'Grainlify', uri: origin, icon: 'favicon.svg' },
    authorizationCache: m.createDefaultAuthorizationCache(),
    chains: ['solana:mainnet', 'solana:devnet'],
    chainSelector: m.createDefaultChainSelector(),
    onWalletNotFound: m.createDefaultWalletNotFoundHandler(),
  });
}

/** Asks the wallet for an account. Throws WalletRejectedError if the person says no. */
export async function connectWallet(wallet: SolanaWallet): Promise<WalletAccount> {
  try {
    const { accounts } = await (wallet.raw.features as unknown as ConnectFeature)[STANDARD_CONNECT].connect();
    const account = accounts.find((a) => a.chains.some((c) => c.startsWith('solana:'))) ?? accounts[0];
    if (!account) throw new Error(`${wallet.name} did not share an address.`);
    return account;
  } catch (e) {
    throw asRejection(e, wallet.name);
  }
}

/** Signs the exact text, as UTF-8. Returns the 64-byte signature. */
export async function signText(wallet: SolanaWallet, account: WalletAccount, text: string): Promise<Uint8Array> {
  const feature = (wallet.raw.features as unknown as SolanaSignMessageFeature)[SolanaSignMessage];
  try {
    const [out] = await feature.signMessage({ account, message: new TextEncoder().encode(text) });
    if (!out?.signature || out.signature.length !== 64) throw new Error(`${wallet.name} returned no signature.`);
    return out.signature;
  } catch (e) {
    throw asRejection(e, wallet.name);
  }
}

/** The person declined in their wallet: a normal outcome, shown as such. */
export class WalletRejectedError extends Error {
  constructor(public readonly walletName: string) {
    super(`You declined the request in ${walletName}, so nothing was linked.`);
    this.name = 'WalletRejectedError';
  }
}

// Wallets report "the user said no" as EIP-1193's 4001, as a message, or both.
function asRejection(e: unknown, walletName: string): unknown {
  const err = e as { code?: number; message?: string; name?: string } | null;
  if (err?.code === 4001 || /reject|declin|denied|cancel/i.test(`${err?.name ?? ''} ${err?.message ?? ''}`)) {
    return new WalletRejectedError(walletName);
  }
  return e;
}

/** Wallets we list with an install link when this browser does not have them. */
export const KNOWN_WALLETS: { name: string; icon: string; install: string }[] = [
  { name: 'Phantom', icon: '/wallets/phantom.svg', install: 'https://phantom.com/download' },
  { name: 'Solflare', icon: '/wallets/solflare.svg', install: 'https://solflare.com/download' },
  { name: 'Backpack', icon: '/wallets/backpack.png', install: 'https://backpack.app/download' },
];

export type PhoneOs = 'ios' | 'android' | null;
export function phoneOs(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): PhoneOs {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return null;
}

/**
 * A universal link that opens `pageUrl` inside the wallet's in-app browser.
 * On a phone with the app installed it opens the app; without it, the wallet's
 * site offers the install. Formats from each wallet's deeplink documentation.
 * On a computer these links lead to the wallet's website, not the extension,
 * so they are only offered on phones.
 */
export function walletBrowseLink(wallet: 'Phantom' | 'Solflare', pageUrl: string, refOrigin: string): string {
  const url = encodeURIComponent(pageUrl);
  const ref = encodeURIComponent(refOrigin);
  return wallet === 'Phantom'
    ? `https://phantom.app/ul/browse/${url}?ref=${ref}`
    : `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
}
