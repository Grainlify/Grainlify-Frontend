// Link your Solana wallet (contributor, no wallet linked yet, Phantom in the browser).
//
// The wallet is the fixtures' stand-in Phantom (a Wallet Standard wallet that
// approves at once), so no wallet pop-up appears. The server answer for "is a
// wallet linked" turns to linked once the page has linked one, so the
// Bounties card shows it on the way back.

import { world, SOLANA_ADDRESS } from '../../world/index.mjs'
import { phantomWallet } from '../../fixtures.mjs'
import { mainThreadAnimations, cursor, click, point, moveTo, stable, wait, zoomOn, pageOf } from './_start-motion.mjs'

const w = world('contributor', { wallet: 'unlinked' })
const login = w.persona.login

const linkedPages = new WeakSet()
const api = {
  ...w.api,
  'GET /me/bounty-wallet/link': (req) =>
    linkedPages.has(pageOf(req)) ? { linked: true, wallet: SOLANA_ADDRESS, linked_at: new Date().toISOString() } : { linked: false, wallet: null, linked_at: null },
  'POST /me/bounty-wallet/link': (req) => {
    linkedPages.add(pageOf(req))
    return { linked: true, wallet: SOLANA_ADDRESS, githubLogin: login, replaced: null, unchanged: false }
  },
}


export default {
  start: {
    url: '/dashboard?tab=bounties',
    ...w,
    api,
    init: [...w.init, phantomWallet(), cursor(), mainThreadAnimations()],
    ready: (page) => page.getByText('No wallet linked', { exact: true }),
  },
  segments: [
    // 1. The Bounties page; hold on the wallet card (No wallet linked).
    async (page) => {
      await stable(page)
      await wait(page, 800)
      await point(page, page.getByText('No wallet linked', { exact: true }), { steps: 30, pause: 0 })
    },
    // 2. Link your wallet: the link page opens on step 1, Connect.
    async (page) => {
      await click(page, page.getByRole('link', { name: 'Link your wallet' }))
      await page.getByRole('heading', { name: 'Link a wallet to get paid' }).waitFor({ timeout: 15000 })
      await page.getByRole('button', { name: /Phantom/ }).waitFor({ timeout: 10000 })
      await moveTo(page, 1000, 560, { pause: 0 })
    },
    // 3. Hover Phantom (Detected), click it: the page moves to Sign to confirm.
    async (page) => {
      await point(page, page.getByRole('button', { name: /Phantom/ }), { pause: 3200, steps: 25 })
      await click(page, page.getByRole('button', { name: /Phantom/ }), { pause: 200 })
      await page.getByRole('heading', { name: 'Sign to confirm' }).waitFor({ timeout: 10000 })
      await moveTo(page, 1080, 600, { pause: 0 })
    },
    // 4. Zoom in on the message under "Your wallet will show exactly this:".
    async (page) => {
      await wait(page, 300)
      const message = page.locator('pre').filter({ hasText: 'Nonce' }).first()
      await zoomOn(page, message, { scale: 2.2, hold: 6000 })
    },
    // 5. Point at the "Free. No transaction..." line, then Sign message.
    async (page) => {
      await point(page, page.getByText('Free. No transaction.', { exact: false }), { pause: 3200, steps: 25 })
      await click(page, page.getByRole('button', { name: 'Sign message' }))
    },
    // 6. Wallet linked, Linked just now, and the address.
    async (page) => {
      await page.getByRole('heading', { name: 'Wallet linked' }).waitFor({ timeout: 10000 })
      await wait(page, 600)
      await point(page, page.getByText('Linked just now', { exact: true }), { dx: 150, dy: 2, steps: 25, pause: 0 })
    },
    // 7. Back to Bounties: the card says Wallet linked, with Copy and Change.
    async (page) => {
      await click(page, page.getByRole('link', { name: 'Back to Bounties' }))
      await page.getByText('Wallet linked', { exact: true }).first().waitFor({ timeout: 15000 })
      await stable(page)
      await point(page, page.getByText('Wallet linked', { exact: true }).first(), { steps: 30, pause: 0 })
    },
  ],
}
