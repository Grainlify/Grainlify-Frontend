# Bounty explanations: what the dashboard keeps, what the docs take

For whoever is building `/docs`.

## What this is

The Bounties page used to carry two long explanations — "How to claim a
bounty" and "How the draw works". They are reference material, and reference
material on a dashboard is read once and scrolled past forever. They belong in
the docs.

They have not been moved yet. `/docs` now exists and carries `welcome`,
`create-your-account` and `contributors/link-solana-wallet`, but the three
bounty pages below are still unwritten, and moving text to a page nobody has
written deletes it. So the dashboard is structured for the move instead, and
the switch stays off until those pages land.

## The switch

Flip it when the three pages below exist — not when `/docs` exists, which it
already does.

`src/shared/docs/docsLinks.ts`:

```ts
export const DOCS_LIVE = false;   // flip when /docs ships
```

While it is `false`:

- the dashboard shows a short summary **and** keeps the numbered steps;
- "read more" links point at `/bounties/rules`, which is real and published
  today — it carries the live weights, the prior-completion cap and the list of
  what the draw cannot read.

Flip it to `true` and:

- the numbered steps disappear from the dashboard, leaving the summary;
- both links point at the docs.

Nothing else needs editing. `docsLinks.test.ts` pins that no `/docs/...` link
is ever rendered while the switch is off, so a half-finished move cannot ship a
404.

## The slugs I link to

Taken from `src/features/docs/nav.ts` in your working copy, not invented:

| Key | Slug | Your summary |
|---|---|---|
| `applyForABounty` | `contributors/apply-for-a-bounty` | "Apply while the window is open. The draw is weighted, not first-come." |
| `bountyRules` | `contributors/bounty-rules` | "One wallet per GitHub account, one bounty at a time, accounts 30 days or older." |
| `bountyPayment` | `contributors/bounty-payment` | "From pull request to payment." |

If you rename any of those, change `DOC_SLUGS` in the same commit — the test
asserts the exact strings, so it will tell you.

## Source material

Do not rewrite these from scratch; the wording has been through several
corrections and some of it is load-bearing.

- **The numbered steps** — `src/features/bounties/pages/BountiesProgramPage.tsx`,
  inside the `!DOCS_LIVE` block. Six steps, apply through payout.
- **How the draw works, and what it cannot see** —
  `src/features/bounties/pages/BountyRulesPage.tsx` and the `/public/rules`
  endpoint behind it. The weights are served live from the service that runs
  the draw, so the docs should **link** to that page rather than copy the
  numbers: a weight is admin-editable and a copied table goes stale silently.
- **The claim worth keeping exact** — "what the draw cannot see" (follower
  count, stars, merge rate, total pull requests, how well the application is
  written). It is true because there is no code path that reads them, and it is
  the claim contributors actually check. The wording in
  `apps/agent/src/public.ts` (`structural.neverWeighted`) is the canonical one.

## One thing to avoid

The dashboard should keep the limits people are actually caught by — one wallet
per account, one bounty at a time, 30-day accounts, no self-merges. Those are
not reference material; they are the reasons an application gets refused, and
someone reading the bounty list needs them there.
