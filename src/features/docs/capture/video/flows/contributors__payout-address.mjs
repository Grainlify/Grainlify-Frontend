// Register your payout address: the readiness card, connecting and signing
// with Petra, the verified card, the payout contact, and the readiness card
// after a reload.
//
// Framing: Payout Preferences is exactly one screen tall, so no scroll can put
// the Settings tab bar (it lists Billing Profiles) above the frame or the Base
// card below it. Both are hidden for this recording instead (display: none),
// which leaves the readiness card and the Aptos address card, untouched, as
// the only things on the page.
import { world, APTOS_ADDRESS } from '../../world/index.mjs'
import { apiFor, initFor } from '../../world/index.mjs'
import { startWith, click, point, zoom, unzoom, ring, unring, type } from './_money-motion.mjs'

const opts = { readiness: 'register_now', payoutAddress: false }
const registered = apiFor('contributor') // the same world with an address and readiness 'ready'
const pageOf = (req) => {
  try {
    return req.frame().page()
  } catch {
    return null
  }
}

// Per recorded page: whether the address has been verified, and the saved contact.
const verified = new WeakMap()
const contact = new WeakMap()
const api = {
  'GET /me/payout-address': (req) => verified.get(pageOf(req)) ?? { error: 'no_payout_address' },
  'POST /me/payout-address': (req) => {
    const saved = { chain_id: 'aptos-testnet', address: APTOS_ADDRESS, verified_at: new Date().toISOString(), replaced: null }
    verified.set(pageOf(req), { chain_id: saved.chain_id, address: saved.address, verified_at: saved.verified_at })
    return saved
  },
  '/me/payout-readiness': (req) => (verified.has(pageOf(req)) ? registered['/me/payout-readiness'] : apiFor('contributor', opts)['/me/payout-readiness']),
  '/me/payout-contact': (req) => ({ email: contact.get(pageOf(req)) ?? '' }),
  'PUT /me/payout-contact': (req) => {
    let email = ''
    try {
      email = req.postDataJSON().email
    } catch {}
    contact.set(pageOf(req), email)
    return { email }
  },
}

// No address yet is a 404 the app reads as "none". world's init would answer
// every GET of it with a 404 (its map has none in this state), even after
// verifying; so the init comes from the registered world, which leaves the
// path alone, and this script turns the map's "none" answer into the 404.
const noAddressUntilVerified = {
  fn: () => {
    const original = window.fetch
    window.fetch = async function (input, init) {
      const res = await original.apply(this, arguments)
      try {
        const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const url = new URL(raw, location.href)
        const method = String((init && init.method) || 'GET').toUpperCase()
        if (method === 'GET' && url.pathname === '/me/payout-address') {
          const body = await res.clone().json()
          if (body && body.error) return new Response(JSON.stringify(body), { status: 404, headers: { 'content-type': 'application/json' } })
        }
      } catch {}
      return res
    }
  },
  arg: null,
}

// Petra in the browser, which waits for the flow to approve each prompt. The
// real extension's windows are not part of the page, so the video shows the
// app waiting ("Waiting for your wallet…") while the narration describes them.
const petra = {
  fn: (address) => {
    const gates = (window.__petraGates = {})
    const gate = (name) => new Promise((resolve) => (gates[name] = resolve))
    const provider = {
      connect: async () => {
        await gate('connect')
        return { address, publicKey: '0x' + 'bb'.repeat(32) }
      },
      account: async () => ({ address, publicKey: '0x' + 'bb'.repeat(32) }),
      isConnected: async () => true,
      signMessage: async (req) => {
        await gate('sign')
        return { signature: 'cc'.repeat(64), fullMessage: `APTOS\nmessage: ${req.message}\nnonce: ${req.nonce}`, message: req.message, nonce: req.nonce, prefix: 'APTOS' }
      },
    }
    window.petra = provider
    window.aptos = provider
  },
  arg: APTOS_ADDRESS,
}
const approve = async (page, name) => {
  await page.waitForFunction((n) => typeof window.__petraGates?.[n] === 'function', name, { timeout: 20000 })
  await page.evaluate((n) => window.__petraGates[n](), name)
}

