/**
 * Where the documentation lives, in one place.
 *
 * The docs site (`/docs/*`) is being built separately. Long explanations that
 * currently sit on the dashboard belong there: "How to claim a bounty" and
 * "How the draw works" are reference material, and reference material on a
 * dashboard is read once and then scrolled past forever.
 *
 * Rather than guess at URLs, these slugs are the ones the docs navigation
 * already declares (src/features/docs/nav.ts in that work):
 *
 *   contributors/apply-for-a-bounty  "Apply while the window is open. The
 *                                     draw is weighted, not first-come."
 *   contributors/bounty-rules        "One wallet per GitHub account, one
 *                                     bounty at a time, accounts 30 days or
 *                                     older."
 *   contributors/bounty-payment      "From pull request to payment."
 *
 * DOCS_LIVE is the single switch. While it is false the dashboard keeps the
 * detail and links to /bounties/rules, which is real today. When the docs
 * route ships, flip this one constant: the dashboard drops to a summary and
 * the links point at the docs. Nothing else needs editing, and nothing links
 * to a page that does not exist yet.
 */
export const DOCS_LIVE = false;

export const DOC_SLUGS = {
  applyForABounty: '/docs/contributors/apply-for-a-bounty',
  bountyRules: '/docs/contributors/bounty-rules',
  bountyPayment: '/docs/contributors/bounty-payment',
} as const;

/** The live rules page. Real, published, and the honest fallback: it already
 *  carries the weights, the cap and what the draw cannot read. */
export const BOUNTY_RULES_PAGE = '/bounties/rules';

export type DocKey = keyof typeof DOC_SLUGS;

/** Where a "read more" should point right now. */
export function docHref(key: DocKey): string {
  return DOCS_LIVE ? DOC_SLUGS[key] : BOUNTY_RULES_PAGE;
}
