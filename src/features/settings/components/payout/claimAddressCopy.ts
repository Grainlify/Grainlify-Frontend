import { format, parseISO } from 'date-fns';

/** What a claim's address situation means, and what to say about it.
 *
 *  # Why this is a module and not JSX
 *
 *  The three cases below are the most consequential sentences this product
 *  writes. Getting one wrong tells somebody their money is going to the wallet
 *  on their screen when it is locked to a previous one - the same class as the
 *  registration response silently discarding `replaced`, and worse, because
 *  there is no second chance to notice: the frozen address cannot be changed
 *  after publication by any means.
 *
 *  Separated from rendering so the wording can be asserted directly. A test
 *  that reads "does this paragraph name the frozen address" is worth having;
 *  the same test through a rendered component is not.
 *
 *  # The rule every case follows
 *
 *  Never end on the bad news. `address_status: "superseded"` is somebody being
 *  told their payout is going somewhere they may not be able to reach, and the
 *  damage is not the fact - it is the person who reads it, concludes the money
 *  is gone, and never asks. Unclaimed funds return to Grainlify rather than
 *  being destroyed and the deadline is extendable, so "contact us" is a real
 *  remedy rather than a politeness.
 */

export type ClaimAddressSituation =
  /** The frozen address is the one registered on the account today. */
  | { kind: 'current'; address: string }
  /** Frozen to an address since replaced. `currentAddress` is the live one. */
  | { kind: 'superseded'; address: string; registeredAt: string | null; currentAddress: string }
  /** Frozen to an address no longer registered, with no live address at all on
   *  this chain.
   *
   *  Named exactly as the server names it. `address_status` carries three
   *  values - current, superseded, no_live_address - and a client enum that
   *  differed from them by one word would be a translation somebody has to
   *  remember, in the one place where getting it wrong tells a person their
   *  money is going somewhere it is not. */
  | { kind: 'no_live_address'; address: string; registeredAt: string | null };

export interface ClaimAddressCopy {
  /** Drives emphasis, not wording. 'notice' is not an error - nothing has gone
   *  wrong, the money is real and claimable. */
  tone: 'neutral' | 'notice';
  headline: string;
  paragraphs: string[];
  /** Always present on the superseded cases. Kept separate so a renderer cannot
   *  drop it by rendering only the first paragraph. */
  remedy: string | null;
}

/** Enough of each end to compare against a wallet, without a 66-character
 *  string mid-sentence. */
export function shortAddress(a: string): string {
  return a.length > 20 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;
}

/** "3 July 2026".
 *
 *  date-fns rather than toLocaleDateString, whose output depends on the
 *  browser's locale - already filed twice on this codebase (#883, #798). A
 *  payout date that reads 03/07 to one person and 07/03 to another is worse
 *  here than elsewhere: it is the fact somebody uses to work out WHICH wallet
 *  this was.
 */
function registeredOn(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'd MMMM yyyy');
  } catch {
    return null;
  }
}

const REMEDY =
  'If you no longer have that wallet, contact us — this is recoverable and your reward is not lost. ' +
  'Unclaimed funds return to Grainlify rather than being destroyed, and we can arrange another way to ' +
  'get this to you. We can also extend the claim window while you recover it.';

const STILL_HAVE_IT = "If you still have that wallet, claim with it and you're done.";

