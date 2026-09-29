---
updated: 2026-09-29
---

You apply for a bounty while its application window is open. When the window closes, one applicant is drawn and assigned. The draw is weighted, not first-come, so there's no reason to rush: applying early gives you no advantage, and applying to more bounties doesn't change your odds on any of them.

![Apply for a bounty](video:contributors/apply-for-a-bounty "1:29")

The whole path, from applying to being paid:

- Link a Solana wallet to your GitHub account once.
- Apply while the bounty's window is open. Do not open a pull request yet.
- When the window closes, one applicant is drawn and assigned. You'll see who won on the Bounties page.
- If you are drawn, open a pull request before your assignment runs out.
- The agent posts an advisory review. A maintainer decides whether to merge.
- After the merge, a person approves the payout and it is sent to your wallet.

## Before you apply

- You're signed in with GitHub. Signed out, the button reads **Sign in to apply**.
- You've [linked a Solana wallet](/docs/contributors/link-solana-wallet). A phone wallet is enough.
- You've checked the [rules that get an application refused](/docs/contributors/bounty-rules).

## Apply

1. **Open Bounties.** Choose **Bounties** in the rail.
2. **Find a bounty that's open.** Its row says when applications close and roughly how many people have applied, for example "A few applicants so far." The exact number is kept back until the window closes, so there's nothing to time.
3. **Add a note if you like.** **Anything you want to add (optional)** takes a short note. The draw doesn't weight it.

   ![An open bounty with the optional note field and the Apply for this bounty button](shot:bounties-apply-open "An open bounty")

4. **Choose Apply for this bounty.** The row changes to "You are in the draw for this bounty. The result appears here when it runs." Don't open a pull request yet.

   ![The same bounty after applying, saying you are in the draw](shot:bounties-apply-in-draw "In the draw")

## When the window closes

The row says "Applications have closed. The draw runs next." Once the draw has run, your row shows the result:

- "You won the draw for this bounty. Open a pull request before the deadline." Carry on with [From pull request to payment](/docs/contributors/bounty-payment).
- "This bounty went to someone else in the draw."

Everyone can see who holds a bounty, and once the window has closed, how many people entered the draw. If nobody applies before the window closes, it can be extended. The [rules page](/bounties/rules) shows by how long and how many times.

## How the draw works

Everyone who passes the checks gets tickets, and one ticket is drawn at random. You start with one ticket, and each factor that applies to you multiplies it:

- **You've never been assigned a bounty.** You get a newcomer bonus, and you keep it on every application until you win one.
- **You've completed bounties before.** You get more tickets, but only your first two completed bounties count. That cap is fixed in the code, not a setting, so a run of wins can't outrank being right for the bounty in front of you.
- **Fit.** When the fit assessment is switched on, each application is judged a strong, plausible or weak match for the issue. Strong gets more tickets. Weak gets fewer, but never none. When it's off, everyone counts as plausible. The assessment can also mark an issue as harder than anything you've taken on before, which lowers your tickets. An easier issue is never penalised.
- **Abandons.** Each bounty you held and lost because no pull request arrived in time lowers your tickets. A rejected pull request doesn't count as an abandon.

Every weight, and whether the fit assessment is on, is published with its live value on the [rules page](/bounties/rules). Every draw also stores its seed and the full ticket breakdown, so a result can be recomputed rather than argued about.

## What the draw cannot see

The draw has no way to read any of these:

- total pull request count
- merge rate
- follower count
- stars
- total contributions
- how well the application is written

All of these are farmable and all of them penalise newcomers. They are absent by omission: there is no code path in the draw that can read them.

## Bounties for newcomers

A bounty marked **First bounty only** is reserved for contributors who haven't completed a bounty yet. Its row says "Reserved for contributors who have not completed a bounty yet." If any newcomers applied, only they are drawn. Having applied before, or having held a bounty without completing it, doesn't use the reservation up.

![A bounty marked First bounty only](shot:bounties-apply-newcomer "Reserved for newcomers")

If no newcomer applies, the setting **reservation_fallback_to_open_pool** on the rules page decides whether the bounty is drawn from everyone instead.

## If your application is refused

The row says why. Some reasons you can fix. Without a linked wallet, for example, the row offers **Link a wallet**, and once you've linked one, **Try again** puts you in the draw. Others, like already holding a bounty, can't be fixed from the row. [Bounty rules and limits](/docs/contributors/bounty-rules) lists every reason.
