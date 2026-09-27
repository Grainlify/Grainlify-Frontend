---
updated: 2026-09-27
---

Once a repository is on Grainlify, it stays up to date by itself through the Grainlify GitHub App. There's nothing to refresh by hand. This page explains what keeps it in sync, and how to take a repository off Grainlify.

## How sync works

The GitHub App tells Grainlify when something changes in your repository: an issue is opened, edited, labelled or closed, a comment is posted, a pull request is opened or merged, or code is pushed. Grainlify then reads that repository's issues and pull requests again, including labels, assignees and comments.

- Changes you make on GitHub show on Grainlify shortly afterwards.
- Changes you make on Grainlify, such as **Assign** or a bot message, are made on GitHub straight away.
- The **Maintainers** tabs reload when you come back to the browser tab, so you see the latest state.

Keep working on GitHub the way you do now. Comments, reviews and merges all happen there.

![An issue's Discussions tab showing comments made on GitHub](shot:maint-sync-discussions?desktop "Comments from GitHub, on Grainlify")

## Private repositories

Grainlify lists only public repositories. If you make a repository private, Grainlify removes it from your list and from everything contributors see.

## Remove a repository

There's no remove button in Grainlify. Access comes from the GitHub App, so you remove a repository on GitHub:

- **One repository.** In your GitHub settings, open the Grainlify app's installation and take the repository out of the list it can access. Grainlify removes that project.
- **Everything.** Uninstall the Grainlify app from the account or organisation. Grainlify removes every repository that came from that installation. It also checks regularly for installations that are gone, and removes their repositories.

A removed repository disappears from **Maintainers**, **Browse**, **Discover** and search.

**To bring one back**, give the app access to it again on GitHub, or start from **Add a repository** in Grainlify. A repository you'd set up before comes back with its details.

> [!NOTE]
> Contributors can no longer find a removed repository's issues on Grainlify, including ones they've applied for. If people are waiting on you, tell them first, for example with a [bot message](/docs/maintainers/bot-message).

## Change a project's details

Description, ecosystem, tags and category are edited in Grainlify, not synced from GitHub. Use **Edit** in the repository selector: see [Finish project setup](/docs/maintainers/project-setup).

## If the connection breaks

> [!WARNING]
> **"This project's GitHub connection is broken. A maintainer needs to reinstall the Grainlify GitHub App to fix this."** Grainlify can no longer reach the repository through the app. Choose **Add a repository** in the repository selector and install the app on that repository again. Your project and its details stay as they were.

If a repository still doesn't update after that, [get help](/support) and name the repository.
