---
updated: 2026-09-29
---

You won the draw for a bounty. This page takes you from opening your pull request to seeing the payment on-chain. Only the person the draw assigned can be paid for a bounty, and a person approves every payout before it's sent.

![From pull request to payment](video:contributors/bounty-payment "1:19")

## From pull request to payment

1. **Open a pull request that says Closes #N.** N is the bounty's issue number. Put `Closes #N` in the pull request's description, and open it before your assignment runs out: the [rules page](/bounties/rules) shows how long a winner has (**assignment_stale_hours**). If no pull request arrives by then, the bounty can be drawn again.

2. **Read the agent's advisory review.** The agent reviews your pull request on GitHub. The review is headed "Advisory review for bounty on #N" and gives a verdict of **Looks complete**, **Needs changes** or **Unclear**, a summary, any concerns, and the state of CI. It's advice: it doesn't approve the pull request or trigger payment. On the Bounties page, the bounty now shows **PR in review**.

   ![A bounty row showing PR in review](shot:bounties-pay-in-review "PR in review")

3. **A maintainer decides whether to merge.** Work through their review as you would on any project. The merge must be made by someone with write access or above to the repository, and not by you.

4. **The payout checks run.** When the pull request is merged, the agent runs a fixed list of checks and comments on the pull request with each one marked passed or failed. If every check passes, the comment is headed "Payout ready for approval" and the bounty shows **Awaiting approval**. If any check fails, it's headed "Payout refused by the gate" and nothing is paid for that merge.

   ![A bounty row showing Awaiting approval](shot:bounties-pay-awaiting "Awaiting approval")

5. **A person approves the payout.** Once they do, it's sent to your linked wallet. The agent comments "Paid" on the pull request, with the amount, your wallet address and a link to the transaction. On the Bounties page the bounty moves under **Paid**, with a **transaction** link, and a **Payout** row appears on [the bounty ledger](/docs/contributors/bounty-ledger).

   ![A paid bounty, naming who was paid, with its transaction link](shot:bounties-pay-paid "Paid")

## What the payout checks look at

The checks are plain code. No model output is an input, and nothing written in an issue, pull request or comment can change the result. A fact that can't be read counts as a failure, never as a pass.

| Check | Passes when |
| --- | --- |
| Repository | The repository can still have bounties. |
| Bounty | The bounty is still open, and it hasn't been paid already. |
| Pull request | It's merged, and it closes the bounty's issue. |
| Who merged | Someone with write, maintain or admin access who isn't the author. |
| Who opened it | The person the draw assigned the bounty to. |
| Author | A person, not a bot, whose GitHub account is old enough. Account age is checked again here. |
| Wallet | The author has a linked wallet. The payout goes to the wallet linked when the pull request is merged. |
| Amount | Within the programme's per-bounty and daily limits. |

> [!WARNING]
> Self-merged pull requests are not paid, even if you have access to merge them. A pull request from anyone other than the person drawn isn't paid either, however good it is.

## If something goes wrong

- **The payout was refused.** The agent's comment on your pull request marks the check that failed. [Get help](/support) and include a link to the pull request.
- **You want to be paid to a different wallet.** [Link the new wallet](/docs/contributors/link-solana-wallet) before your pull request is merged.
