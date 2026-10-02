---
updated: 2026-10-02
---

This section is for Grainlify staff who hold the admin role. This page covers how to reach the admin pages, what the admin view changes, and what to do when your access changes.

## Switch to the admin view

1. **Choose ADMIN in the role switcher.** The switcher at the top of the app shows **CONTRIBUTOR** and **MAINTAINER** to everyone. **ADMIN**, with a small lock badge, appears only when your account holds the admin role.

   ![The role switcher with the ADMIN pill selected](shot:admin-role-switcher?desktop "The ADMIN pill only appears for admins")

2. **You land on the first queue.** Choosing ADMIN opens **Social follow review**. Each admin area is its own entry in the rail; the screenshot below shows the older single **Admin Panel** page.

   ![The top of the Admin Panel, with the Admin Access badge](shot:admin-reviews-header "Reviews: the Admin Panel")

The admin view hides the contributor and maintainer shortcuts from the rail, so what you see is the admin pages. Switch back to **CONTRIBUTOR** or **MAINTAINER** to use the rest of the app as usual.

## The admin pages

| Rail item | What it holds | Pages in this section |
| --- | --- | --- |
| **Social follow review**, **Verification review**, **Redemptions** | The review queues | [Social follow](/docs/admins/social-follow-review), [Verification](/docs/admins/kyc-review), [Redemptions](/docs/admins/redemptions) |
| **Bounty disputes**, **Bounty repositories**, **Bounty draw settings** | Disputes on maintainer-funded bounties (not set up yet), which repositories have bounties, and the settings every bounty draw uses | [Bounty repositories](/docs/admins/bounty-repositories), [Bounty draw settings](/docs/admins/bounty-draw) |
| **Ecosystems** | Ecosystem management | [Ecosystems](/docs/admins/ecosystems) |
| **GrainHack admin** | The **Hackathons**, **Global Defaults** and **Global Audit** tabs | [Create an event](/docs/admins/grainhack-events), [Applications](/docs/admins/grainhack-applications), [Draws](/docs/admins/grainhack-draws), [Verdicts and appeals](/docs/admins/grainhack-verdicts), [Audit log](/docs/admins/audit-log) |

These entries are in your rail only while ADMIN is selected. In the contributor and maintainer views you see what a contributor or maintainer sees.

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
