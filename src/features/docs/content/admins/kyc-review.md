---
updated: 2026-10-02
---

Contributors whose identity verification needs a person's decision wait in **Verification review**, its own entry in the admin sidebar. You decide the case in Didit, then use this queue to tell the contributor what to fix and let them verify again.

## What the queue shows

Each row is one contributor, with a badge for the kind of case.

| Badge | What it means |
| --- | --- |
| **In review** | Didit has passed the session to Grainlify for a manual decision. Nothing happens until someone acts. |
| **Refused** | Didit refused the verification. The contributor may still need telling why. |

A row also shows the contributor's GitHub login, the Didit session number, the session id with a copy button, how long they have been waiting, and how many times they have been reset before. When the queue is empty it says **Nobody is waiting on a verification decision.**

![The Verification Review queue with one In review and one Refused case](shot:admin-kyc-queue "Verification Review")

The queue never shows the document, Didit's decision or its warnings. Read those in the Didit console.

## Review a case

1. **Find the session in Didit.** Match the row by its Didit session number, which is the number Didit's verification table shows. If you need certainty, copy the session id with the copy button next to it.
2. **Decline it in Didit first, if it should be declined.** Resetting here does not reach Didit. It only detaches the session on Grainlify's side.
3. **Choose Send feedback & reset.** A window titled **Reset** and the contributor's login opens.
4. **Choose what they should fix.** Under **What should they fix?**, every reason shows the exact message the contributor will read. A reason marked **suggested** matches Didit's warnings. When exactly one is suggested, it is already selected.

   ![The reset window with a suggested reason selected and both fields filled in](shot:admin-kyc-reset-modal "Pick a reason, add a note, record why")

5. **Add a note for them, if it helps.** The note field is marked **(they read this)** and is added after the reason's message. It is required for **Something else (write a note)**, because the note is then all they have to act on.
6. **Record why you are resetting.** The field **Why are you resetting?** is internal. The contributor never sees it. It is required and kept with the reset.
7. **Choose Send & reset.**

## The reasons

| Reason | Use it when |
| --- | --- |
| Document couldn't be read | Details on the document were not legible |
| Document type not recognised | The upload was not a recognisable ID document, or was cropped |
| Photo of a screen, not the document | They photographed a screen or a photocopy |
| Selfie didn't match the document | The face check failed |
| Verification session expired | They did not finish in time |
| Details didn't match the document | The details read from the document were inconsistent |
| Something else (write a note) | None of the above. A note is required. |

## What happens to the contributor

- Their verification is reset, so they can start a new one straight away.
- They get a notification on Grainlify titled "You can verify your identity again", with the reason's message, your note, and where to start again.
- The case leaves the queue.

A reset never marks anyone verified, and a contributor who is already verified cannot be reset.

> [!WARNING]
> If the confirmation says the notification did not reach them, the reset still happened but they have not been told. Tell them another way.
