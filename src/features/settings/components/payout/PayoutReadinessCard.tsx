import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getPayoutReadiness, type PayoutReadiness } from '../../../../shared/api/client';

/** Whether this person still has something to do before a payout can reach them.
 *
 *  # Why this exists separately from the claims list
 *
 *  An empty claims list means two opposite things either side of a publication,
 *  and looks identical on both:
 *
 *    before  they can still register and be included; nothing is lost
 *    after   they are permanently excluded from that tree; their share is
 *            residue and becomes sweepable
 *
 *  A root cannot be edited, so publication converts a two-minute fix into an
 *  irreversible one, and an empty list says nothing different on either side of
 *  it. Silence cannot be the carrier of that distinction - which is what this
 *  card is for.
 *
 *  # The four states are the server's, not re-derived here
 *
 *  `state` is computed with exclusion winning over everything: somebody who has
 *  registered an address AND was excluded reads `excluded_from_published`, not
 *  `ready`. Recomputing that from `may_be_owed` and `has_verified_address`
 *  would quietly disagree with the server the first time those two are true and
 *  an exclusion exists - which is exactly the person who most needs the right
 *  message.
 */
export function PayoutReadinessCard({ chainId = 'aptos-testnet' }: { chainId?: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<PayoutReadiness | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const shell = `rounded-[16px] border p-5 ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.25] border-white/30'}`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setReadiness(await getPayoutReadiness(chainId));
    } catch {
      // A failed read is not "nothing to do". Rendering the not_applicable
      // state here would tell somebody who must register that they need not,
      // which is the one wrong answer with a deadline attached.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <p className={`text-[14px] ${muted}`}>Checking whether you need to do anything…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className={shell}>
        <p className={`text-[14px] ${muted}`}>
          Couldn't check your payout status. This doesn't change anything you've already
          registered — reload to try again, and contact us if it keeps failing.
        </p>
      </div>
    );
  }

  if (!readiness || readiness.state === 'not_applicable') {
    // Deliberately renders nothing. There is no payout owed and no action; a
    // card saying so is a permanent empty state on everybody else's settings
    // page, and it invites the reading that something was missed.
    return null;
  }

  if (readiness.state === 'excluded_from_published') {
    return (
      <div className={`${shell} border-l-2 border-l-[#c9983a]`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[#c9983a]" aria-hidden="true" />
          <div className="space-y-2">
            <p className={`text-[15px] font-semibold ${strong}`}>
              You were left out of {readiness.excluded_from.length === 1 ? 'a payout' : 'some payouts'} that has already been published
            </p>
            {/* No amount, here or anywhere. A per-person figure must not reach a
                UI, and this is the sharpest case: money that will not arrive,
                with no path to honour it. Naming a number somebody cannot have
                is worse than not naming it. */}
            <p className={`text-[13px] ${muted}`}>
              {readiness.excluded_from.some((e) => e.excluded_reason === 'no_address')
                ? 'A payout was published before you had a verified payout address, so no share could be assigned to you in it. '
                : 'A payout was published without a GitHub account linked to you, so no share could be assigned to you in it. '}
              A published payout cannot be edited, so this one cannot be corrected in place.
            </p>
            <p className={`text-[13px] ${strong}`}>
              This is worth contacting us about. It is not automatically recoverable, but it is
              not automatically lost either — please ask rather than assume.
            </p>
            {readiness.has_verified_address ? (
              <p className={`text-[13px] ${muted}`}>
                Your address is registered now, so future payouts will include you.
              </p>
            ) : (
              <p className={`text-[13px] ${strong}`}>
                Register a payout address below so this cannot happen again.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (readiness.state === 'register_now') {
    return (
      <div className={`${shell} border-l-2 border-l-[#c9983a]`}>
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 shrink-0 text-[#c9983a]" aria-hidden="true" />
          <div className="space-y-2">
            <p className={`text-[15px] font-semibold ${strong}`}>Register a payout address</p>
            {/* The deadline is real and unstated, because we do not know it: a
                settlement can be published at any time, and after it this stops
                being fixable. Saying "before the next payout is published"
                is honest where a date would not be. */}
            <p className={`text-[13px] ${muted}`}>
              You're a founding contributor, so a payout will be owed to you. It can only be
              assigned to an address that is registered when the payout is published — and a
              published payout cannot be edited afterwards.
            </p>
            <p className={`text-[13px] ${strong}`}>
              Registering takes about a minute and costs nothing. Doing it now removes the only
              way to miss one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-[#5c7038]" aria-hidden="true" />
        <div className="space-y-1">
          <p className={`text-[15px] font-semibold ${strong}`}>You're set up for payouts</p>
          {/* Says what waiting means, because "ready" with nothing beneath it
              reads as something not having worked. */}
          <p className={`text-[13px] ${muted}`}>
            Your payout address is registered. Nothing is owed to you yet — anything published
            in future will appear here, and you don't need to check back.
          </p>
        </div>
      </div>
    </div>
  );
}
