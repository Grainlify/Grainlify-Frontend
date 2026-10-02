---
updated: 2026-10-02
---

Bounty draws run on their own when a bounty's application window closes. The **Bounty draw settings** page, its own entry in the admin sidebar, is where you change the settings every bounty draw uses: window lengths, the automatic draw, gates and weights. For how contributors see the draw, read [How Grainlify Bounties work](/docs/contributors/bounties).

## Running, simulating and unassigning are the maintainer's

Admins no longer run draws on a single bounty. Simulating a draw, running or redrawing one, ending an assignment and moving a deadline are done by the bounty repository's maintainers, on each bounty in the **Bounties** tab in **Maintainers**. Anyone with write, maintain or admin access to that repository on GitHub sees the controls. [Bounties on your repositories](/docs/maintainers/bounties#what-you-can-do) describes them. Every real draw and unassign is listed publicly under **Draw history** on the bounty.

## Change the settings

Choose **Bounty draw settings** in the admin sidebar. The **Settings** box lists every setting the draw uses, grouped by section: the application window, assignment, the newcomer reservation, hard gates, fit assessment and the weights. Each row shows the setting's name, what it does, and its current value.

1. **Change a value.** For a true or false setting, choose from the list. For any other setting, type the new value and leave the field. It saves straight away, without a deploy.
2. **Check it took.** An overridden setting shows **Overridden**, the coded default, and who changed it. A value the setting does not accept is refused, and an error appears at the top of the page.

   ![The Settings box with one overridden weight and its Reset button](shot:admin-bountydraw-settings "Settings take effect immediately")

3. **Reset to go back.** **Reset** clears the override and returns the setting to its coded default. It is only available on overridden settings.

> [!WARNING]
> Changes apply to the next draw at once, including draws that run on their own. There is no simulate button on this page. A maintainer of the bounty's repository can simulate a draw on a real bounty from the **Bounties** tab in **Maintainers**; ask one to before you change a weight on a live programme.

Contributors see the same settings, their live values and any overrides on the public [bounty rules page](/bounties/rules). Anything you change here shows there.
