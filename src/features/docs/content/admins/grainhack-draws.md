---
updated: 2026-09-27
---

Each GrainHack issue is assigned by a weighted draw when its application window closes. The **Draws** section of an event's page in **GrainHack admin** lists every draw with its seed and full ticket breakdown, so you can explain any result and replay it. For how contributors see the draw, read [The draw: tickets and weights](/docs/contributors/grainhack-draw).

## Read the draw list

Open **GrainHack admin**, choose the event on the **Hackathons** tab, and scroll to **Draws**. Each row shows the repository and issue, who won or why nobody did, how many were in the pool, the seed, and how long ago it ran. When there are none yet, it says **No draws yet. They run automatically when an issue's application window closes.**

![The Draws section with several draws and their flags](shot:admin-gh-draws-list?desktop "Every draw, with its seed")

Flags on a row tell you what the draw had to do:

| Flag | Meaning |
| --- | --- |
| **newcomer-reserved** | The issue was reserved for newcomers, so the draw looked at newcomers first |
| **reservation fell back** | The issue was reserved, but no newcomer applied, so the draw used the open pool |
| **weak pool** | Nobody was a strong enough fit, so the draw used weak-fit applicants rather than leave the issue unassigned |
| **first-come** | The draw fell back to first-come assignment |
| **simulation** | A simulation you or another admin ran. Nobody was assigned. |

## Read the ticket breakdown

Choose a row, or its arrow, to open it. If there was no winner, the reason is shown first. Below it is the pool, ranked by odds.

![An open draw showing each applicant's reasons, tickets and odds](shot:admin-gh-draw-breakdown?desktop "The ticket breakdown")

| Column | What it shows |
| --- | --- |
| **Applicant** | The GitHub login, marked **Won** for the winner and **Newcomer** where it applies |
| **Why** | Every factor applied to their tickets, such as **Strong fit** or **Prior abandons**, each with its multiplier. Multipliers below 1 are shown in red. |
| **Tickets** | Their tickets after all factors |
| **Odds** | Their tickets as a share of the whole pool |

The weights themselves are event settings: see [Override the rules for this event](/docs/admins/grainhack-events).

## Simulate with a seed

Every draw stores its seed. To replay one, choose the re-run icon on its row. It runs the same draw again with the same seed, against the current pool and the current weights.

A simulation assigns nobody and uses nobody's slot. The result appears in a box at the top of **Draws**, headed **Simulation** with the seed and who would win, and the same ticket table below. Choose **Dismiss** to close it.

![A simulation result with its seed, the would-be winner and the ticket table](shot:admin-gh-simulation?desktop "Simulation with the draw's own seed")

## Show or hide simulations

Simulations are kept, marked **simulation**, so a weight experiment is never confused with a real assignment. They are hidden from the list by default. Tick **Show simulations** to include them.
