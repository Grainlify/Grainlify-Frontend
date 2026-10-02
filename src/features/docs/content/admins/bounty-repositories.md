---
updated: 2026-10-02
---

Bounties are posted only on repositories that are allowed to have them. The **Bounty repositories** page, its own entry in the admin sidebar, shows which ones are, and lets you add or remove a repository. Use it when a project joins the programme, when one should leave it, or to check why a repository has no bounties.

## What a repository needs

A repository can have bounties only when both of these are true. They are shown separately because they have different owners.

| Condition | Shown as | Who can change it |
| --- | --- | --- |
| **Registered**: Grainlify has verified the project and the Grainlify GitHub App is installed on it | **verified project, App installed** | Not you, from this screen. The maintainer adds the repository and installs the App. See [Add your repositories](/docs/maintainers/add-repositories). |
| **Switched on**: an admin has turned bounties on for it | Listed under **Bounties on** | You, here |

Switching bounties off stops new bounties on that repository, and the payout gate then refuses payment for bounties already posted on it.

## Read the page

**Bounties on (N)** lists every repository with bounties switched on, with its registration and who last changed it. If none is, it says **No repository has bounties switched on. Search below to add one.**

![The Bounty Repositories section with repositories switched on, switched off, not registered, and one switched on that is no longer eligible](shot:admin-bountyrepos-list "Bounty Repositories")

The screenshot may still show the older layout, with one button per project.

| What the row shows | What it means |
| --- | --- |
| **verified project, App installed** | The repository can have bounties. |
| **test carve-out** | The bounty agent's own test repository: the one repository allowed to have bounties without being registered. |
| **not a verified project with the App installed** and **Bounties are on, but this repository is not eligible — the payout gate will refuse.** | Switched on, but it has since stopped being registered. See below. |

## Add a repository

1. **Search for it** under **Add a repository**, in **Search by owner or repository name**. Nothing is listed until you type; the box says how many repositories are eligible.
2. **Choose Add** on its row. The button shows **Saving…** while the change is made.
3. **Check the list.** The repository moves to **Bounties on**, and the row says **last changed by** with your GitHub login and the date.

Only registered repositories can be found here. If yours doesn't appear, the search says a repository appears once Grainlify has verified the project and the GitHub App is installed on it. Adding a repository also sets it up with the bounty agent; there is no separate step.

If the change is refused, the reason appears in red at the top of the page, and the list keeps its previous state.

## Remove a repository

Choose **Remove** on its row under **Bounties on**.

> [!WARNING]
> Removing a repository also affects bounties already posted on it. A merged pull request for one of them is refused for payment. Remove a repository only when bounties on it should stop, not to pause a single bounty.

## Switched on, but no longer eligible

A project can stop being registered after bounties were switched on, for example when the GitHub App is removed from the repository. It stays under **Bounties on**, so the only sign is on this screen, where the row says **Bounties are on, but this repository is not eligible — the payout gate will refuse.**

When you see it, choose **Remove**. Once it is off, you can't add it back until the project is registered again.

## Every change is recorded

Each change is recorded against the GitHub login of the admin who made it. The list shows the most recent: **last changed by** a login **on** a date.

## If the bounty agent can't be reached

What is switched on is stored by the bounty agent, not by Grainlify. If the agent can't be reached, the page says **The bounty agent could not be reached, so what is currently switched on is unknown. The list below is projects only.** Don't add anything while that message shows. Reload the page later.

> [!NOTE]
> Switching a repository on here is not the only check. As the note under the list says, the payout signer keeps its own short list of repositories as a backstop. It is edited separately, and not from this screen.

Running, simulating and redrawing a bounty's draw, ending an assignment and moving a deadline are done by the repository's maintainers: see [Bounties on your repositories](/docs/maintainers/bounties#what-you-can-do). The settings every draw uses are on [Bounty draw settings](/docs/admins/bounty-draw).
