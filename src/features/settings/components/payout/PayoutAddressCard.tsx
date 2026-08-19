import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  getPayoutAddress,
  createPayoutAddressChallenge,
  registerPayoutAddress,
  type PayoutAddress,
} from '../../../../shared/api/client';
import { connectPetra, signChallenge, isPetraInstalled, NoWalletError } from '../../../../shared/wallet/petra';

/** Where a contributor tells us the address to pay.
 *
 *  # Why this sits at the top level of settings
 *
 *  Deliberately not inside a billing profile. Billing profiles live only in
 *  this browser's localStorage, so anything behind one is invisible on a second
 *  device - which is already a live defect for KYC state. An address is the one
 *  thing a payout cannot proceed without, so it must be reachable from any
 *  browser the person happens to be using.
 *
 *  # Why this is the slow step
 *
 *  Every other part of an event is us waiting on our own machinery. This one
 *  waits on a person installing a wallet, funding nothing, switching network and
 *  approving a signature - and they cannot begin until this screen exists. That
 *  is why the states below are enumerated rather than collapsed into a spinner
 *  and an error toast: each one has a different next action, and "something went
 *  wrong" costs a round trip through a support channel.
 */
export function PayoutAddressCard({ chainId = 'aptos-testnet' }: { chainId?: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<PayoutAddress | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState<{ claimed: string; derived: string } | null>(null);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const shell = `rounded-[16px] border p-5 ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30'}`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setExisting(await getPayoutAddress(chainId));
    } catch {
      // A failed load is not "no address". Showing the registration form here
      // would invite somebody to register an address they already have, and the
      // server would answer 409 for a reason they never saw.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  const register = async () => {
    setBusy(true);
    setMismatch(null);
    try {
      const account = await connectPetra();
      const challenge = await createPayoutAddressChallenge(chainId, account.address);
      // Signed exactly as issued. The server recomposes the AIP-62 wrapper from
      // the message and nonce it gave us, so anything altered here signs a
      // string it will never rebuild.
      const { signature } = await signChallenge(challenge.message, challenge.nonce);
      const saved = await registerPayoutAddress({
        chainId,
        address: account.address,
        publicKey: account.publicKey,
        signature,
        nonce: challenge.nonce,
      });
      setExisting(saved);
      toast.success('Payout address verified.');
    } catch (e) {
      handleRegisterError(e, setMismatch);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className={shell}><p className={`text-[14px] ${muted}`}>Checking your payout address…</p></div>;
  }

  if (loadFailed) {
    return (
      <div className={shell}>
        <p className={`text-[14px] ${muted}`}>
          Couldn't check your payout address. This doesn't affect one you've already
          registered — reload to try again.
        </p>
      </div>
    );
  }

  if (!isPetraInstalled() && !existing) {
    return (
      <div className={shell}>
        <p className={`text-[15px] font-bold mb-1.5 ${strong}`}>A wallet is needed to receive payouts</p>
        <p className={`text-[14px] ${muted}`}>
          Payouts are claimed from your own wallet, so we need an address you control.{' '}
          <a href="https://petra.app/" target="_blank" rel="noreferrer" className="underline">Petra</a>{' '}
          is the wallet we've tested this end to end with — others that support the
          Aptos signing standard should work, but that one is the one we've proven.
        </p>
        <p className={`text-[13px] mt-2 ${muted}`}>Install it, then reload this page.</p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <p className={`text-[15px] font-bold mb-1.5 ${strong}`}>
        {existing ? 'Payout address verified' : 'Register your payout address'}
      </p>

      {existing ? (
        <>
          <p className={`text-[13px] font-mono break-all ${strong}`}>{existing.address}</p>
          <p className={`text-[13px] mt-1 ${muted}`}>
            Verified {new Date(existing.verified_at).toLocaleDateString()} · {existing.chain_id}
          </p>
          <p className={`text-[13px] mt-2 ${muted}`}>
            Payouts for this chain go here. Registering a different address replaces
            this one; nothing already claimed is affected.
          </p>
        </>
      ) : (
        <p className={`text-[14px] ${muted}`}>
          Connect your wallet and sign one message. It costs no gas and moves no
          funds — the signature only proves you control the address.
        </p>
      )}

      {mismatch && (
        <div className={`mt-3 rounded-[12px] border p-3 ${dark ? 'border-[#c9983a]/30 bg-[#c9983a]/[0.08]' : 'border-[#c9983a]/35 bg-[#c9983a]/[0.10]'}`}>
          <p className={`text-[13px] font-semibold ${strong}`}>That signature came from a different address.</p>
          <p className={`text-[13px] mt-1 ${muted}`}>
            Nothing has been saved. Your wallet is currently on{' '}
            <span className="font-mono break-all">{mismatch.derived}</span>, but the
            request named <span className="font-mono break-all">{mismatch.claimed}</span>.
            Switch accounts in your wallet and try again.
          </p>
        </div>
      )}

      <button
        onClick={register}
        disabled={busy}
        className="mt-3 px-4 py-2 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10 disabled:opacity-60"
      >
        {busy ? 'Waiting for your wallet…' : existing ? 'Register a different address' : 'Connect wallet and verify'}
      </button>
    </div>
  );
}

/** Turns a failure into the one sentence that names the next action.
 *
 *  Exported for tests: these branches are the whole point of the component, and
 *  the alternative to testing them is discovering in an event that everybody who
 *  hit a stale nonce was told "something went wrong".
 */
export function handleRegisterError(
  e: unknown,
  setMismatch: (m: { claimed: string; derived: string } | null) => void,
): string {
  if (e instanceof NoWalletError) {
    const m = 'No wallet detected. Install Petra, then reload this page.';
    toast.error(m);
    return m;
  }
  const raw = e instanceof Error ? e.message : String(e);

  // The server returns the address it derived from the signing key alongside
  // the one that was claimed. Showing both is what makes this fixable without
  // a support round trip - "signature invalid" would not be.
  const claimed = raw.match(/"claimed"\s*:\s*"([^"]+)"/)?.[1];
  const derived = raw.match(/"derived"\s*:\s*"([^"]+)"/)?.[1];
  if (claimed && derived) {
    setMismatch({ claimed, derived });
    return 'address mismatch';
  }

  const known: [RegExp, string][] = [
    [/address_unchanged/, 'That address is already registered for this chain.'],
    [/nonce_expired|expired/, 'The signing request expired. Try again — it only lasts ten minutes.'],
    [/nonce_used|already_used/, 'That signing request was already used. Start again.'],
    [/unsupported_scheme/, 'That wallet uses a signing scheme we cannot verify yet. Petra is the one we have tested.'],
    [/signature_invalid/, "The signature didn't verify. Make sure you approved the exact request your wallet showed."],
    [/User rejected|rejected the request|denied/i, 'You declined the signature in your wallet. Nothing was saved.'],
  ];
  for (const [re, msg] of known) {
    if (re.test(raw)) {
      toast.error(msg);
      return msg;
    }
  }
  toast.error('Could not verify that address. Nothing has been saved.');
  return 'unknown';
}