export function describeClaimAddress(s: ClaimAddressSituation): ClaimAddressCopy {
  if (s.kind === 'current') {
    return {
      tone: 'neutral',
      headline: 'Paid to your registered address',
      paragraphs: [
        `This payout goes to ${shortAddress(s.address)}, the address registered on your account.`,
      ],
      remedy: null,
    };
  }

  const on = registeredOn(s.registeredAt);
  // The date is omitted rather than faked when it is absent. It is the strongest
  // cue for working out which wallet this was, so a wrong or empty one is worse
  // than a sentence without it - and the field that carries it is still landing.
  const frozen = on
    ? `This payout goes to ${shortAddress(s.address)} — the address you registered on ${on}.`
    : `This payout goes to ${shortAddress(s.address)} — an address you registered previously.`;

  if (s.kind === 'superseded') {
    return {
      tone: 'notice',
      headline: 'This payout goes to a previous address',
      paragraphs: [
        frozen,
        `It was locked to that address when the event settled, so it cannot be moved. ` +
          `Your current payout address (${shortAddress(s.currentAddress)}) will receive future ` +
          `payouts, but not this one.`,
        STILL_HAVE_IT,
      ],
      remedy: REMEDY,
    };
  }

  return {
    tone: 'notice',
    headline: 'This payout goes to an address no longer on your account',
    paragraphs: [
      frozen,
      `It was locked to that address when the event settled, so it cannot be moved. ` +
        `That address is no longer registered on your account, and you have no payout address ` +
        `for this chain right now — so registering a new one will not redirect this payout.`,
      STILL_HAVE_IT,
    ],
    remedy: REMEDY,
  };
}

/** Failures the claims screen can show that are not the person's fault.
 *
 *  Kept beside the address copy because they share its rule: never end on the
 *  bad news, and never let a state somebody did not cause read as something
 *  they did.
 */
export type ClaimLoadFailure =
  /** GetClaim found more than one leaf in one settlement paying an address
   *  registered to this account.
   *
   *  Possible because the live-address unique index is per (user, chain) rather
   *  than per address, so two accounts can hold the same address. A unique
   *  index at registration is going in to make it impossible, but rows that
   *  already violate it can exist, so this stays renderable.
   *
   *  The server refuses rather than choosing: returning either leaf would be an
   *  arbitrary decision about somebody's money. */
  | { kind: 'multiple_claims'; settlementId: string; count: number }
  /** The chain has no row in chain_configs, or a row missing required values.
   *  Ours to fix, and nothing the person can do. */
  | { kind: 'chain_not_configured' }
  | { kind: 'chain_config_incomplete' }
  /** Anything else, including an unreachable API. */
  | { kind: 'unknown' };

export interface ClaimFailureCopy {
  headline: string;
  body: string;
  /** True when the only useful next step is a human. Drives whether the screen
   *  shows a support route, which for these states it always should. */
  contactSupport: boolean;
}

export function describeClaimFailure(f: ClaimLoadFailure): ClaimFailureCopy {
  switch (f.kind) {
    case 'multiple_claims':
      return {
        headline: 'We need to check this payout before showing it',
        // Says three things, in this order, because the order is what stops
        // somebody assuming the worst: nothing is wrong with THEM, the money is
        // real, and somebody is required to act.
        body:
          'This payout matches more than one entry under your account, and we will not guess which ' +
          'one is yours — that would be an arbitrary decision about your money. ' +
          'Nothing is wrong with your account and nothing has been lost: the payout exists and is ' +
          'still yours. It needs a person to resolve which entry is correct, so please contact us ' +
          'and we will sort it out. Your claim window can be extended while we do.',
        contactSupport: true,
      };
    case 'chain_not_configured':
    case 'chain_config_incomplete':
      return {
        headline: "We can't show this payout right now",
        // Deliberately does not say "seeding" or "chain_configs". The cause is
        // ours and the name of our table is not useful to the reader; what IS
        // useful is that waiting is the wrong response.
        body:
          "Something on our side is not set up correctly for this network, so we can't show your " +
          'payout details safely. This is our problem, not yours, and your payout is unaffected. ' +
          'Please contact us — it will not fix itself while you wait, and telling us is the fastest ' +
          'way to get it looked at.',
        contactSupport: true,
      };
    default:
      return {
        headline: "We couldn't load your payouts",
        body:
          "This is a problem reading them, not a sign that you have none — anything owed to you is " +
          'unaffected. Reload to try again, and contact us if it keeps happening.',
        contactSupport: true,
      };
  }
}
