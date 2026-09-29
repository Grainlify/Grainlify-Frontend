---
updated: 2026-09-27
---

Grainlify Bounties pay a fixed amount for fixing a specific issue on an open-source repository. This page explains where bounties come from, who pays for them, and how to read the **Bounties** page. When you're ready to take one, go to [Apply for a bounty](/docs/contributors/apply-for-a-bounty).

## Where bounties come from

The Grainlify bounty agent posts bounties on issues in repositories that are listed for bounties. A repository is listed when it's a verified Grainlify project with the Grainlify GitHub App installed, and bounties have been switched on for it.

- **The agent** prices each issue, posts the bounty, and reviews the pull request that comes in. Its review is advice only.
- **A maintainer** of the repository decides whether to merge.
- **A person** approves every payout before it's sent. The agent can't approve one.

Bounties are funded by creator fees from the GRAIN token. They're paid on Solana, in USDC or $ANSEM, to the wallet [linked to your GitHub account](/docs/contributors/link-solana-wallet). What the agent spends and every payout it makes are recorded on [the bounty ledger](/docs/contributors/bounty-ledger), each with a link to its proof.

## Not first come, first served

A bounty is assigned by a weighted draw before anyone writes code. You apply while its window is open, one applicant is drawn when it closes, and only that person's pull request can be paid. Applying early gives you no advantage. [Apply for a bounty](/docs/contributors/apply-for-a-bounty) explains the draw.

## Read the Bounties page

Choose **Bounties** in the rail.

![The Bounties page: the status banner, the wallet card, and the list of open bounties](shot:bounties-overview "Bounties")

From the top:

- **The status banner** says what state the programme is in right now. It comes from the service that runs the programme, so it changes when the state does. Trust it over anything else you read, this page included. Until the first mainnet payout settles, it says so. If the bounty agent can't be reached, it says **Status unavailable** rather than guessing.
- **Your wallet.** **Wallet linked** with your address, or **No wallet linked** with a **Link your wallet** button. You need a linked wallet to apply.
- **Open the ledger** opens [the bounty ledger](/docs/contributors/bounty-ledger).
- **Open bounties.** Each row shows the issue, its status, the repository and issue number, the amount, and **View issue**, which opens the issue on GitHub.
- **Paid.** Bounties already paid, with who was paid and a **transaction** link.
- **How to claim a bounty.** A short summary, with links to the rules.

![The status banner at the top of the Bounties page](shot:bounties-status-banner "The status banner")

## Bounty statuses

| Status | What it means |
| --- | --- |
| **Open** | Posted. If its application window is open, you can apply. |
| **PR in review** | A pull request that closes the issue has been opened, and the agent reviews it. |
| **Awaiting approval** | The pull request was merged and passed every payout check. A person approves the payout next. |
| **Paid** | Sent. The row links to the transaction. |

An amount with the word "test" in it, such as "25 test USDC", is on Solana's devnet test network and has no value.

## Test bounties

Some bounties exist only to check that the whole programme works end to end. They have a dashed border and the label **Test bounty — not for contributors**. Don't apply for them.

![A test bounty row, with its dashed border and label](shot:bounties-test-row "A test bounty")

If a test bounty relaxes a rule, the row names it after **Relaxed for this test:**. Only one rule can ever be relaxed: the one that stops people with access to a repository from winning its bounties. The checks that run before a payout are never relaxed.

## Next

1. [Link your Solana wallet](/docs/contributors/link-solana-wallet). You only do this once.
2. [Apply for a bounty](/docs/contributors/apply-for-a-bounty).
3. Read the [rules and limits](/docs/contributors/bounty-rules), so an application isn't refused.
