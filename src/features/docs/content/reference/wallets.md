---
updated: 2026-10-02
---

Grainlify uses two chains, for different things. This page lists which wallets work with each, and on which devices.

| Chain | What it's for | Wallets | Where you set it up |
| --- | --- | --- | --- |
| Solana | Grainlify Bounties: bounties are paid to the wallet you link | Phantom, Solflare, Backpack, and on Android the Mobile Wallet Adapter | [grainlify.com/bounties/link](/bounties/link) |
| Aptos | Your payout address, for payouts made on Aptos once claims are switched on | Petra | **Settings → Payout Preferences** |

In both cases you connect the wallet and sign one message to prove you control it. Signing costs nothing, sends no transaction and can't move funds. Grainlify never asks for your recovery phrase.

## Solana, for bounties

| Wallet | On a computer | On a phone |
| --- | --- | --- |
| Phantom | Browser extension | **Open in Phantom** reopens the page in Phantom's browser |
| Solflare | Browser extension | **Open in Solflare** reopens the page in Solflare's browser |
| Backpack | Browser extension | No shortcut. **Get Backpack** links to its download page |
| Mobile Wallet Adapter | Not used | Android only: **Use a wallet app on this phone** |

- **On a computer**, the wallet page lists the wallets installed in your browser under **Found in this browser**, marked **Detected**. Other Solana wallets that can connect and sign messages in the same standard way show up there too.
- **On a phone**, a normal browser can't see your wallet app, so the page offers the shortcuts above instead. If you're already inside a wallet app's own browser, the page finds the wallet the same way it does on a computer.
- **On Android**, **Use a wallet app on this phone** connects through the Mobile Wallet Adapter to a wallet app installed on the phone, without leaving your browser. iPhones have no equivalent.

One wallet can be linked to one GitHub account, and each GitHub account has one wallet. Linking a new one replaces the old. The steps are in [Link your Solana wallet](/docs/contributors/link-solana-wallet).

## Aptos, for your payout address

Use Petra. It's the wallet Grainlify has tested end to end for payout addresses. If no wallet is found, the page asks you to install Petra and reload.

- Only single-key accounts can be verified. A multi-key account is refused with a message saying so.
- The signing request lasts ten minutes. If it expires, start again.
- Once registered, the page shows your address, when you verified it, and the network it's registered for.

Registering a different address replaces the old one for that network. A payout is locked to the address that was registered when the payout was published, so choose a wallet you'll still have later. The steps are in [Register your payout address](/docs/contributors/payout-address).

## Which one do I need?

- To take bounties, you need a Solana wallet.
- For payouts made on Aptos, you need a payout address registered with Petra. Claims on Aptos are built but not switched on yet. [How payouts work](/docs/contributors/payouts) explains which programme pays on which chain.
