---
updated: 2026-09-27
---

This section is for Grainlify staff who hold the admin role. This page covers how to reach the admin pages, what the admin view changes, and what to do when your access changes.

## Switch to the admin view

1. **Choose ADMIN in the role switcher.** The switcher at the top of the app shows **CONTRIBUTOR** and **MAINTAINER** to everyone. **ADMIN**, with a small lock badge, appears only when your account holds the admin role.

   ![The role switcher with the ADMIN pill selected](shot:admin-role-switcher?desktop "The ADMIN pill only appears for admins")

2. **You land on Reviews.** Choosing ADMIN opens the **Admin Panel**, where the review queues, ecosystem management, the bounty draw and the bounty repositories are.

   ![The top of the Admin Panel, with the Admin Access badge](shot:admin-reviews-header "Reviews: the Admin Panel")

The admin view hides the contributor and maintainer shortcuts from the rail, so what you see is the admin pages. Switch back to **CONTRIBUTOR** or **MAINTAINER** to use the rest of the app as usual.

## The admin pages

| Rail item | What it holds | Pages in this section |
| --- | --- | --- |
| **Reviews** | Ecosystem Management, Social Follow Review, Verification Review, Redemption Requests, Bounty Draw, Bounty Repositories | [Ecosystems](/docs/admins/ecosystems), [Social follow](/docs/admins/social-follow-review), [Verification](/docs/admins/kyc-review), [Redemptions](/docs/admins/redemptions), [Bounty draw](/docs/admins/bounty-draw), [Bounty repositories](/docs/admins/bounty-repositories) |
| **GrainHack admin** | The **Hackathons**, **Global Defaults** and **Global Audit** tabs | [Create an event](/docs/admins/grainhack-events), [Applications](/docs/admins/grainhack-applications), [Draws](/docs/admins/grainhack-draws), [Verdicts and appeals](/docs/admins/grainhack-verdicts), [Audit log](/docs/admins/audit-log) |

**Reviews** and **GrainHack admin** stay in your rail in every view, not only while ADMIN is selected.

> [!NOTE]
> The admin pages work on a phone, but some are easier to read on a computer. On a phone, the ticket table in a draw result scrolls sideways: swipe it to see every column. The screenshots of draw results, the **Draws** list and pending project applications are taken at desktop width.

## Who has admin access

There is no screen in the app for granting or removing the admin role. The Grainlify team grants it to an account. If you need it, or someone should no longer have it, ask the team.

Hiding the ADMIN pill is not what protects these pages. Every admin action is checked on the server against your account's current role, each time you make it.

## When your role changes

Your sign-in session records the role you had when you signed in. When the admin role is granted to you or removed from you, sign out and sign in again.

- **Newly granted.** The ADMIN pill can appear after you reload, but admin actions are refused with "Your access level changed. Sign in again." until you do.
- **Removed.** Admin actions stop working at once, including in a tab you already had open.

> [!NOTE]
> If an admin page refuses you and you expect access, sign out and back in first. If it still refuses, ask the Grainlify team to check your role.
