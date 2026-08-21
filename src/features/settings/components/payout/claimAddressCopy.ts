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
   *  this chain. Reachable: claimsFor sets address_status from whether a LIVE
   *  address matches, so a user with no live row for the chain lands here with
   *  current_address null. */
  | { kind: 'superseded-no-current'; address: string; registeredAt: string | null };

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
