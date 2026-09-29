// Verification review, as ada-admin on Reviews. The queue (world/admin.mjs):
// ines-byte and tomas-rivet in review, dara-loop refused with no suggested
// reason. The reset is answered by the fixture, and the queue answers without
// dara-loop once it has been reset on this page.

import { world } from '../../world/index.mjs'
import { extraAdminApi } from '../../world/extra-admin.mjs'
import { adminBountyReposWorld } from '../../world/extra-bounty-repos.mjs'
import { initScripts, clipboardOk, point, click, type, scrollTo, wait, waitStable, card, modal, perPage } from './_am.mjs'

const W = world('admin')
const base = { ...W.api, ...extraAdminApi(W.api), 'GET /admin/bounty-repos': adminBountyReposWorld().api['GET /admin/bounty-repos'] }
const WHO = 'dara-loop'
const state = perPage(() => ({ reset: false }))

const api = {
  ...base,
  '/admin/kyc/pending': (req) => {
    const all = base['/admin/kyc/pending'].pending
    return { pending: state(req).reset ? all.filter((k) => k.github_login !== WHO) : all }
  },
  [`POST /admin/kyc/u-${WHO}/reset`]: (req) => {
    state(req).reset = true
    const b = JSON.parse(req.postData() || '{}')
    return { ...base[`POST /admin/kyc/u-${WHO}/reset`], previous_status: 'rejected', reason_code: b.reason_code }
  },
}

const queue = (page) => card(page, 'Verification Review')
const row = (page, login) => queue(page).locator('div[class*="rounded-[14px]"]', { has: page.getByText(login, { exact: true }) }).last()

export default {
  start: {
    url: '/dashboard?tab=admin&view=admin',
    ...W,
    api,
    init: [...initScripts(W), clipboardOk],
    ready: (page) => page.getByRole('heading', { name: 'Admin Panel' }),
  },
  segments: [
    // 1. Down to Verification Review.
    async (page) => {
      await waitStable(page)
      await queue(page).getByText(WHO, { exact: true }).waitFor()
      await scrollTo(page, queue(page), { top: 100 })
    },
    // 2. In review, then Refused.
    async (page) => {
      await point(page, row(page, 'ines-byte').getByText('In review', { exact: true }), { pause: 1600 })
      await point(page, row(page, WHO).getByText('Refused', { exact: true }), { pause: 500 })
    },
    // 3. The Didit session number, then copy the session id.
    async (page) => {
      await point(page, row(page, WHO).getByText(/^Didit session/), { pause: 1400, left: 40 })
      await click(page, page.getByRole('button', { name: `Copy session id for ${WHO}` }))
    },
    // 4. Send feedback & reset.
    async (page) => {
      await click(page, row(page, WHO).getByRole('button', { name: 'Send feedback & reset' }))
      await modal(page).getByText(`Reset ${WHO}`).waitFor()
    },
    // 5. What should they fix?
    async (page) => {
      const m = modal(page)
      const legend = m.getByText('What should they fix?')
      await point(page, legend, { pause: 300, left: 60 })
      // The window's body scrolls: wheel it slowly down through the reasons.
      const choice = m.locator('label', { hasText: 'Photo of a screen, not the document' })
      await scrollTo(page, m.locator('label', { hasText: 'Something else (write a note)' }), { top: 560 })
      await wait(page, 400)
      await click(page, choice.getByText('Photo of a screen, not the document'), { pause: 500 })
    },
    // 6. The note they read, then the internal reason.
    async (page) => {
      const m = modal(page)
      await click(page, m.getByPlaceholder('Optional, added after the message above'), { after: 150 })
      await type(page, 'Please photograph the original card, not a scan.')
      await click(page, m.getByPlaceholder('Recorded against the reset, for whoever asks later'), { after: 150 })
      await type(page, 'Screen capture flagged in Didit, declined there first.')
    },
    // 7. Send & reset: the row leaves the queue.
    async (page) => {
      await click(page, modal(page).getByRole('button', { name: 'Send & reset' }))
      await page.getByText('can verify again and has been told why.', { exact: false }).waitFor()
      await queue(page).getByText(WHO, { exact: true }).waitFor({ state: 'detached' })
      await wait(page, 300)
      await point(page, row(page, 'tomas-rivet'), { pause: 300, left: 200, dy: 40 })
    },
  ],
}
