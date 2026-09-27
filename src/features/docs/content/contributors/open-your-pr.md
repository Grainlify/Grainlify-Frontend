---
updated: 2026-09-27
---

Once you're assigned an issue, the work happens on GitHub the way it always does. Grainlify adds no submission form: your pull request is your submission, and Grainlify reads it from GitHub. This page covers the one thing Grainlify needs from you, linking the issue, and how a merged pull request counts afterwards.

## Open your pull request

1. **Do the work as usual.** Fork the repository or create a branch, make your changes, and follow the project's own contributing guide if it has one.
2. **Open a pull request against the project's repository.**
3. **Link the issue in the description.** Write a closing keyword followed by the issue number, for example `Fixes #12`. Grainlify recognises close, closes, closed, fix, fixes, fixed, resolve, resolves and resolved. These are the keywords GitHub itself uses to link a pull request to an issue.

> [!WARNING]
> Put the keyword and number together in the pull request's description, as `Fixes #12`. Grainlify doesn't recognise a full link to the issue, a `owner/repo#12` reference, or a mention in a commit message or comment. If it can't match your pull request, your issue stays under **Assigned issue** on your Contributors tab even after you've opened it.

When Grainlify matches your pull request, the issue moves from **Assigned issue** to **Pending review** on your [Contributors tab](/docs/contributors/track-contributions). It matches pull requests you opened, on the same project, that name the issue this way. If you open more than one, it follows the newest.

## Get it reviewed and merged

Review happens on GitHub, between you and the maintainer. Reply to comments and push changes to the same pull request. Grainlify doesn't review ordinary issues and doesn't need anything from you during review.

When the maintainer merges your pull request:

- Grainlify sends you a notification titled "Your PR #12 was merged", with your pull request's number. It opens the project's page.
- The issue moves to **Complete** on your Contributors tab.

Bounties and GrainHack issues add steps of their own after the pull request. See [From pull request to payment](/docs/contributors/bounty-payment) and [Results, grading and appeals](/docs/contributors/grainhack-results).

## How a merged pull request counts

Your [rank and place on the leaderboard](/docs/contributors/ranks-and-leaderboard) come from one number: your pull requests merged in the last 90 days on projects listed on Grainlify. The count comes from GitHub, matched by your GitHub username, so there's nothing to report by hand.

| Counts | Doesn't count |
| --- | --- |
| Every merged pull request of yours on a listed project, whether or not you applied for its issue through Grainlify | Pull requests that are still open, or were closed without merging |
| | Issues you open, and comments, including applications |
| | Pull requests to a project that is itself a fork |
| | Pull requests merged more than 90 days ago, on the default leaderboard |

Two other things follow from your work:

- Opening a pull request, or an issue, on a listed project puts that project on the **Projects** sub-tab of your Contributors tab.
- Once you have a pull request merged into one of an organisation's listed projects, you can leave a review on that organisation's page, unless you maintain one of its projects yourself.
