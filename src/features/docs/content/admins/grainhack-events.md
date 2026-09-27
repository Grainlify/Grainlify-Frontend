---
updated: 2026-09-27
---

A GrainHack event starts as a draft that only admins can see. You fill in its dates and sponsor funding, set any rules that differ from the defaults, and move it through its phases one step at a time. All of this is in **GrainHack admin**, on the **Hackathons** tab.

## Create the event

1. **Open GrainHack admin and choose New hackathon.**

   ![The Hackathons list, each event with its phase, and the New hackathon button](shot:admin-gh-list "Every event and the phase it is in")

2. **Name it and choose Create draft.** The event is created in the **Draft** phase and opens straight away.

## Fill in the event

The event page starts with its name, its phase and a form. Dates and times are in your browser's local time.

| Field | What it sets |
| --- | --- |
| **Announced at** | When the event is announced |
| **Application period start** and **Application period end** | When project applications open and close |
| **Issue prep start** | When issue preparation begins |
| **Starts at (live)** and **Ends at** | When the event runs |
| **Merge grace period (hours)** | How long after the end a merge still counts, so contributors are not penalised for slow maintainer review |
| **Sponsor total (USDC)** | What the sponsor is putting in |

Choose **Save fields** to save. Only fields with a value are saved: leaving a field empty does not clear it.

When you save a **Sponsor total (USDC)**, Grainlify takes the platform fee off it and splits the rest into the contributor pool and the maintainer pool, using the event's settings. You never type the pools directly.

## Move to the next phase

Under the form's heading, **Requirements for** the next phase lists anything still missing. When nothing is, it says **Ready to transition.** and the **Move to** button is enabled.

![An event's page with the requirements for the next phase and the event form](shot:admin-gh-requirements "What is blocking the next phase")

| Moving to | Needs |
| --- | --- |
| **Application period** | **Announced at**, **Application period start** and **Application period end** |
| **Issue prep** | **Issue prep start** |
| **Live** | **Starts at (live)** and **Ends at**, judging shadow mode turned off, and at least one published issue |
| closed | Nothing. Closing releases every assignment still in progress. |
| results_published | A final bucket on every qualifying pull request. Publishing opens the appeal window. |
| settled | Results published, the appeal window closed, and every appeal decided. Settling recomputes every contributor's share once. |

The last three phases appear in the app under these names. Phases only move forward, one step at a time. There is no way to skip one or go back.

Moving to **Live** records a frozen copy of the event's settings. Set any overrides before you go live.

> [!WARNING]
> Judging runs in shadow mode by default: verdicts are computed but never shown to contributors. The event cannot go **Live** until you turn `judging_shadow_mode` off for it.

## Override the rules for this event

**Rule overrides for this event**, further down the event page, lists every GrainHack setting by section, each with its description and, where it has one, its valid range and default. Unset settings use the global default.

1. **Change the values you need.** A setting marked **inactive this event** has no effect.
2. **Choose Save changes.** Each changed setting becomes an override for this event and is marked **overridden**.
3. **Undo an override with the reset icon.** Its tooltip is **Reset to default**. The setting goes back to the global default.

![Rule overrides for this event, with one setting marked overridden](shot:admin-gh-overrides "Overrides apply to this event only")

To change the defaults for every new event, use the **Global Defaults** tab instead. Every setting change, reset and phase move is recorded in the [audit log](/docs/admins/audit-log).
