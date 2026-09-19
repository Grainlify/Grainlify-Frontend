/** Solana wallets for linking a GitHub account to a payout address, for
 *  Grainlify Bounties.
 *
 *  Phantom and Solflare, because those are the two a contributor with only a
 *  phone can use: both open a web page inside their own in-app browser from a
 *  universal link, and that browser is the only place a mobile web page can
 *  ask a Solana wallet to sign. A laptop with the extension works the same way
 *  through the injected provider.
 *
 *  Nothing here sends a transaction. The only request made of the wallet is to
 *  sign one plain-text message, which proves control of the address. The
 *  agent rebuilds that message from the GitHub account that posts it, so the
 *  exact text below must match packages/gate/src/link.ts in the agent repo.
 */

export type SolanaWalletId = 'phantom' | 'solflare';

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string } | null;
  connect(): Promise<{ publicKey?: { toString(): string } } | void>;
  signMessage(message: Uint8Array, display?: 'utf8' | 'hex'): Promise<{ signature: Uint8Array } | Uint8Array>;
}

declare global {
  interface Window {
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
  }
}

/** The injected provider for a wallet, if this browser has one. */
export function findSolanaWallet(id: SolanaWalletId): SolanaProvider | null {
  if (typeof window === 'undefined') return null;
  if (id === 'phantom') return window.phantom?.solana?.isPhantom ? window.phantom.solana : null;
  return window.solflare?.isSolflare ? window.solflare : null;
}

/** The first wallet this browser offers, preferring the one we are inside. */
export function detectSolanaWallet(): SolanaWalletId | null {
  if (findSolanaWallet('phantom')) return 'phantom';
  if (findSolanaWallet('solflare')) return 'solflare';
  return null;
}

/**
 * A universal link that opens `pageUrl` inside the wallet's in-app browser.
 * On a phone with the app installed it opens the app; without it, the wallet's
 * site offers the install. Formats from each wallet's deeplink documentation.
 */
export function walletBrowseLink(id: SolanaWalletId, pageUrl: string, refOrigin: string): string {
  const url = encodeURIComponent(pageUrl);
  const ref = encodeURIComponent(refOrigin);
  return id === 'phantom'
    ? `https://phantom.app/ul/browse/${url}?ref=${ref}`
    : `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
}

/** Must stay identical to linkMessage() in the agent (packages/gate/src/link.ts). */
export function linkMessage(githubLogin: string, wallet: string, issuedAt: string): string {
  return [
    'Grainlify bounty agent: link this wallet to my GitHub account',
    `GitHub: ${githubLogin.toLowerCase()}`,
    `Wallet: ${wallet}`,
    `Issued: ${issuedAt}`,
  ].join('\n');
}

export function linkComment(wallet: string, signatureB58: string, issuedAt: string): string {
  return `/grainlify link ${wallet} ${signatureB58} ${issuedAt}`;
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

/** GitHub's own rule for a username. */
export const isGitHubLogin = (s: string) => /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(s);

export async function connectSolanaWallet(provider: SolanaProvider): Promise<string> {
  const res = await provider.connect();
  const key = (res && 'publicKey' in res ? res.publicKey : undefined) ?? provider.publicKey;
  if (!key) throw new Error('The wallet did not share an address.');
  return key.toString();
}

/** Signs the link message and returns the comment to post. The private key never leaves the wallet. */
export async function signLinkMessage(provider: SolanaProvider, githubLogin: string, wallet: string, now = new Date()) {
  const issuedAt = now.toISOString();
  const message = linkMessage(githubLogin, wallet, issuedAt);
  const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
  const sig = signed instanceof Uint8Array ? signed : signed.signature;
  return { message, comment: linkComment(wallet, base58(sig), issuedAt), issuedAt };
}
