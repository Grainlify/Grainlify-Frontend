---
updated: 2026-09-29
---

Every kind of notification Grainlify sends, what sets it off, and where its link takes you. Use it to decide which ones to keep in **Settings → Notifications**, where each type has its own **In-App** and **Email** switches.

## How to read the tables

- **Name in Settings** is the row you'll find in **Settings → Notifications**. Types without a written name appear under **Other**, named after the type itself.
- **Link** is where the link inside the notification goes. Clicking the notification itself opens it on the notifications page. Some notifications have no link.
- **Email switch** says whether the **Email** switch applies. Where it says **In-app only**, the notification is shown in the app whatever the email switch says.

> [!NOTE]
> Emails go to the address in the **Email address** card at the top of **Settings → Notifications**, and only while its **Email notifications** switch is on. See [Notifications](/docs/contributors/notifications).

## As a contributor

| Name in Settings | Sent when | Link | Email switch |
| --- | --- | --- | --- |
| Application received | You apply for an issue. Your application is recorded and is with the maintainer. | **Contributors**, where your applications are listed | Applies |
| Issue assigned to you | A maintainer assigns you to an issue you applied for. | The issue | Applies |
| Application not accepted | A maintainer doesn't accept your application. | The issue, which may still be open | Applies |
| Pull request merged | A pull request you opened on a listed project is merged. | The project | Applies |
| Referral reward earned | Someone you referred completes GitHub sign-in and identity verification. | **Settings → Referrals** | Applies |
| Social follow reward earned | Your follow proof is approved, rejected, or has its approval withdrawn. The message says which, and why. | **Settings → Rewards** | Applies |
| Kyc status changed | Your identity verification is approved, not approved, sent for review, or its session expires. | **Settings** | In-app only |
| Kyc reset | Grainlify clears a verification decision so you can verify again. | **Settings** | In-app only |
| Claim deadline | A payout's claim window is closing, and once more after it has closed. | **Settings → Payout Preferences** | In-app only |

## For bounties

Sent by the bounty agent. See [Apply for a bounty](/docs/contributors/apply-for-a-bounty) for the path these follow.

| Name in Settings | Sent when | Link | Email switch |
| --- | --- | --- | --- |
| Bounty application received | Your application for a bounty is recorded and you're in the draw. | **Bounties** | In-app only |
| You won the draw | A bounty you applied for is drawn and comes to you. It gives the amount and the deadline for opening your pull request. | **Bounties** | Applies |
| Draw went to someone else | A bounty you applied for is drawn and goes to another applicant. | **Bounties** | In-app only |
| Assignment about to expire | A bounty you hold is close to running out with no pull request. Letting it lapse counts as an abandon and lowers your odds on future bounties. | The [rules page](/bounties/rules) | Applies |
| Agent reviewed your pull request | The agent posts its advisory review on a pull request you opened for a bounty. | **Bounties** | In-app only |
| Bounty paid | Your bounty payment is confirmed on-chain. It includes the transaction link. | **Bounties** | Applies |

## In GrainHack

| Name in Settings | Sent when | Link | Email switch |
| --- | --- | --- | --- |
| Grainhack assigned | You win the draw for a GrainHack issue. | None | Applies |
| Grainhack assignment released | Your assignment is released because no qualifying pull request arrived in time. This counts as an abandon. | None | Applies |
| Grainhack event ending | The event ends within 24 hours and you still hold an open assignment, or the event has closed and your assignment was released. | None | Applies |
| Assignment about to expire | Your GrainHack assignment expires within 24 hours with no qualifying pull request. Letting it lapse counts as an abandon. | None | Applies |

## As a maintainer

| Name in Settings | Sent when | Link | Email switch |
| --- | --- | --- | --- |
| New application | A contributor applies for an issue in one of your projects. | The issue in maintainer view, where you can assign or reject | Applies |
| Grainhack issue cap exceeded | You labelled an issue for GrainHack, but your organisation has already entered as many issues as the event allows. | None | Applies |
| Grainhack application accepted | Your project's GrainHack application is accepted. | None | Applies |
| Grainhack application reviewed | Your project's GrainHack application is rejected, or more information is asked for. The reason is in the message. | None | Applies |

## Listed but not sent

Two rows in Settings have nothing that sends them yet. **Reward received** is there for when payouts reach it, and **Founding position** is reserved for news about your place in the Founding Contributor Pool. Your switches for them are kept, so they take effect if these start.

**Redemption paid** and **Redemption rejected** belong to the retired points programme. [What changed](/docs/what-changed) explains what replaced it.

## Next

- [Notifications](/docs/contributors/notifications): the bell, the notifications page, and your preferences.
