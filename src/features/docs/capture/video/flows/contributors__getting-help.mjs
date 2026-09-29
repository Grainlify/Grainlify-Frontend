// Get help, as mira-dev with two earlier reports; ends signed out on /signin.
import sharp from 'sharp'
import { world } from '../../world/index.mjs'
import { supportHistory } from '../../world/extra-account.mjs'
import { click, point, reveal, zoom, unzoom, park, wait, type, cutTo, cursor, textBox, perPage, setupDone } from './_paced.mjs'

const MESSAGE = 'Search shows no results for a project I can see on Browse.'

// Two earlier reports (a Help and an Idea); the one sent in the video joins them.
const earlier = supportHistory['/support-requests/mine'].support_requests.filter((r) => r.category !== 'bug').slice(0, 2)
const state = perPage(() => ({ reports: earlier }))
const w = world('contributor')
const api = {
  ...w.api,
  '/support-requests/mine': (req) => ({ support_requests: state(req).reports, total: state(req).reports.length }),
  'POST /support-requests': (req) => {
    state(req).reports = [
      { id: 'sr-5d20be71', category: 'bug', message: MESSAGE, page_url: '/dashboard?tab=support', status: 'received', created_at: new Date().toISOString(), delivered_to_team: true, has_screenshot: true },
      ...earlier,
    ]
    return { ok: true, support_id: 'sr-5d20be71', delivered: ['telegram'] }
  },
}

/** On /signin, nobody is signed in: drop the token lib.mjs sets for the persona. */
const signedOutOnSignin = {
  fn: () => {
    if (location.pathname === '/signin') {
      try {
        localStorage.removeItem('patchwork_jwt')
      } catch {}
    }
  },
}

// A small picture to attach: a search box over an empty result list.
const bugPng = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#e9dfd0"/><rect x="24" y="24" width="432" height="44" rx="22" fill="#fff" stroke="#c9983a" stroke-width="2"/><text x="52" y="52" font-family="Arial" font-size="18" fill="#2d2820">ledgerline</text><text x="240" y="170" font-family="Arial" font-size="18" fill="#7a6b5a" text-anchor="middle">No results</text></svg>`,
  ),
)
  .png()
  .toBuffer()

const railHelp = (page) => page.locator('aside button[aria-label="Get help or report a problem"]')
const radio = (page, name) => page.getByRole('radio', { name })
const formCard = (page) => page.locator('div[class*="rounded-[24px]"]').filter({ has: page.getByRole('heading', { name: 'Get help', exact: true }) }).last()
const reportsCard = (page) => page.locator('div[class*="rounded-[24px]"]').filter({ has: page.getByRole('heading', { name: 'Your reports' }) }).last()

export default {
  start: {
    url: '/dashboard?tab=discover',
    ...w,
    api,
    init: [...w.init, signedOutOnSignin, setupDone, cursor],
    ready: (page) => railHelp(page),
  },
  segments: [
    // 1. Hover Get help at the bottom of the rail, then click it.
    async (page) => {
      await point(page, railHelp(page), { pause: 1300 })
      await click(page, railHelp(page), { scroll: false, pause: 200 })
      await page.getByRole('heading', { name: 'Get help', exact: true }).waitFor()
      await page.getByText('sr-1b9e44d0').waitFor()
      await park(page, 160)
    },
    // 2. Hover across the five categories.
    async (page) => {
      for (const name of ['Bug', 'Verification', 'Idea', 'Help', 'Other']) await point(page, radio(page, name), { pause: 650 })
    },
    // 3. Verification: zoom on the "Handled privately" note.
    async (page) => {
      await click(page, radio(page, 'Verification'))
      const note = page.getByText(/^Handled privately/)
      await note.waitFor()
      await park(page, 860)
      await zoom(page, [radio(page, 'Bug'), radio(page, 'Other'), textBox(note)], { pad: 28, max: 1.8, within: formCard(page) })
    },
    // 4. Bug.
    async (page) => {
      await unzoom(page)
      await click(page, radio(page, 'Bug'))
      await park(page, 200)
    },
    // 5. Type the message, attach search-bug.png, Send.
    async (page) => {
      const box = page.getByPlaceholder('What did you expect to happen, and what happened instead?')
      await click(page, box, { pause: 250 })
      await type(page, MESSAGE)
      await wait(page, 400)
      const attach = page.getByText('Attach a screenshot')
      await point(page, attach)
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.mouse.down().then(() => page.mouse.up())])
      await wait(page, 500)
      await chooser.setFiles({ name: 'search-bug.png', mimeType: 'image/png', buffer: bugPng })
      await page.getByText('search-bug.png').waitFor()
      await wait(page, 700)
      await click(page, page.getByRole('button', { name: 'Send', exact: true }))
      await page.getByText("Thanks - we've got it").waitFor()
    },
    // 6. The confirmation; Done.
    async (page) => {
      await wait(page, 900)
      await click(page, page.getByRole('button', { name: 'Done' }))
      await page.getByText('sr-5d20be71').waitFor()
      await park(page, 500)
    },
    // 7. Your reports: zoom on the newest report, its Received label and ID.
    async (page) => {
      const newest = reportsCard(page).locator('li').filter({ hasText: 'sr-5d20be71' })
      await reveal(page, reportsCard(page).getByRole('heading', { name: 'Your reports' }), { block: 'start', margin: 30 })
      await wait(page, 500)
      await zoom(page, [newest.getByText('Bug', { exact: true }), newest.getByText('Received'), textBox(newest.locator('p').first()), newest.locator('code')], { pad: 28, max: 1.8, within: reportsCard(page) })
    },
    // 8. Signed out on /signin: hover the Get help link below the card.
    async (page) => {
      await cutTo(page, '/signin', (p) => p.getByRole('link', { name: 'Get help' }))
      await park(page, 700)
      await wait(page, 600)
      await point(page, page.getByRole('link', { name: 'Get help' }), { pause: 800, tip: 'right' })
    },
  ],
}
