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
  const res = await p.signMessage({ message, nonce });
  // Some builds return an array of signatures for multi-key accounts. A single
  // key is the only shape the backend verifies today, so take the first and let
  // the server reject anything it cannot check rather than guessing here.
  const signature = Array.isArray(res.signature) ? res.signature[0] : res.signature;
  return { signature, fullMessage: res.fullMessage };
}
