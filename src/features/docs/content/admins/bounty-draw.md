---
updated: 2026-09-27
---

Bounty draws run on their own when a bounty's application window closes. The **Bounty Draw** section of the **Reviews** page lets you check a draw before it decides anything, run one by hand, and change the settings the draw uses. For how contributors see the draw, read [How Grainlify Bounties work](/docs/contributors/bounties).

## Choose a bounty

Under **Run a draw**, pick a bounty from **Choose a bounty…**. Each option shows the repository and issue, the amount, and either who holds it or where its applications stand. Test bounties are marked **[TEST]**.

Once you choose one, an **Applications** box shows how many applied, how many are in the pool and how many were refused. Each applicant is listed with their status, the reason if a gate refused them, and their fit assessment.

## Simulate first

1. **Choose Simulate.** A confirmation says nobody will be assigned.
2. **Choose Yes, simulate.**

A simulation uses the real pool and the real weights but assigns nobody. It is how you check a settings change before it decides a real draw.

![A simulated draw showing each applicant's tickets, share and weights](shot:admin-bountydraw-result?desktop "Simulated draw")

The result shows the seed, the pool size and who triggered it, then one row per applicant:

| Column | What it shows |
| --- | --- |
| **Applicant** | The GitHub login |
| **Fit** | The fit assessment for their application |
| **Tickets** | Their tickets in the draw |
| **Share** | Their chance of winning, as a percentage of all tickets |
| **Weights** | Each factor applied to their tickets, or **base only** |

If every candidate had zero tickets, the result says the draw fell back to first-come. If there was no winner, it says why.

## Run the draw

1. **Choose Run draw now.**
2. **Read the confirmation.** One applicant will be assigned, and this cannot be undone from here. To change the result you release the assignment instead.

   ![The Run draw now confirmation for a chosen bounty](shot:admin-bountydraw-run "Running a draw assigns someone")

3. **Choose Yes, run the draw.** The result appears as **Draw result**, with the winner and the time their pull request is due.

A bounty that already has someone working on it cannot be drawn again until that assignment is released.

## Change the settings

The **Settings** box lists every setting the draw uses, grouped by section: the application window, assignment, the newcomer reservation, hard gates, fit assessment and the weights. Each row shows the setting's name, what it does, and its current value.

1. **Change a value.** For a true or false setting, choose from the list. For any other setting, type the new value and leave the field. It saves straight away, without a deploy.
2. **Check it took.** An overridden setting shows **Overridden**, the coded default, and who changed it. A value the setting does not accept is refused, and an error appears at the top of the Bounty Draw section.

   ![The Settings box with one overridden weight and its Reset button](shot:admin-bountydraw-settings "Settings take effect immediately")

3. **Reset to go back.** **Reset** clears the override and returns the setting to its coded default. It is only available on overridden settings.

> [!WARNING]
> Changes apply to the next draw at once, including draws that run on their own. Simulate against a real bounty before you change a weight on a live programme.

Contributors see the same settings, their live values and any overrides on the public [bounty rules page](/bounties/rules). Anything you change here shows there.
