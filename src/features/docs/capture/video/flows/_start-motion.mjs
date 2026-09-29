// Paced, visible pointer work for the welcome, account, browse, applying,
// wallet-link and bounty-apply video flows: a drawn cursor (Playwright's
// recording does not show the real one), moves the viewer can follow, clicks
// that land after a short pause, smooth scrolling and typing at a human pace.

/** Init script: draws a cursor that follows the mouse and pulses on click. */
export function cursor() {
  return {
    fn: () => {
      const install = () => {
        if (document.getElementById('__docs_cursor')) return
        const c = document.createElement('div')
        c.id = '__docs_cursor'
        c.innerHTML =
          '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.3 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
        Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', width: '26px', height: '26px', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-4px,-2px)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))' })
        const ring = document.createElement('div')
        ring.id = '__docs_cursor_ring'
        Object.assign(ring.style, { position: 'fixed', width: '34px', height: '34px', marginLeft: '-17px', marginTop: '-17px', borderRadius: '50%', border: '3px solid #c9983a', zIndex: '2147483646', pointerEvents: 'none', opacity: '0', transform: 'scale(.4)' })
        document.documentElement.appendChild(ring)
        document.documentElement.appendChild(c)
        const last = window.__docsPointer
        if (last) { c.style.left = last.x + 'px'; c.style.top = last.y + 'px' }
        window.addEventListener('mousemove', (e) => { window.__docsPointer = { x: e.clientX, y: e.clientY }; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; c.style.opacity = e.clientX < 3 && e.clientY < 3 ? '0' : '1' }, true)
        window.addEventListener('mousedown', (e) => {
          ring.style.left = e.clientX + 'px'
          ring.style.top = e.clientY + 'px'
          ring.style.transition = 'none'
          ring.style.opacity = '1'
          ring.style.transform = 'scale(.4)'
          requestAnimationFrame(() => requestAnimationFrame(() => {
            ring.style.transition = 'opacity .45s ease-out, transform .45s ease-out'
            ring.style.opacity = '0'
            ring.style.transform = 'scale(1.3)'
          }))
        }, true)
      }
      const tryInstall = () => { if (document.body) install() }
      document.addEventListener('DOMContentLoaded', tryInstall)
      new MutationObserver(() => { if (document.body && !document.getElementById('__docs_cursor')) install() }).observe(document, { childList: true, subtree: true })
    },
    arg: null,
  }
}

export const wait = (page, ms) => page.waitForTimeout(ms)

/**
 * A point inside the element's scrolling box (its nearest scrollable
 * ancestor, or the window) and inside the window, for the wheel: the wheel
 * scrolls whatever is under the pointer.
 */
async function wheelPoint(page, locator) {
  const { width, height } = page.viewportSize()
  const r = await locator.evaluate((n) => {
    const b = n.getBoundingClientRect()
    for (let p = n.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) {
        const c = p.getBoundingClientRect()
        return { x: b.x + b.width / 2, box: { top: c.top, bottom: c.bottom, left: c.left, right: c.right } }
      }
    }
    return { x: b.x + b.width / 2, box: null }
  })
  const box = r.box ?? { top: 0, bottom: height, left: 0, right: width }
  const top = Math.max(box.top, 100)
  const bottom = Math.min(box.bottom, height)
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  return { x: clamp(r.x, Math.max(box.left, 90) + 20, Math.min(box.right, width) - 20), y: (top + bottom) / 2 }
}

/** Scrolls an element into view (smoothly) if any part of it is off screen. */
export async function reveal(page, locator, { margin = 90 } = {}) {
  const l = locator.first()
  await l.waitFor({ timeout: 20000 })
  const vh = page.viewportSize().height
  for (let i = 0; i < 3; i++) {
    const b = await l.boundingBox()
    if (!b || (b.y >= margin && b.y + b.height <= vh - 20)) return
    const target = b.height > vh - margin - 40 ? margin : Math.max(margin, (vh - b.height) / 2)
    await scrollBy(page, b.y - target, { at: await wheelPoint(page, l) })
  }
}

/** Moves the pointer to the centre of an element (or an offset in it) and pauses. */
export async function point(page, locator, { pause = 400, dx = 0, dy = 0, steps = 20, scroll = true } = {}) {
  const l = locator.first()
  if (scroll) await reveal(page, l)
  else await l.waitFor({ timeout: 20000 })
  // Wait out any entrance animation, so the pointer lands where the element settles.
  let b = await l.boundingBox()
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(100)
    const n = await l.boundingBox()
    const same = Math.abs(n.x - b.x) < 0.5 && Math.abs(n.y - b.y) < 0.5
    b = n
    if (same) break
  }
  const x = b.x + b.width / 2 + dx
  const y = b.y + b.height / 2 + dy
  await page.mouse.move(x, y, { steps })
  await page.waitForTimeout(pause)
  return { x, y }
}

/** Points at an element, pauses, and clicks it where the pointer is. */
export async function click(page, locator, opts = {}) {
  const { x, y } = await point(page, locator, opts)
  await page.mouse.down()
  await page.waitForTimeout(70)
  await page.mouse.up()
  await page.waitForTimeout(opts.after ?? 300)
  return { x, y }
}

/** Moves the pointer to a point on screen. */
export async function moveTo(page, x, y, { pause = 300, steps = 20 } = {}) {
  await page.mouse.move(x, y, { steps })
  await page.waitForTimeout(pause)
}

