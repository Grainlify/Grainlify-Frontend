---
updated: 2026-10-02
---

The bounty ledger is the record of the programme's money: bounties posted, the model calls the agent pays for, the checks merged pull requests go through, and payouts. Every row links to its proof, so you can check a payout without taking anyone's word for it.

![The bounty ledger](video:contributors/bounty-ledger "1:26")

## Open the ledger

On the **Bounties** page, choose **Open the ledger**. To go back to the list, choose **All bounties**.

![The bounty ledger: the header, the status banner and the totals](shot:ledger-overview "The bounty ledger")

The status banner under the header is the same one the Bounties page shows. It says whether bounties are paying on mainnet yet.

## The totals

Under **All time** there are four figures:

| Tile | What it counts |
| --- | --- |
| **Creator fees in** | GRAIN creator fees received. It reads "After launch" until fees are tracked. |
| **Inference spend** | What the agent has spent on model calls. While the agent runs against a test gateway, it shows $0.00 and says there's no real spend yet. |
| **Bounties paid** | Bounties paid on mainnet. Test payouts on devnet are counted separately underneath. |
| **Inference calls** | Model calls the agent has made, each with its own receipt. |

**Inference budget** shows what the agent has spent against each phase's allocation. The agent's inference spending has a fixed lifetime ceiling, stated on the panel, and the agent and its payment signer each stop at it on their own.

**Receipt chain · latest paid bounty** shows every event for the most recently paid bounty, oldest first, from the bounty being posted to the payout. Until the first bounty is paid, it says **No bounty has been paid yet.**

![The receipt chain for the latest paid bounty](shot:ledger-receipt-chain "Receipt chain")

## Filter the events

1. **Choose a period.** **All time**, **30 days** or **7 days**.
2. **Choose an event type.** **All**, **Bounties**, **Inference** or **Payouts**. **Bounties** covers bounties being posted and the payout checks.

   ![The ledger filtered to payouts in the last 30 days](shot:ledger-filtered "Payouts, last 30 days")

If nothing matches, the ledger says "No events in this range."

## What each row shows

Each row has a number, **Time (UTC)**, **Event**, **Detail**, **Amount** and **Proof**. Proof links open on GitHub or a Solana explorer.

| Event | What happened | Proof |
| --- | --- | --- |
| **Bounty posted** | A bounty was posted, for the amount shown. | The issue |
| **Inference** | The agent paid for a model call. Detail says what it was for and which model. While the agent runs against a test gateway, the amount reads "mock". | The payment transaction, or a quote reference with no link while it's a test |
| **Gate passed** | A merged pull request passed every payout check. | The pull request |
| **Gate refused** | A merged pull request failed a payout check, so nothing was paid for it. | The pull request |
| **Payout** | A bounty was paid. Detail names who was paid. | The transaction |

![The events table, with proof links](shot:ledger-events?desktop "Ledger events")

> [!NOTE]
> Events marked "test" belong to the devnet run: test tokens with no value, and inference against a test gateway. They never count toward real spending.

[From pull request to payment](/docs/contributors/bounty-payment) explains the payout checks behind **Gate passed** and **Gate refused**.
