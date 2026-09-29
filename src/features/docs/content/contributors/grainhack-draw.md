---
updated: 2026-09-27
---

Each GrainHack issue runs its own draw when its application window closes. The draw is weighted: think of everyone in the pool holding some tickets, and one ticket being pulled at random. This page explains in words what decides your tickets. The live values are in **My GrainHack → Rules**, under **Draw weights**, **Newcomer reservation** and **Application window and draw**.

![The Draw weights section of the GrainHack rules, under the prior wins cap](shot:grainhack-rules-weights "Rules: Draw weights")

## Who is in the pool

Everyone who applied in time and passed [the checks](/docs/contributors/grainhack-eligibility). Then, in order:

1. **Weak fits wait.** When the fit assessment is switched on, applicants it rates a weak match are left out while anyone rated plausible or strong applied. The event's settings decide whether weak matches are drawn when nobody else applied.
2. **Newcomer issues draw newcomers.** On an issue marked **Newcomers only**, only contributors who haven't completed a GrainHack issue are drawn. If none applied, the event's settings decide whether it opens to everyone.

## How tickets are counted

You start with one ticket. Each factor that applies to you multiplies it.

| Factor | Effect |
| --- | --- |
| Fit for this issue | A strong match gets more tickets, a weak one fewer. With the fit assessment switched off, everyone counts as plausible. |
| The fit assessment finds the issue above your level | Fewer tickets. Taking an issue below your level is never penalised, so experienced contributors don't crowd newcomers off easy issues. |
| Completed GrainHack issues | More tickets for each one, but only your first two count. This cap is fixed, not a setting, so having won before can never outrank being right for the issue in front of you. |
| You've never been assigned a GrainHack issue | A newcomer bonus. You keep it on every application until you win one. |
| Abandons in this event | Fewer tickets for each one. |

Then one ticket is drawn. If you apply to several issues, each runs its own draw, and how many you applied to doesn't change your tickets in any of them.

## What the draw cannot see

The draw has no way to read any of these:

- total pull request count
- merge rate
- follower count
- stars
- total contributions
- how well the application is written

All of these are farmable and all of them penalise newcomers. They are absent by omission: there is no code path in the draw that can read them.

## Newcomer reservation

A share of each difficulty tier's issues can be reserved for newcomers, meaning contributors who haven't completed a GrainHack issue. An issue is reserved or not when it's published, before anyone applies, so the reservation can't be steered by who turns up. Reserved issues carry **Newcomers only** on the event page and on the issue.

![An event's issue list, with an issue marked Newcomers only](shot:grainhack-event-newcomers "Newcomers only")

## When the pool is empty

If a window closes with nobody in it, the window reopens, up to the number of times the event allows. If people applied but nobody is left in the pool after the steps above, the event can fall back to the earliest applicant who passed the checks. That's the only case where applying early makes a difference.

## Every draw is recorded

Each draw is stored with its random seed and every applicant's tickets, factor by factor, whether or not it produced a winner. A result can be replayed exactly, which is what makes it answerable if someone asks why.
