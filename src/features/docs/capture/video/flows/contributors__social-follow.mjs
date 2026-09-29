// Social follow, as mira-dev holding founding place #37 with no follow proof yet.
// The Settings tab bar (which lists Billing Profiles) stays above the frame:
// the page is scrolled past it before the first frame and never scrolled back.
import { world, followVariants } from '../../world/index.mjs'
import { foundingPlace, rejectedFollow, revokedFollow, proofPng } from '../../world/extra-account.mjs'
import { click, point, zoom, unzoom, park, wait, cutTo, textBox, cursor, perPage } from './_paced.mjs'

const URL = '/dashboard?tab=settings&subtab=rewards'

// The follow state changes during the video: none, then pending once both are
// sent, then the rejected and withdrawn fixtures the later segments cut to.
const state = perPage(() => ({ follow: followVariants.none }))
const w = world('contributor', { follow: 'none' })
const api = {
  ...w.api,
  ...foundingPlace,
  '/social-follow/me': (req) => state(req).follow,
  'POST /social-follow/submit': (req) => {
    state(req).follow = followVariants.pending
    return { id: 'sf-new-1', status: 'pending' }
  },
}

const followCard = (page) => page.locator('div[class*="rounded-[24px]"]').filter({ has: page.getByRole('heading', { name: 'Social Follow' }) }).last()
const positionCard = (page) => page.locator('div[class*="rounded-[16px]"]').filter({ has: page.getByText('Founding member', { exact: true }) }).last()
const statusBox = (page) => followCard(page).locator('div.mb-6.p-4')
const row = (page, label) => followCard(page).locator('div.rounded-\\[16px\\]').filter({ has: page.getByText(label, { exact: true }) }).first()

const content = (page) => page.locator('div.space-y-6').filter({ has: page.getByRole('heading', { name: 'Social Follow' }) }).last()

/**
 * Before anything is shown: room below the page (the Rewards tab is shorter
 * than the screen) and a scroll that tucks the Settings tab bar behind the
 * blurred header, so the frame starts at the position card.
 */
async function frameRewards(page) {
  await content(page).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => {
    if (!document.getElementById('docs-video-spacer')) {
      const d = document.createElement('div')
      d.id = 'docs-video-spacer'
      d.style.height = '700px'
      document.querySelector('main').appendChild(d)
    }
  })
  const tabs = page.locator('div[class*="backdrop-blur-[40px]"]').filter({ has: page.getByRole('button', { name: 'Billing Profiles' }) }).first()
  await tabs.evaluate((n) => {
    const b = n.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + b.bottom - 62)
  })
  await page.waitForTimeout(200)
}

const ready = (page) => ({ waitFor: () => frameRewards(page) })

/** Points at "Choose screenshot" on a row, clicks it, and answers the file chooser. */
async function choose(page, label, name) {
  const button = row(page, label).getByText('Choose screenshot')
  await point(page, button, { scroll: false })
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.mouse.down().then(() => page.mouse.up())])
  await wait(page, 500)
  await chooser.setFiles({ ...proofPng(), name })
  await row(page, label).getByText('Screenshot ready').waitFor()
  await wait(page, 700)
}

export default {
  start: { url: URL, ...w, api, init: [...w.init, cursor], ready },
  segments: [
    // 1. Hold on the position card and the Social Follow card.
    async (page) => {
      await park(page, 500)
      await wait(page, 600)
    },
    // 2. Zoom on "not currently eligible" and the sentence about the position being permanent.
    async (page) => {
      const card = positionCard(page)
      await zoom(page, [textBox(card.getByText("You're not currently eligible to receive a share.")), textBox(card.getByText('Your position and multiplier are permanent', { exact: false }))], { pad: 24, within: card })
    },
    // 3. Hover Follow next to LinkedIn, then next to X.
    async (page) => {
      await unzoom(page)
      await point(page, row(page, 'LinkedIn').getByRole('link', { name: /Follow/ }), { pause: 1500 })
      await point(page, row(page, 'X').getByRole('link', { name: /Follow/ }), { pause: 1200 })
    },
    // 4. Choose a screenshot on each row.
    async (page) => {
      await choose(page, 'LinkedIn', 'linkedin-follow.png')
      await choose(page, 'X', 'x-follow.png')
    },
    // 5. Submit both: the toast and the Pending review badge.
    async (page) => {
      await click(page, page.getByRole('button', { name: 'Submit both for review' }))
      await page.getByText('Both screenshots submitted for review.').waitFor()
      await followCard(page).getByText('Pending review').waitFor()
      await park(page, 500)
    },
    // 6. Cut to the rejected fixture: zoom on the badge and the reason.
    async (page) => {
      state(page).follow = { ...followVariants.rejected, ...rejectedFollow['/social-follow/me'] }
      await cutTo(page, URL, ready)
      await park(page, 500)
      const box = statusBox(page)
      await zoom(page, [box.getByText('Not approved'), textBox(box.locator('p').first())], { pad: 36, max: 1.8, within: followCard(page) })
    },
    // 7. Cut to the withdrawn fixture: zoom on the badge, the reason and the next step.
    async (page) => {
      state(page).follow = revokedFollow['/social-follow/me']
      await cutTo(page, URL, ready)
      await park(page, 500)
      const box = statusBox(page)
      await zoom(page, [box.getByText('Eligibility withdrawn'), textBox(box.locator('p').first()), textBox(box.locator('p').last())], { pad: 36, max: 1.8, within: followCard(page) })
    },
  ],
}
