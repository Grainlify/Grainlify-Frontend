# GrainHack: create an event

Length target: 60-90 seconds. Persona: admin. Start: /dashboard?tab=grainhack&view=admin&subtab=hackathons

## 1
Say: [calm] Every GrainHack event starts as a draft that only admins can see. In GrainHack admin, choose New hackathon.
Do: The **Hackathons** list is on screen, each event with its phase. Click **New hackathon**.

## 2
Say: [warmly] Give it a name and choose Create draft. The event opens straight away.
Do: Type "GrainHack Docs Demo" in **Name**. Click **Create draft**. The event page opens with the **Draft** badge.

## 3
Say: [matter-of-fact] The requirements box lists what is missing before the next phase... Here, the announcement date and the application period.
Do: Move the pointer down the three items under **Requirements for Application period**.

## 4
Say: [thoughtful] Fill in the dates, which are in your local time, then the merge grace period and the sponsor total. [pause] Grainlify takes the platform fee off the sponsor total and splits the rest into the contributor and maintainer pools.
Do: Fill **Announced at**, **Application period start**, **Application period end**, **Issue prep start**, **Starts at (live)** and **Ends at** with dates in order over the coming weeks. Type 48 in **Merge grace period (hours)** and 10000 in **Sponsor total (USDC)**.

## 5
Say: [pleased] Save the fields. The requirements clear, and you can move the event on... Phases only go forward, ONE step at a time.
Do: Click **Save fields**. "Ready to transition." appears. Click **Move to Application period**; the badge changes to **Application period**.

## 6
Say: [friendly] Uh, going live needs more than dates. Judging shadow mode must be off, and at least one issue must be published.
Do: Move the pointer over the **Move to Issue prep** button, then scroll down to **Rule overrides for this event**.

## 7
Say: [encouraging] To change a rule for this event only, edit it here and save. It's marked overridden, and the reset icon puts it back to the global default.
Do: In **Contributor slots and caps**, change **Slots Per Contributor** to 3. Click **Save changes**. The row shows **overridden** and the reset icon.

## 8
Say: [reassuring] Every override, reset and phase move is recorded in the audit trail at the bottom of the event page.
Do: Scroll to **Audit trail**. It shows the `slots_per_contributor` change and a **Phase transition** entry.
