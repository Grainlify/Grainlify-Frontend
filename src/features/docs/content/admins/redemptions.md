---
updated: 2026-10-02
---

The retired points programme let contributors ask for their points to be paid out in USDC. Nobody can make a new request any more: the programme has been replaced by the [Founding Contributor Pool](/docs/rewards). Requests made before it closed may still be waiting, and **Redemptions**, its own entry in the admin sidebar, is where you finish them.

## The queue

Only pending requests are listed. Each one shows the contributor's login, the points they spent and the USDC amount those points are worth, and the wallet address they gave. The address is a Stellar address. Select it to copy it.

When the queue is empty it says **No pending redemptions.**

![The Redemption Requests queue with pending requests](shot:admin-redemptions-queue "Redemption Requests")

The points were taken from the contributor's balance when they made the request, so the same points cannot be claimed twice.

## Pay a request

Grainlify does not send the USDC for you.

1. **Copy the wallet address** from the request.
2. **Send the USDC amount shown** to that address yourself.
3. **Choose the tick icon, Mark as paid,** once the transfer has gone through.

The request leaves the queue, and the contributor is notified that their points redemption has been paid out.

> [!WARNING]
> Mark as paid only after the transfer has been sent. The app has no way to check that it was, and the contributor is told they have been paid as soon as you mark it.

## Reject a request

1. **Choose the cross icon, Reject and refund.** The **Reject Redemption** window says how many points will be refunded.
2. **Add a reason, if you want.** **Reason (optional)** is kept with the request. It is not included in the contributor's notification.
3. **Choose Reject & Refund.**

![The Reject Redemption window with a reason written](shot:admin-redemptions-reject-modal "Rejecting refunds the points")

The points go back to the contributor's balance and they are notified that the request was rejected and refunded.