// Hides the Settings tab bar and the Base card (see the note at the top).
const frame = {
  fn: () => {
    const hide = () => {
      if (!document.getElementById('__vid-frame') && document.head) {
        const st = document.createElement('style')
        st.id = '__vid-frame'
        st.textContent = '[data-testid="base-address-card"]{display:none!important}'
        document.head.appendChild(st)
      }
      for (const b of document.querySelectorAll('button')) {
        if (b.textContent.trim() !== 'Billing Profiles') continue
        // The button sits in the tab row, inside the tab bar's card.
        const bar = b.parentElement && b.parentElement.parentElement
        if (bar && bar.style.display !== 'none') bar.style.display = 'none'
      }
    }
    new MutationObserver(hide).observe(document, { childList: true, subtree: true })
  },
  arg: null,
}

const CARD = 'div[class*="rounded-[16px]"]'
const card = (page, text) => page.locator(CARD).filter({ has: page.getByText(text, { exact: true }) }).last()
const readiness = (page) => page.locator(CARD).filter({ has: page.getByText(/^(Register a payout address|You're set up for payouts)$/) }).last()
const addressCard = (page) => page.locator(CARD).filter({ has: page.getByText(/^(Register your payout address|Payout address verified)$/) }).last()

// The registered world's init: the same 404 rules, minus the payout address.
const w = { ...world('contributor', opts), init: initFor('contributor', { ...opts, payoutAddress: true }) }
export default {
  start: startWith(w, {
    url: '/dashboard?tab=settings&subtab=payout',
    api,
    init: [noAddressUntilVerified, petra, frame],
    ready: (page) => page.getByRole('button', { name: 'Connect wallet and verify' }),
  }),
  segments: [
    // 1. The two cards.
    async (page) => {
      await page.waitForTimeout(800)
      await point(page, readiness(page).getByText('Register a payout address', { exact: true }), { pause: 2500 })
      await point(page, addressCard(page).getByText('Register your payout address', { exact: true }))
    },
    // 2. The readiness card headed Register a payout address.
    async (page) => {
      const r = readiness(page)
      await point(page, r.getByText('Register a payout address', { exact: true }), { pause: 300 })
      await zoom(page, [r.locator('svg').first(), r.getByText('Register a payout address', { exact: true }), r.getByText('Registering takes about a minute', { exact: false })], { scale: 1.5, align: 'start' })
    },
    // 3. Connect wallet and verify: the button waits for the wallet.
    async (page) => {
      await unzoom(page)
      await click(page, page.getByRole('button', { name: 'Connect wallet and verify' }), { after: 300 })
      await page.getByRole('button', { name: 'Waiting for your wallet…' }).waitFor({ timeout: 20000 })
    },
    // 4. The connection approved; now the signing prompt (still waiting).
    async (page) => {
      await approve(page, 'connect')
      await page.waitForFunction(() => typeof window.__petraGates?.sign === 'function', null, { timeout: 20000 })
    },
    // 5. Signed: the toast, the heading, the address and the Verified line.
    async (page) => {
      await approve(page, 'sign')
      const c = addressCard(page)
      await c.getByText('Payout address verified', { exact: true }).waitFor({ timeout: 20000 })
      await point(page, c.getByText('Payout address verified', { exact: true }), { pause: 1200 })
      await zoom(page, [c.getByText('Payout address verified', { exact: true }), c.getByText(APTOS_ADDRESS), c.getByText(/^Verified /)], { scale: 1.8, align: 'start' })
    },
    // 6. Choose a wallet you'll still have later.
    async (page) => {
      await unzoom(page)
      const para = addressCard(page).getByText("Choose a wallet you'll still have later.", { exact: false })
      await ring(page, para, { pad: 8 })
      await point(page, para)
    },
    // 7. The payout contact: type, Save, the toast.
    async (page) => {
      await unring(page)
      await click(page, page.locator('#payout-contact'), { after: 200 })
      await type(page, 'mira@example.com')
      await page.waitForTimeout(300)
      await click(page, addressCard(page).getByRole('button', { name: 'Save', exact: true }))
      await page.getByText("We'll use this to tell you about payouts.").waitFor({ timeout: 20000 })
    },
    // 8. Reload: You're set up for payouts.
    async (page) => {
      await page.waitForTimeout(1500)
      await page.reload()
      await page.getByText("You're set up for payouts").waitFor({ timeout: 20000 })
      await page.waitForTimeout(400)
      await point(page, page.getByText("You're set up for payouts"))
    },
  ],
}
