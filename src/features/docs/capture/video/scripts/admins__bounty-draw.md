# Run a bounty draw

Length target: 60-90 seconds. Persona: admin. Start: /dashboard?tab=admin&view=admin

## 1
Say: [calm] Bounty draws run on their own when a bounty's application window closes... The Bounty Draw section lets you check a draw first, run one by hand, and change the settings behind it.
Do: Scroll down the **Admin Panel** to the **Bounty Draw** section, with **Run a draw** at the top of the screen.

## 2
Say: [friendly] Choose a bounty. The Applications box shows how many applied, how many are in the pool, and why anyone was refused.
Do: Open **Choose a bounty…** and pick a bounty with several applicants and nobody holding it. The **Applications** box appears below.

## 3
Say: [reassuring] Choose Simulate. A simulation uses the real pool and the real weights, but assigns nobody.
Do: Click **Simulate**, then **Yes, simulate**.

## 4
Say: [matter-of-fact] The result lists every applicant, their tickets, their share of the pool, and each weight that shaped it. The seed is recorded with it.
Do: The **Simulated draw** box appears. Move the pointer along the **Tickets**, **Share** and **Weights** columns, then to the seed line above the table.

## 5
Say: [serious] Run draw now assigns one applicant for real, and it CANNOT be undone from here. Read the confirmation carefully... For this demo, cancel.
Do: Click **Run draw now**. Pause on the confirmation text, then click **Cancel**.

## 6
Say: [confident] Settings take effect immediately, without a deploy. Change a value and leave the field. [pause] An overridden setting shows the default and who changed it.
Do: Scroll to **Settings**. In the **Weights** group, change `weight_first_ever_application` to a new value and press Tab. The row now shows "Overridden (default …) by" your login.

## 7
Say: [warmly] Reset returns it to the coded default. Contributors see the same settings, with their live values, on the public bounty rules page.
Do: Click **Reset** on that row; the "Overridden" line disappears. Go to /bounties/rules and scroll to the weights.
