/** Browser Ethereum wallets, for registering a Base payout address.
 *
 *  Library-free on purpose: the flow needs three calls (discover, connect,
 *  personal_sign), and each one has a byte-level contract with the server that
 *  is easier to hold in forty lines than behind a wallet SDK.
 *
 *  Discovery is EIP-6963. `window.ethereum` is used only as a fail-over while no
 *  wallet has announced itself, as the EIP recommends: with several extensions
 *  installed, `window.ethereum` is whichever one won the race to inject, and
 *  connecting to it silently is how a person signs with a wallet they did not
 *  choose.
 */

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface EvmWallet {
  /** The row's identity: EIP-6963 `rdns`, or 'window.ethereum' for the
   *  fail-over. Never the name - that is display text chosen by the extension. */
  key: string;
  /** Display only. Rendered as text, never as markup. */
  name: string;
  /** A data:image URI or null. Render only through <img>: the EIP allows SVG,
   *  and SVG executes script anywhere else. */
  icon: string | null;
  rdns: string | null;
  /** True when this is the `window.ethereum` fail-over, not an announcement. */
  legacy: boolean;
  /** Two providers with different uuids announced this same rdns. We cannot
   *  tell which one the person means, so connecting is refused. */
  conflict: boolean;
  provider: Eip1193Provider;
}

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

const LEGACY_KEY = 'window.ethereum';

interface Entry {
  uuid: string;
  name: string;
  icon: string | null;
  rdns: string;
  provider: Eip1193Provider;
  conflict: boolean;
}

// Page-lifetime state. EIP-6963: the DApp MUST NOT remove its announcement
// listener for the lifetime of the page, because wallets may announce late.
const announced = new Map<string, Entry>();
const subscribers = new Set<(wallets: EvmWallet[]) => void>();
let listening = false;

function isProvider(p: unknown): p is Eip1193Provider {
  return typeof p === 'object' && p !== null && typeof (p as Eip1193Provider).request === 'function';
}

function onAnnounce(event: Event) {
  const detail = (event as CustomEvent<unknown>).detail as
    | { info?: Record<string, unknown>; provider?: unknown }
    | undefined;
  const info = detail?.info;
  if (!info || !isProvider(detail?.provider)) return;
  const { uuid, rdns, name, icon } = info;
  // No rdns, no row: it is the only identifier the EIP offers that is stable
  // and not free text.
  if (typeof uuid !== 'string' || uuid === '' || typeof rdns !== 'string' || rdns === '') return;

  const next: Entry = {
    uuid,
    rdns,
    name: typeof name === 'string' && name.trim() !== '' ? name.trim() : rdns,
    icon: typeof icon === 'string' && icon.startsWith('data:image/') ? icon : null,
    provider: detail.provider,
    conflict: false,
  };

  const prev = announced.get(rdns);
  if (prev && prev.uuid !== uuid) {
    // Sticky: once two providers have claimed this rdns, a later
    // re-announcement from either must not quietly make one of them usable.
    prev.conflict = true;
  } else if (prev) {
    // Same wallet re-announcing (it does so whenever the page asks). Keep its
    // position and conflict flag, take the fresh details.
    announced.set(rdns, { ...next, conflict: prev.conflict });
  } else {
    announced.set(rdns, next);
  }
  notify();
}

function snapshot(): EvmWallet[] {
  if (announced.size > 0) {
    return [...announced.values()].map((e) => ({
      key: e.rdns,
      name: e.name,
      icon: e.icon,
      rdns: e.rdns,
      legacy: false,
      conflict: e.conflict,
      provider: e.provider,
    }));
  }
  const legacy = typeof window === 'undefined' ? undefined : window.ethereum;
  if (isProvider(legacy)) {
    return [{ key: LEGACY_KEY, name: 'Browser wallet', icon: null, rdns: null, legacy: true, conflict: false, provider: legacy }];
  }
  return [];
}

function notify() {
  const wallets = snapshot();
  subscribers.forEach((fn) => fn(wallets));
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  // Injected late by some wallets that do not implement EIP-6963.
  window.addEventListener('ethereum#initialized', notify);
}

/** Calls `onChange` with the current wallets now and whenever one announces.
 *
 *  There is no "discovery finished": the list can grow at any time, which is
 *  why the picker is shown even for a single wallet (see the design canvas,
 *  Base card state 15). Returns an unsubscribe; the underlying listener stays
 *  for the page's lifetime. */
export function watchEvmWallets(onChange: (wallets: EvmWallet[]) => void): () => void {
  listen();
  subscribers.add(onChange);
  onChange(snapshot());
  // Ask every wallet to (re-)announce. Listeners run synchronously inside
  // dispatchEvent, so already-loaded wallets are in the list before this returns.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('eip6963:requestProvider'));
  return () => {
    subscribers.delete(onChange);
  };
}

/** The wallet rejected the request (EIP-1193 4001). */
export class WalletDeclinedError extends Error {
  constructor() {
    super('The request was declined in the wallet');
    this.name = 'WalletDeclinedError';
  }
}

/** A request is already open in the wallet (-32002). Asking again does nothing
 *  until the person deals with the open one, so the answer is "check your
 *  wallet", not "try again". */
export class WalletRequestPendingError extends Error {
  constructor() {
    super('A request is already open in the wallet');
    this.name = 'WalletRequestPendingError';
  }
}

/** See EvmWallet.conflict. */
export class WalletConflictError extends Error {
  constructor(rdns: string) {
    super(`Two installed extensions both announce ${rdns}`);
    this.name = 'WalletConflictError';
  }
}

function mapError(err: unknown): unknown {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === 4001) return new WalletDeclinedError();
  if (code === -32002) return new WalletRequestPendingError();
  return err;
}

async function request(wallet: EvmWallet, method: string, params: unknown[]): Promise<unknown> {
  if (wallet.conflict) throw new WalletConflictError(wallet.rdns ?? wallet.key);
  try {
    return await wallet.provider.request({ method, params });
  } catch (err) {
    throw mapError(err);
  }
}

/** Asks the chosen wallet for its account. The address is returned as the
 *  wallet gave it: the server canonicalises to EIP-55 either way. */
export async function connectEvmWallet(wallet: EvmWallet): Promise<string> {
  const accounts = await request(wallet, 'eth_requestAccounts', []);
  const first = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof first !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(first)) {
    throw new Error('The wallet returned no usable account.');
  }
  return first;
}

/** 0x + hex of the message's UTF-8 bytes. */
export function toHexUtf8(message: string): string {
  let hex = '0x';
  for (const b of new TextEncoder().encode(message)) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** Signs the challenge's `message` field exactly as issued.
 *
 *  The server rebuilds the message and recovers against its EIP-191 digest
 *  (Grainlify-Backend internal/handlers/payout_address_evm_encoding_test.go
 *  pins that contract). So:
 *  - `message` is never rebuilt, trimmed or re-lined here: a CRLF or trailing
 *    newline is a valid signature over bytes the server never reconstructs.
 *  - It goes as hex UTF-8, so no wallet has to guess whether a string is text
 *    or hex.
 *  - The signature comes back untouched, 0x included; the server's decoder
 *    requires the prefix.
 */
export async function signEvmChallenge(wallet: EvmWallet, message: string, address: string): Promise<string> {
  const signature = await request(wallet, 'personal_sign', [toHexUtf8(message), address]);
  if (typeof signature !== 'string' || signature === '') {
    throw new Error('The wallet returned no signature.');
  }
  return signature;
}

/** Test-only: forget every announcement. */
export function __resetEvmWalletsForTest() {
  announced.clear();
  subscribers.clear();
}
