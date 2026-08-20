/** Petra, and only Petra.
 *
 *  Not because other Aptos wallets cannot work - the flow is AIP-62 and several
 *  implement it - but because Petra is the one a sponsored USDC claim has
 *  actually been settled through on testnet, end to end. Naming it as "the
 *  wallet we have tested" is honest; listing four and hoping is not, and the
 *  person who picks the untested one finds out at the moment they are trying to
 *  get paid.
 */

export interface PetraAccount {
  address: string;
  publicKey: string;
}

export interface PetraSignature {
  signature: string;
  /** Petra's own wrapped string. Sent nowhere: the server recomposes the
   *  wrapper from the message and nonce it issued, so trusting the client's
   *  version would let a caller choose what was signed. Kept only because
   *  seeing it is the fastest way to debug a rejected signature. */
  fullMessage?: string;
}

interface PetraProvider {
  connect(): Promise<{ address: string; publicKey: string }>;
  account(): Promise<{ address: string; publicKey: string }>;
  signMessage(input: { message: string; nonce: string }): Promise<{
    signature: string | string[];
    fullMessage?: string;
  }>;
  isConnected?(): Promise<boolean>;
}

declare global {
  interface Window {
    aptos?: PetraProvider;
    petra?: PetraProvider;
  }
}

/** ErrNoWallet is separated from every other failure because it is the only one
 *  with an install step as its answer, and telling somebody to "try again" when
 *  they have no wallet is the least useful thing this can say. */
export class NoWalletError extends Error {
  constructor() {
    super('No Aptos wallet detected');
    this.name = 'NoWalletError';
  }
}

/** A multi-key account, which this flow does not support.
 *
 *  Refused here rather than left to the server, even though the server refuses
 *  it correctly. Sending the first of several signatures verifies only if that
 *  signature happens to belong to the connected account's single key; otherwise
 *  the backend answers `unsupported_scheme` or `signature_address_mismatch`.
 *
 *  That is a correct rejection that SOUNDS like a bug. A contributor reads
 *  "that signature came from a different address" about the address they are
 *  looking at, and concludes their wallet is broken. A refusal we wrote can say
 *  what is actually true - the account shape is unsupported - and it is the one
 *  Petra path the harness never exercised, so it is the one most likely to be
 *  met cold.
 */
export class MultiKeyUnsupportedError extends Error {
  constructor() {
    super('Multi-key Aptos accounts are not supported');
    this.name = 'MultiKeyUnsupportedError';
  }
}

export function petraProvider(): PetraProvider | null {
  if (typeof window === 'undefined') return null;
  return window.petra ?? window.aptos ?? null;
}

export function isPetraInstalled(): boolean {
  return petraProvider() !== null;
}

export async function connectPetra(): Promise<PetraAccount> {
  const p = petraProvider();
  if (!p) throw new NoWalletError();
  const res = await p.connect();
  return { address: res.address, publicKey: res.publicKey };
}

/** Signs the challenge exactly as issued.
 *
 *  `message` and `nonce` go through untouched. The server rebuilds
 *  `APTOS\nmessage: <message>\nnonce: <nonce>` and verifies against that, so
 *  any edit here - trimming, re-casing, appending a newline - produces a valid
 *  signature over a string the server will never reconstruct, and the error it
 *  returns is an unhelpful `signature_invalid`.
 */
export async function signChallenge(message: string, nonce: string): Promise<PetraSignature> {
  const p = petraProvider();
  if (!p) throw new NoWalletError();
  // No optional flags. Petra adds a line to the signed envelope for each of
  // address, application and chainId, and the server rebuilds the envelope from
  // the message and nonce it issued - it cannot rebuild a line it did not ask
  // for. Passing one produces a valid signature over bytes the server will
  // never reconstruct.
  const res = await p.signMessage({ message, nonce });

  // A multi-key account returns several signatures. Taking the first is only
  // correct when it belongs to the connected account's single key, so refuse
  // rather than send one and hope - see MultiKeyUnsupportedError.
  const raw = res.signature;
  if (Array.isArray(raw)) {
    if (raw.length > 1) throw new MultiKeyUnsupportedError();
    if (raw.length === 0) throw new Error('The wallet returned no signature.');
  }
  const signature = Array.isArray(raw) ? raw[0] : raw;
  return { signature, fullMessage: res.fullMessage };
}
