---
updated: 2026-09-27
---

After a GrainHack event closes, each merged pull request on its issues is graded against the issue's acceptance criteria. When the event publishes results, you can read the full record behind your grade, and the appeal window opens at the same moment, so nothing is decided before you can see it.

> [!NOTE]
> Grainlify doesn't notify you when results are published or when an appeal is decided. If you worked on an event, check **My results** once it reaches **Results published**.

## Read your results

Open **My GrainHack** in the rail and choose **My results**.

![My results, with a graded pull request, its criteria and citations](shot:grainhack-results "My results")

Each result shows:

- **The pull request.** Its link opens the pull request's changed files on GitHub.
- **The grade.** **Exceptional**, **Substantial**, **Accepted** or **Not accepted**.
- **Each acceptance criterion**, marked met or not met, with the evidence for it. A reference to a file and line, such as `src/auth/login.go:44-61`, is a link to those exact lines in the merged code, so you can check it yourself.
- **The reasoning** behind the grade.
- **Decided by a person**, with their reason, if a person changed the grade.

If your pull request didn't qualify, the result says why, for example "The PR author was not the contributor assigned this issue through Grainlify."

Accepted work shares the event's contributor pool. [How payouts work](/docs/contributors/payouts) covers the rest.

## Appeal a result

If you think the review got something wrong, appeal while the window is open.

1. **Choose Appeal this result.**
2. **Say what the review got wrong.** Be specific and point at the work, for example: "the review says no tests were added, but src/auth/login_test.go covers the new branch."

   ![The Appeal this result dialog, with a reason typed in](shot:grainhack-appeal-dialog "Appeal this result")

3. **Choose Submit appeal.** The result now shows **Appeal under review**, with what you wrote.

A person reads your appeal, not a model, and their decision is final. When they've decided, the result shows **Appeal upheld** or **Appeal reviewed - original result stands**, with the reviewer's reasoning.

![A result with an appeal under review](shot:grainhack-appeal-pending "Appeal under review")

## Appeal rules

- You can appeal only your own results, and each result once.
- An appeal needs a written reason. Without one, a reviewer has nothing to answer.
- The window opens when results are published and stays open for the event's **Appeal Window Days** (in **My GrainHack → Rules**). Once the event is **Settled**, the result says "The appeal window for this hackathon has closed."

## Payouts wait for appeals

Payouts are not released until every appeal has been answered. An upheld appeal can change a grade, so the event's results aren't final until the appeal window has closed and every appeal has a decision.
