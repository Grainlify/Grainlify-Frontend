---
updated: 2026-09-27
---

Every merged GrainHack pull request is graded into a bucket: rejected, accepted, substantial or exceptional. The **Judging** section of an event's page lets you review those verdicts and set the final bucket yourself, and the **Appeals** section is where contributors' appeals get a human answer. For the contributor's side, read [Results, grading and appeals](/docs/contributors/grainhack-results).

## The disagreement rate

At the top of **Judging**, **Cross-check disagreement** shows how often the two AI reviewers put the same pull request in different buckets, out of all the pull requests both of them judged. It is shown against the expected range printed beside it, and lists the bucket pairs they disagree on most under **Where they disagree**.

![The Judging section with the disagreement rate, counts and filters](shot:admin-gh-disagreement "Cross-check disagreement")

A rate well above the expected range usually means the bucket definitions are ambiguous, most often the line between accepted and substantial, rather than a problem with the models. Below the rate are counts of judged, needing review, overridden and pre-filtered pull requests.

## Review verdicts

1. **Choose a filter.** **Needs review** is the default: verdicts flagged for a person, including possible duplicates. **All**, **Overridden** and **Pre-filtered out** show the rest.
2. **Open a verdict.** Each row shows the pull request, its author and its current bucket. A warning icon marks one that needs review.
3. **Read it.** The verdict shows the diff stats, worked out in code rather than by a model, then the **Judge** and **Cross-check** reviews side by side, and an **Escalation** review if one ran. Each review lists the criteria met or missed, with the evidence it cites. Select a cited file and line to open it on GitHub.

   ![An open verdict with the Judge and Cross-check reviews side by side](shot:admin-gh-verdict-detail "Both reviews, with citations")

If the event is in shadow mode, the verdict says so: nothing in it has been shown to the contributor, and no payout follows from it.

## Override the bucket

1. **Choose Set verdict**, or **Change verdict** if it has already been overridden.
2. **Pick the Bucket.**
3. **Write Why.** It is required. Say what the model got wrong and how you know. Overrides become examples for calibrating the judges, and one without a reason is no use as an example.
4. **Choose Save verdict.**

![The Set the final verdict window with a bucket and a reason](shot:admin-gh-override-modal "Every override needs a reason")

The verdict is marked **human override** and shows your reason under **Why this was overridden**.

## Decide an appeal

The **Appeals** section says how many appeals are awaiting a decision and where the appeal window stands. The event cannot settle, and nothing pays out, until every appeal has an answer.

Each appeal shows the contributor, the pull request, **Their grounds**, and the full verdict underneath, so you have the evidence in front of you.

![The Appeals section with an appeal awaiting a decision](shot:admin-gh-appeals "An appeal and the contributor's grounds")

1. **Choose Decide this appeal.**
2. **Choose Uphold or Do not uphold.**
3. **If you uphold it, choose a bucket.** Leave it on **Leave unchanged** if the reasoning was wrong but the outcome was right. Otherwise pick the new bucket.
4. **Write the reason.** It is required, and the contributor sees it.
5. **Choose Record decision.**

![The Decide appeal window with Uphold selected and a new bucket chosen](shot:admin-gh-appeal-modal "Uphold, optionally with a new bucket")

The appeal then shows **Upheld** or **Not upheld** with your decision. An upheld appeal with a new bucket changes the verdict's final bucket, the same way an override does.

> [!NOTE]
> A changed bucket changes the total the pool is divided by, so every contributor's share is recomputed once, when the event moves to settled. See [GrainHack: create an event](/docs/admins/grainhack-events).