/**
 * Scrolls by dy pixels in small wheel steps. The wheel scrolls whatever is
 * under the pointer, so `at` picks the scroller (default: where the pointer is).
 */
export async function scrollBy(page, dy, { at, step = 60, delay = 0, max = 14 } = {}) {
  if (at) await page.mouse.move(at.x, at.y, { steps: 10 })
  const n = Math.min(max, Math.max(1, Math.ceil(Math.abs(dy) / step)))
  const each = dy / n
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, each)
    await page.waitForTimeout(delay)
  }
  await page.waitForTimeout(250)
}

/** Scrolls until an element's top sits `top` px from the top of the window. */
export async function scrollTo(page, locator, { top = 110, at } = {}) {
  const l = locator.first()
  await l.waitFor({ timeout: 20000 })
  for (let i = 0; i < 3; i++) {
    const b = await l.boundingBox()
    const d = b.y - top
    if (Math.abs(d) < 30) return
    await scrollBy(page, d, { at: at ?? (await wheelPoint(page, l)) })
  }
}

/** Types at a human pace. */
export async function type(page, text, delay = 60) {
  await page.keyboard.type(text, { delay })
}

/** Waits until the page's text stops changing. */
export async function stable(page, maxMs = 2500) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(120)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin').length)
    if (n === last) {
      if (++same >= 2) return
    } else {
      same = 0
      last = n
    }
  }
}

/** The page a request came from, for fixtures that change after an action. */
export const pageOf = (req) => {
  try {
    return req.frame().page()
  } catch {
    return null
  }
}

/**
 * Init script: a saved billing profile in this browser, so Discover's "Finish
 * setup" nudge (billing and identity checklist, left out of the docs) is not
 * shown, as for anyone who has finished setup.
 */
export function setupDone() {
  return {
    fn: () => {
      try {
        if (!localStorage.getItem('billing_profiles')) localStorage.setItem('billing_profiles', JSON.stringify([{ id: 'bp-docs', name: 'Personal', type: 'individual' }]))
      } catch {}
    },
    arg: null,
  }
}

/** A rail icon by its id (discover, browse, osw, contributors, my-grainhack, bounties, leaderboard). */
export const rail = (page, id) => page.locator(`button[data-tour-id="${id}"]`)

/** Hovers a rail icon until its label tooltip shows. */
export async function hoverRail(page, id, { pause = 1200 } = {}) {
  await point(page, rail(page, id), { pause: 0, scroll: false })
  await page.locator('div.fixed.pointer-events-none').filter({ visible: true }).first().waitFor({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(pause)
}

/**
 * A `ready` for flow.start that also runs setup before the first segment
 * (record.mjs only calls .waitFor on what ready returns).
 */
export const readyThen = (locatorFn, after) => (page) => ({
  waitFor: async (opts) => {
    await locatorFn(page).first().waitFor(opts)
    if (after) await after(page)
  },
})

/**
 * Magnifies the page around an element (an animated zoom, like a camera push
 * in), holds, and zooms back out. Nothing in the app changes.
 */
export async function zoomOn(page, locator, { scale = 1.8, hold = 3000, ms = 700, text = false } = {}) {
  const l = locator.first()
  await reveal(page, l)
  // With `text`, frame the text itself rather than its (possibly full-width) box.
  const b = text
    ? await l.evaluate((n) => {
        const r = document.createRange()
        r.selectNodeContents(n)
        const t = r.getBoundingClientRect()
        return { x: t.x, y: t.y, width: t.width, height: t.height }
      })
    : await l.boundingBox()
  const vp = page.viewportSize()
  const s = Math.min(scale, (vp.width * 0.92) / b.width, (vp.height * 0.86) / b.height)
  // Scale about a point chosen so the element ends up centred on screen.
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const tx = vp.width / 2 - cx
  const ty = vp.height / 2 - cy
  await page.evaluate(([tx, ty, s, ms]) => {
    const el = document.documentElement
    const c = document.getElementById('__docs_cursor')
    if (c) { c.style.transition = 'opacity .3s'; c.style.visibility = 'hidden' }
    el.style.transformOrigin = `${window.innerWidth / 2}px ${window.scrollY + window.innerHeight / 2}px`
    el.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`
    el.style.transform = `scale(${s}) translate(${tx}px, ${ty}px)`
  }, [tx, ty, s, ms])
  await page.waitForTimeout(ms + hold)
  await page.evaluate(() => { document.documentElement.style.transform = '' })
  await page.waitForTimeout(ms)
  await page.evaluate(() => {
    const el = document.documentElement
    el.style.transition = ''
    el.style.transformOrigin = ''
    const c = document.getElementById('__docs_cursor')
    if (c) c.style.visibility = ''
  })
}

/**
 * Init script: framer-motion runs its animations on the main thread instead of
 * the Web Animations API. The recording's clock is Playwright's (installed,
 * then resumed), and WAAPI animations are timed by the browser's real document
 * timeline, so framer's start times can land seconds in the future and leave a
 * tooltip or the product tour at opacity 0. On the main thread framer reads the
 * same clock as everything else. What is drawn is the same either way.
 */
export function mainThreadAnimations() {
  return {
    fn: () => {
      try {
        delete Element.prototype.animate
      } catch {}
    },
    arg: null,
  }
}
