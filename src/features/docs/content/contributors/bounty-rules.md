---
updated: 2026-09-27
---

These are the rules that get a bounty application refused or a payout withheld, and the reason each one exists. Some rules have a number behind them, such as how old your GitHub account must be. Those numbers are settings, so this page doesn't repeat them: the [rules page](/bounties/rules) shows each live value, the default beside it, and who changed it if anyone has. You can read it without signing in.

![The public rules page, How bounties are assigned](shot:bounties-rules-page "grainlify.com/bounties/rules")

## Rules for applying

| Rule | Why it exists | What your row says if it stops you |
| --- | --- | --- |
| Link a Solana wallet before you apply. | So nobody wins a bounty they can't be paid for. | "Link a Solana wallet before applying, so a bounty you win can be paid." |
| Your GitHub account must be old enough. The minimum is **min_account_age_days** on the rules page. | It stops a batch of freshly made accounts entering the draw. It's checked again when your pull request is merged. | "Your GitHub account is too new to apply yet." |
| Hold one bounty at a time. The limit is **max_active_assignments_per_person**. | Holding several while finishing none is the main way a draw gets gamed. | "You already hold a bounty. Finish or release it before applying for another." |
| You can't win bounties on a repository where you have write, maintain or admin access. | People on the inside of a repository can't win its bounties. A test bounty may relax this one rule, and no other. | "You maintain this repository, so you cannot win its bounties." |
| Apply once per bounty, while its window is open. | — | "You have already applied for this bounty." or "Applications have closed. The draw runs next." |

If Grainlify can't read your GitHub account to check its age, you're refused rather than let through, with "We could not read your GitHub account to check its age. Try again in a moment." You can try again straight away.

![A refused application, with the Link a wallet button](shot:bounties-rules-refused "A refusal you can fix")

The rules page lists these under **Hard gates**, with a line saying what each does.

## One wallet per GitHub account

Bounties are paid by GitHub account. Each account has one wallet on file, and a wallet can belong to only one GitHub account. Linking a different wallet replaces yours, and later payouts go to the new one. If a wallet is already linked to someone else, the wallet page says "That wallet is already linked to another GitHub account."

## Rules for being paid

- **Only the person drawn is paid.** A merged pull request from anyone else earns nothing. Bounties used to go to whoever opened the first pull request, and most of the work people did was wasted. Without this rule, the draw would pick a winner and the payment would ignore it.
- **Self-merged pull requests are not paid.** Someone else with write access or above must merge.
- **A person approves every payout.** The agent reviews and runs the checks, but it can't approve a payment. The approval is signed by a person, and the service that sends money refuses any payout without a valid one. It covers the recipient, the amount and the bounty, so it can't be reused for anything else.
- **One payout per bounty.**
- **Payouts stay within limits.** There's a cap per bounty and a cap per day.

[From pull request to payment](/docs/contributors/bounty-payment) lists every check a merged pull request goes through.

## What the draw uses

The draw's weights, the application window, how long a winner has to open a pull request, and the newcomer reservation are all on the [rules page](/bounties/rules) too. The only fixed rule there is **Prior wins are capped at**: it's a constant in the code, not a setting, so nobody can raise it mid-programme. [Apply for a bounty](/docs/contributors/apply-for-a-bounty) explains the draw in words.
