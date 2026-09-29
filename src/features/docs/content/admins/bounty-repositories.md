---
updated: 2026-09-27
---

The bounty agent only posts bounties on repositories that are allowed to have them. The **Bounty Repositories** section of the **Reviews** page shows which ones are, and lets you switch bounties on or off for each. Use it when a project joins the programme, when one should leave it, or to check why a repository has no bounties.

## What a repository needs

A repository can have bounties only when both of these are true. They are shown separately because they have different owners.

| Condition | Shown as | Who can change it |
| --- | --- | --- |
| **Registered**: Grainlify has verified the project and the Grainlify GitHub App is installed on it | **verified project, App installed** | Not you, from this screen. The maintainer adds the repository and installs the App. See [Add your repositories](/docs/maintainers/add-repositories). |
| **Switched on**: an admin has turned bounties on for it | The **Bounties on** / **Bounties off** button | You, here |

Switching bounties off stops new bounties on that repository, and the payout gate then refuses payment for bounties already posted on it.

## Read the list

Open **Reviews** and scroll to **Bounty Repositories**, below **Bounty Draw**. Every Grainlify project is listed by its repository name, with its registration, who last changed it, and a button that shows whether bounties are on.

![The Bounty Repositories section with repositories switched on, switched off, not registered, and one switched on that is no longer eligible](shot:admin-bountyrepos-list "Bounty Repositories")

| What the row shows | What it means |
| --- | --- |
| **verified project, App installed** and **Bounties on** | The repository can have bounties. |
| **verified project, App installed** and **Bounties off** | Registered, but switched off. You can switch it on. |
| **not a verified project with the App installed** and a greyed-out **Bounties off** | Not registered. The button is disabled: you can't switch it on until the project is verified and the App is installed. |
| **not a verified project with the App installed**, **Bounties on**, and **Bounties are on, but this repository is not eligible** | Switched on, but it has since stopped being registered. See below. |
| **not allowlisted with the agent** | The bounty agent isn't set up to work on this repository. It can't have bounties until it is, and that isn't done from this screen. |

A second box, **Known to the agent, not a Grainlify project**, lists repositories the bounty agent knows about that aren't Grainlify projects. The agent's own test repository is there, marked **test carve-out**: it is the one repository allowed to have bounties without being registered.

## Switch bounties on or off

1. **Find the repository** in the list.
2. **Choose its button.** **Bounties off** switches bounties on; **Bounties on** switches them off. The button shows **Saving…** while the change is made.
3. **Check the row.** The button shows the new state, and the row says **last changed by** with your GitHub login and the date.

If the change is refused, the reason appears in red at the top of the section, and the row keeps its previous state.

> [!WARNING]
> Switching a repository off also affects bounties already posted on it. A merged pull request for one of them is refused for payment. Switch off only when bounties on that repository should stop, not to pause a single bounty.

## Switched on, but no longer eligible

A project can stop being registered after bounties were switched on, for example when the GitHub App is removed from the repository. The switch still says on, so the only sign is on this screen, where the two conditions sit side by side. The row says **Bounties are on, but this repository is not eligible**.

When you see it, switch the repository off. The **Bounties on** button stays available on that row for exactly this. Once it is off, you can't switch it back on until the project is registered again.

## Every change is recorded

Each switch is recorded against the GitHub login of the admin who made it. The list shows the most recent: **last changed by** a login **on** a date.

## If the bounty agent can't be reached

What is switched on is stored by the bounty agent, not by Grainlify. If the agent can't be reached, the section says so at the top instead of showing its state, and the buttons don't tell you what is currently on. Don't switch anything on while that message shows. Reload the page later.

> [!NOTE]
> Switching a repository on here is not the only check. As the note under the list says, the payout signer keeps its own short list of repositories as a backstop. It is edited separately, and not from this screen.

For running the draw on a bounty once it is posted, read [Run a bounty draw](/docs/admins/bounty-draw). For what maintainers see on a repository with bounties, read [Bounties on your repositories](/docs/maintainers/bounties).
