// Video flow for "Link your Solana wallet"
// (wip-notes/video-scripts/contributors__link-solana-wallet.md).
//
// mira-dev with no wallet linked, and a Phantom wallet in the browser (the
// Wallet Standard stand-in from fixtures.mjs, which connects and signs without
// a popup). Once the link is signed, the wallet endpoint answers "linked" so
// the Bounties page shows it on the way back. "Zoom on" is a highlight.

import { world } from '../../world/index.mjs'
import { phantomWallet } from '../../fixtures.mjs'
import { videoInit, point, click, pause, stable, glide, spotlight, unspotlight, segments } from './_human.mjs'

const C = world('contributor', { wallet: 'unlinked' })
const ADDRESS = '7Qm9YtVx3sLhE2pWcNaK5dRfG8uB4jZ6oTnHqPiXkM1s'
const apiPath = (p) => (url) => /^(localhost:8080|api\.grainlify\.com)$/.test(url.host) && url.pathname === p
/** The wallet card: the nearest box around its heading that also holds its button. */
const walletCard = (page) => page.getByText(/^(No wallet linked|Wallet linked)$/).first().locator('xpath=ancestor::*[.//*[self::a or self::button][contains(., "Link your wallet") or contains(., "Change")]][1]')
const linkButton = (page) => page.getByRole('button', { name: /Link your wallet/ }).or(page.getByRole('link', { name: /Link your wallet/ })).first()

export default {
  start: {
    url: '/dashboard?tab=bounties',
    persona: C.persona,
    api: C.api,
    agent: C.agent,
    init: [...C.init, phantomWallet(), ...videoInit()],
    ready: (page) => page.getByText('No wallet linked'),
  },
  segments: segments([
    // 1. The Bounties page; the wallet card says No wallet linked.
    async (page) => {
      await stable(page)
      await pause(page, 600)
      await point(page, page.getByText('No wallet linked'), { ms: 1200, hold: 400 })
      await spotlight(page, walletCard(page), { ms: 400, pad: 6 })
    },
    // 2. Link your wallet: "Link a wallet to get paid", on step 1, Connect.
    async (page) => {
      await unspotlight(page)
      await click(page, linkButton(page), { ms: 900, after: 400 })
      await page.getByRole('heading', { name: 'Link a wallet to get paid' }).waitFor()
      await stable(page)
      await glide(page, 720, 330, 800)
    },
    // 3. Phantom, marked Detected; choosing it moves to Sign to confirm.
    async (page) => {
      const phantom = page.getByRole('button', { name: /Phantom/ })
      await point(page, phantom, { ms: 900, hold: 1500 })
      await click(page, phantom, { ms: 100, after: 400 })
      await page.getByRole('heading', { name: 'Sign to confirm' }).waitFor()
      await stable(page)
    },
    // 4. The message the wallet will show.
    async (page) => {
      const label = page.getByText(/Your wallet will show exactly this/)
      const message = page.locator('pre, code, div').filter({ hasText: /^Grainlify: link this wallet/ }).last()
      await point(page, label, { ms: 800, hold: 300 })
      await spotlight(page, message, { ms: 400, pad: 8 })
    },
    // 5. The "Free. No transaction." line, then Sign message.
    async (page) => {
      await unspotlight(page)
      await point(page, page.getByText(/Free\. No transaction\./), { ms: 900, hold: 2200 })
      const when = await page.evaluate(() => new Date().toISOString())
      await page.route(apiPath('/me/bounty-wallet/link'), (r) =>
        r.request().method() === 'GET' ? r.fulfill({ json: { linked: true, wallet: ADDRESS, linked_at: when } }) : r.fallback(),
      )
      await click(page, page.getByRole('button', { name: 'Sign message' }), { ms: 800, after: 300 })
    },
    // 6. Wallet linked, Linked just now, and the address.
    async (page) => {
      await page.getByRole('heading', { name: 'Wallet linked' }).waitFor()
      await point(page, page.getByRole('heading', { name: 'Wallet linked' }), { ms: 900, hold: 900 })
      await point(page, page.getByText(ADDRESS).first(), { ms: 900, hold: 300 })
    },
    // 7. Back to Bounties: the card says Wallet linked, with Copy and Change.
    async (page) => {
      await pause(page, 1500)
      await click(page, page.getByRole('button', { name: /Back to Bounties/ }).or(page.getByRole('link', { name: /Back to Bounties/ })).first(), { ms: 900, after: 400 })
      await page.getByText('Change', { exact: true }).waitFor()
      await stable(page)
      await point(page, page.getByText('Copy', { exact: true }), { ms: 900, hold: 500 })
      await point(page, page.getByText('Change', { exact: true }), { ms: 600, hold: 300 })
    },
  ]),
}
