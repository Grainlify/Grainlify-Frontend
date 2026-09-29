# GrainHack: verdicts and appeals

Length target: 60-90 seconds. Persona: admin. Start: /dashboard?tab=grainhack&view=admin&subtab=hackathons

## 1
Say: [calm] Judging and appeals are on each event's page in GrainHack admin. Open an event whose results have been published.
Do: Click the event whose phase badge reads results_published.

## 2
Say: [thoughtful] At the top of Judging is the cross-check disagreement rate: how often the two AI reviewers put the same pull request in different buckets. [pause] A rate well above the expected range usually means the bucket definitions need work.
Do: Scroll to **Judging**. Move the pointer over the **Cross-check disagreement** figure, then over **Where they disagree**.

## 3
Say: [matter-of-fact] Needs review is the default filter. Open a verdict to see the Judge and Cross-check reviews side by side, criterion by criterion, with the evidence each one cites.
Do: Click the first row under **Needs review**. Scroll through the **Judge** and **Cross-check** columns.

## 4
Say: [confident] To change the result, choose Set verdict, pick the bucket, and write why. The reason is [emphasized] required, because every override becomes a calibration example.
Do: Click **Set verdict**. Choose **Substantial** in **Bucket**. Type "Adds tests for both edge cases the issue lists; the judge missed the second test file." in **Why**. Click **Save verdict**.

## 5
Say: [calm] Uh, appeals are next. [serious] The event cannot settle, and nothing pays out, until every appeal has an answer.
Do: Scroll to **Appeals**. Pause on the line saying how many appeals are awaiting a decision.

## 6
Say: [measured] Read their grounds and the verdict underneath, then decide... Uphold it or not. If you uphold it, you can move the bucket, or leave it unchanged when only the reasoning was wrong.
Do: Move the pointer over **Their grounds** on a pending appeal. Click **Decide this appeal**. Click **Uphold**, then choose **accepted** in the bucket list.

## 7
Say: [warmly] Write the reason. The contributor sees it. Then record the decision.
Do: Type "The pull request meets both acceptance criteria; the rejection misread the diff." Click **Record decision**. The appeal now shows **Upheld** with your decision.
