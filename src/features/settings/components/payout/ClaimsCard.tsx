import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getClaims, type PayoutClaim } from '../../../../shared/api/client';
import {
  describeClaimAddress,
  describeClaimFailure,
  shortAddress,
  type ClaimAddressSituation,
  type ClaimLoadFailure,
} from './claimAddressCopy';

/** Published payouts a contributor can act on.
 *
 *  # The Claim button is always shown, and that is the specified behaviour
 *
 *  Whether a claim has already been taken lives on chain. There is deliberately
 *  no server-side `claimed_at`: a cached copy of on-chain state is a reconciler
 *  and a staleness window, and building one on the money path repeats a problem
 *  already removed from the verification path.
 *
 *  Reading the chain from the browser is not possible today - see the note in
 *  the PR - so nothing here consults it. That is not a shortcut, because the
 *  specified behaviour when the read fails is to SHOW the button anyway:
 *
 *    - a double claim is rejected by the contract, and gas is sponsored, so a
 *      wrong "Claim" costs a clear error message
 *    - a wrong "Claimed" costs money that looks collected and is not
 *
 *  Refuse only on evidence. An absent read is not evidence of a claim, so the
 *  button shows. When the read exists it may only ever REMOVE the button, never
 *  add one.
 */
export function ClaimsCard() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<PayoutClaim[]>([]);
  const [failure, setFailure] = useState<ClaimLoadFailure | null>(null);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const shell = `rounded-[16px] border p-5 ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30'}`;

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const res = await getClaims();
      setClaims(res.claims ?? []);
    } catch (e) {
      // Classified from the error NAME only. The server sends a human `detail`
      // alongside it, and matching on that would be parsing prose for control
      // flow - prose being the thing most likely to be reworded by somebody
      // improving an error message.
      const raw = e instanceof Error ? e.message : String(e);
      if (/multiple_claims_for_settlement/.test(raw)) {
        setFailure({ kind: 'multiple_claims', settlementId: '', count: 0 });
      } else {
        setFailure({ kind: 'unknown' });
      }
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <p className={`text-[14px] ${muted}`}>Loading your payouts…</p>
      </div>
    );
  }

  if (failure) {
    const copy = describeClaimFailure(failure);
    return (
      <div className={`${shell} border-l-2 border-l-[#c9983a]`}>
        <p className={`text-[15px] font-semibold ${strong}`}>{copy.headline}</p>
        <p className={`text-[13px] mt-2 ${muted}`}>{copy.body}</p>
      </div>
    );
  }

  // Nothing rendered when there is nothing published. The readiness card above
  // is what distinguishes "nothing yet" from "you were left out", because an
  // empty list means opposite things either side of a publication and looks
  // identical on both.
  if (claims.length === 0) return null;

  return (
    <div className="space-y-3">
      {claims.map((c) => (
        <ClaimRow key={`${c.settlement_id}:${c.claim_address}`} claim={c} dark={dark} />
      ))}
    </div>
  );
}

function situationFor(c: PayoutClaim): ClaimAddressSituation {
  if (c.address_status === 'current') return { kind: 'current', address: c.claim_address };
  if (c.address_status === 'superseded') {
    return {
      kind: 'superseded',
      address: c.claim_address,
      registeredAt: c.claim_address_verified_at,
      // The server sets current_address whenever a live one exists, so this
      // fallback is unreachable through the documented shapes. Kept because the
      // alternative is a non-null assertion that would render "undefined" into
      // a sentence about somebody's money if it ever were.
      currentAddress: c.current_address ?? c.claim_address,
    };
  }
  return {
    kind: 'no_live_address',
    address: c.claim_address,
    registeredAt: c.claim_address_verified_at,
  };
}

function explorerLink(template: string, tx: string): string | null {
  // The seeded template carries a single %s. Anything else is a template we do
  // not understand, and guessing where the hash goes would produce a link to
  // the wrong place - worse than no link.
  if (!template.includes('%s')) return null;
  return template.replace('%s', encodeURIComponent(tx));
}

function ClaimRow({ claim, dark }: { claim: PayoutClaim; dark: boolean }) {
  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const shell = `rounded-[16px] border p-5 ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30'}`;
  const copy = describeClaimAddress(situationFor(claim));
  const href = explorerLink(claim.explorer_url_template, claim.published_tx);

  return (
    <div className={`${shell} ${copy.tone === 'notice' ? 'border-l-2 border-l-[#c9983a]' : ''}`}>
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        {/* `amount` is rendered verbatim. It is pre-formatted by the server so
            the client never divides, and amount_minor is a string precisely so
            nobody parses it into a float64 and rounds somebody's payout. */}
        <p className={`text-[22px] font-semibold ${strong}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {claim.amount} <span className="text-[14px] font-normal">{claim.asset.symbol}</span>
        </p>
        <p className={`text-[12px] ${muted}`}>{claim.network}</p>
      </div>

      <p className={`text-[14px] font-semibold mt-3 ${strong}`}>{copy.headline}</p>
      {copy.paragraphs.map((p) => (
        <p key={p} className={`text-[13px] mt-1.5 ${muted}`}>{p}</p>
      ))}
      {copy.remedy && (
        <p className={`text-[13px] mt-2 ${strong}`}>{copy.remedy}</p>
      )}

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button
          type="button"
          className="px-6 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10"
        >
          Claim {claim.amount} {claim.asset.symbol}
        </button>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[12px] inline-flex items-center gap-1 ${muted} hover:underline`}
          >
            View the published payout <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Permanence sits BELOW the button, not above it: it informs rather
          than blocks. Somebody who has decided to claim should not have to read
          past a warning to do it, and somebody who has not decided yet is still
          reading.

          It does not promise the link can be removed afterwards. It cannot be -
          the transaction is on a ledger nobody can edit - and silence there
          would mislead by omission, which is worse than the sentence. */}
      <p className={`text-[12px] mt-4 ${muted}`}>
        Claiming publishes a transaction from your wallet to the payout contract.
        That transaction is public and permanent — anyone can see that this address
        claimed from Grainlify.
      </p>

      {/* ── REMOVE WHEN Grainlify-Backend#536 SHIPS ────────────────────────────
          True today and false the day a fee payer is deployed.

          Milestone 1's sponsored claim was real, but its fee payer was a local
          script reading a key from a gitignored config - nothing deployed
          builds, signs or submits a transaction, so the claimant pays. When #536
          lands, DELETE this paragraph; do not edit it into "we cover the network
          cost", because that sentence has its own home in the claim flow spec
          and its own removal condition there.

          The condition is written beside the copy on purpose. A sentence that is
          true now and false later needs its expiry attached to it, or it
          outlives the state it describes - which is how the fee promise in
          WALLET-SUPPORT.md came to be read as current.
          ─────────────────────────────────────────────────────────────────── */}
      <p className={`text-[12px] mt-2 ${muted}`}>
        You'll pay a small network fee in APT from this wallet. The first claim
        costs a little more than later ones, because it sets your wallet up to hold
        USDC.
      </p>

      <p className={`text-[11px] mt-3 ${muted}`}>
        Paid from {shortAddress(claim.escrow_address)} · settlement {claim.settlement_id.slice(0, 8)}
      </p>
    </div>
  );
}
