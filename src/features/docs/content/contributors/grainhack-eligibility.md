---
updated: 2026-09-27
---

Any Grainlify contributor signed in with GitHub can apply for a GrainHack issue, but every application goes through a set of checks before it enters the draw. If one fails, you're told which rule stopped you. This page lists them. The numbers behind them, such as the minimum account age or how many slots you get, are settings: see **My GrainHack → Rules**, under **Hard gates** and **Contributor slots and caps**.

## Where you see a refusal

- **On the issue.** The GrainHack panel says **You can't be assigned this issue**, with the reason underneath.
- **In My GrainHack → My applications.** The application shows **Couldn't apply**, with the same reason.

![My applications, with an application marked Couldn't apply and its reason](shot:grainhack-myapps-refused "Couldn't apply")

## The checks

They run in this order, and the first one that fails is the reason you see. N stands for the event's own number. Some checks, such as the bot, organization and commit-history checks, can be switched off; the Rules tab shows which are on.

| Check | What you see if it stops you |
| --- | --- |
| The event is live and the issue is published | "This GrainHack is not accepting applications right now." or "This issue is not open for applications yet." |
| The issue's window is open | "Applications for this issue open at …" or "Applications for this issue closed at …" |
| You didn't open the issue | "You opened this issue, so you can't also be assigned to it." |
| You haven't reached the abandon limit in this event | "You've had N assignment(s) time out in this event, which is the limit." |
| You have a free slot | "You're holding N of N assignment slots. Submit a PR to free one." |
| You're under the per-organization limit | "You've already been assigned N issue(s) from …, which is the per-org limit." |
| You're under the event's total limit, if it has one | "You've already been assigned N issue(s) in this event, which is the limit." |
| You're under the limit on open applications | "You have N open applications, which is the limit. Wait for a draw to resolve before applying to more." |
| You're not a bot account | "Bot accounts can't be assigned GrainHack issues." |
| Your GitHub account is old enough | "Your GitHub account must be at least N days old as of this event's announcement." |
| You're not a member of the organization that owns the issue | "You're a member of …, so you can't be assigned its GrainHack issues." |
| Your account was active before the event | "Your account needs public commit history from before this event was announced." |

![The Hard gates section of the GrainHack rules](shot:grainhack-rules-gates "Rules: Hard gates")

## What the limits are for

- **Slots** limit how many assignments you hold at once. Applying doesn't use a slot; only winning does. A slot frees up again when you submit a qualifying pull request, or when it's merged, depending on the event's **Slot Freed On** rule. Some events let you earn an extra slot by completing issues.
- **Open applications are capped** because applications are free. Without a cap, one account could enter every draw at no cost. The cap counts applications still waiting for a draw.
- **The per-organization limit** counts every issue you've won from one organization across the whole event.
- **Abandons.** An assignment released because no qualifying pull request arrived in time counts as an abandon, and so does giving one back after the grace window. Reach the event's limit and you can't be assigned anything else in that event. See [Your assignment](/docs/contributors/grainhack-assignment).
- **Account age is measured at the event's announcement**, not on the day you apply. With the commit-history check, it's the main protection against accounts made for the event. The history check asks whether you have any public commits from before the announcement, not how many.

Slots and the per-organization limit are checked again at the moment you win, because things can change between applying and the draw.

## Next

[Apply for a GrainHack issue](/docs/contributors/grainhack-apply).
