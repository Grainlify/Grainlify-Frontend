---
updated: 2026-09-27
---

The Founding Contributor Pool is a fixed amount of USDC that Grainlify shares out among early contributors who qualify. You earn shares from merged work in GrainHack, from referrals and from verifying your identity, and your wave multiplies them. This page covers how shares are earned, how waves work, who is eligible, and the position card in Settings.

## How the pool is divided

When the pool is shared out, each eligible member's shares are multiplied by their wave's multiplier, and the pool is divided in proportion:

```
share value = the pool ÷ every eligible member's multiplied shares
your payout = your multiplied shares × share value
```

Three things follow from that:

- **The total never grows.** However many people take part, the pool is the amount that was set.
- **Nobody knows a share's value in advance, Grainlify included.** It depends on everyone else's shares. That's why the app shows your position, never an amount.
- **More members means a smaller share each.** That's what dividing a fixed pool means.

Members who aren't eligible when the pool is shared out receive nothing and aren't counted in the division, so their shares don't shrink anyone else's.

## How shares are earned

| What happens | Shares |
| --- | --- |
| A pull request of yours is merged in a GrainHack event, and its final result accepts it | For each pull request, no cap |
| Someone you [referred](/docs/contributors/referrals) gets a pull request merged and accepted in a GrainHack event | For each pull request, no cap |
| You verify your identity | Once |
| Someone you referred verifies their identity | For each referral, up to a lifetime cap |

The number of shares for each is a setting, and so is the size of the pool. The live values are in **My GrainHack → Rules**, under **Founding pool**.

> [!NOTE]
> Shares for a merged pull request are recorded after the event's appeals close, not when it merges. Two things must both be true: the pull request was merged, and its final result, after any appeal, accepted it.

## Waves

Your place in the pool has a number and a wave. Places are given out in order, at the moment you complete the second of two steps: verifying your identity, and getting your [social follow](/docs/contributors/social-follow) approved. It doesn't matter which you do first.

| Wave | On your card |
| --- | --- |
| Founding | **Founding member** |
| Wave 2 | **Early member** |
| Open | **Open wave** |

Each wave has its own multiplier, shown on your card. Once the first two waves are full, later members join the open wave. The number of places in each wave and the multipliers were fixed when the first member joined, and can't be changed afterwards. They're published under **Founding pool** in **My GrainHack → Rules**.

Your wave and number are permanent. The multiplier applies to your whole share total, so it's worth nothing without shares.

## Who is eligible

To receive a share you need all of these:

- **An approved social follow** that hasn't been withdrawn when the pool is shared out. It earns no shares by itself. The check reads whether your approval is still in place. It isn't a live check that you still follow.
- **A verified identity.** You need it to get a place, and it must still be verified when the payout is published.
- **A registered payout address** when the payout is published. See [Register your payout address](/docs/contributors/payout-address) and [Payout readiness](/docs/contributors/payout-readiness).

> [!NOTE]
> At most 300 follow proofs can be approved at any one time. Once that many are approved, further submissions can't be approved.

## Your position card

Your position is the first card in **Settings → Rewards**.

![The position card for an eligible Founding member](shot:rewards-position-eligible "Settings → Rewards")

| The card shows | What it means |
| --- | --- |
| Your wave, number and multiplier, and that your follow proof is approved | You hold a place and you're eligible. |
| Your wave, number and multiplier, with **You're not currently eligible to receive a share.** | You hold a place, but your follow proof is missing, still being reviewed, rejected or withdrawn. Your place and multiplier aren't affected. Sort out the follow proof on the card below. |
| **Approved · no position yet** | Your follow proof is approved. You get a place when you verify your identity. |
| **Not in the Founding Contributor Pool yet** | You haven't finished either step. Whichever you finish second is when you get a place. |

![The position card for a member whose follow proof isn't approved](shot:rewards-position-not-eligible "Holding a place without an approved follow")

The live pool settings, published in the app:

![The Founding pool section of the GrainHack rules](shot:rules-founding-pool "My GrainHack → Rules")
