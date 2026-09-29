---
updated: 2026-09-27
---

GrainHack keeps an audit trail of every rule change and every phase move, with who made it and when. Use it to answer "why did this event behave that way?" long after the fact. There are two views of it in **GrainHack admin**.

## What is recorded

| Recorded | Shown as |
| --- | --- |
| A setting changed, globally or for one event | The setting's name, for example `slots_per_contributor` |
| An event override reset to the default | The setting's name, with the default it went back to as the new value |
| An event moved to its next phase | **Phase transition** |

Each entry shows the old value and the new value, **(unset)** where there was none, then who made the change and how long ago.

The event form (dates, grace period and sponsor total) is not part of the audit trail. Neither are verdict overrides and appeal decisions: the reason for each is shown on the verdict and the appeal instead. See [GrainHack: verdicts and appeals](/docs/admins/grainhack-verdicts).

## The global audit log

1. **Open GrainHack admin.**
2. **Choose the Global Audit tab.**

It lists the most recent 100 entries across Grainlify: changes to the global defaults and to every event, newest first.

![The Global Audit tab listing setting changes and phase transitions](shot:admin-gh-global-audit "Global Audit")

## One event's audit trail

1. **Open GrainHack admin and choose the event** on the **Hackathons** tab.
2. **Scroll to the bottom of the event page.** **Audit trail** lists that event's own changes: its rule overrides, resets and phase transitions, newest first, up to the most recent 100.

![An event's audit trail showing phase transitions and an override](shot:admin-gh-event-audit "One event's audit trail")

When nothing has been recorded yet, the trail says **No changes recorded yet.** If it could not be loaded, it says so and offers a retry rather than showing an empty trail.

> [!NOTE]
> The bounty draw settings on the **Reviews** page are not part of this trail. Each overridden bounty setting shows who changed it, both there and on the public [bounty rules page](/bounties/rules).
