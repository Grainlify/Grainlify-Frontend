// Shared helpers for video flows: a visible pointer, and moving, clicking,
// typing and scrolling at a pace a viewer can follow.
//
// A headless browser draws no mouse pointer into its recording, so pointer()
// is an init script that draws one (an arrow that follows the real mouse and
// dips on press). Add it to a flow's start.init.

/** Init script: a drawn pointer that follows the mouse. */
export function pointer() {
  return {
    fn: () => {
      const make = () => {
        if (document.getElementById('docs-video-pointer')) return
        const el = document.createElement('div')
        el.id = 'docs-video-pointer'
        el.innerHTML =
          '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 L4 19 L8.6 14.9 L11.6 21.4 L14.6 20.1 L11.7 13.7 L17.8 13.4 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
        Object.assign(el.style, {
          position: 'fixed', left: '0px', top: '0px', zIndex: '2147483647', pointerEvents: 'none',
          transform: 'translate(-4px,-3px)', transition: 'transform 120ms ease-out', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))',
          display: 'none',
        })
        document.documentElement.appendChild(el)
        addEventListener('mousemove', (e) => {
          el.style.display = 'block'
          el.style.left = e.clientX + 'px'
          el.style.top = e.clientY + 'px'
        }, true)
        addEventListener('mousedown', () => (el.style.transform = 'translate(-4px,-3px) scale(0.82)'), true)
        addEventListener('mouseup', () => (el.style.transform = 'translate(-4px,-3px)'), true)
      }
      if (document.readyState === 'loading') addEventListener('DOMContentLoaded', make)
      else make()
    },
    arg: null,
  }
}

const pos = new WeakMap()
export const pause = (page, ms = 600) => page.waitForTimeout(ms)

/** Moves the pointer smoothly to (x, y). */
export async function glide(page, x, y, ms = 700) {
  const from = pos.get(page) ?? { x: 0, y: 0 }
  // Time-based, so a slow round trip (the recorder is running) doesn't stretch the move.
  const t0 = Date.now()
  for (;;) {
    const t = Math.min(1, (Date.now() - t0) / ms)
    const e = ease(t)
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e)
    if (t >= 1) break
    await page.waitForTimeout(12)
  }
  pos.set(page, { x, y })
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** Scrolls the locator into view if needed, then moves the pointer onto it (dx, dy from its centre, or {at:'left'}). */
export async function point(page, locator, { ms = 700, dx = 0, dy = 0, hold = 500, scroll = true } = {}) {
  await locator.waitFor({ state: 'visible', timeout: 15000 })
  if (scroll) await scrollIntoView(page, locator)
  const b = await locator.boundingBox()
  await glide(page, b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, ms)
  await pause(page, hold)
  return b
}

/** Points at the locator, then clicks it where the pointer is. */
export async function click(page, locator, opts = {}) {
  await point(page, locator, { hold: 250, ...opts })
  const p = pos.get(page)
  await page.mouse.down()
  await page.waitForTimeout(90)
  await page.mouse.up()
  await pause(page, opts.after ?? 600)
  return p
}

/** Types into a field at a human pace (the field should already be focused or is clicked first). */
export async function type(page, locator, text, { delay = 45, clickFirst = true } = {}) {
  if (clickFirst) await click(page, locator, { after: 250 })
  await page.keyboard.type(text, { delay })
  await pause(page, 400)
}

/** Scrolls the page smoothly by dy pixels (with the wheel, at the pointer). */
export async function scrollBy(page, dy, ms = 900) {
  await smooth(page, dy, ms)
}

/** Scrolls smoothly so the locator's top sits `top` px below the top of the viewport. */
export async function scrollTo(page, locator, { top = 110, ms = 900 } = {}) {
  await locator.waitFor({ state: 'attached', timeout: 15000 })
  const b = await locator.boundingBox()
  if (!b) return
  const dy = b.y - top
  if (Math.abs(dy) > 4) {
    await overScroller(page, locator)
    await smooth(page, dy, ms)
  }
}

/**
 * The wheel scrolls whatever is under the pointer. Some pages scroll a column
 * of their own (the project page's right-hand side), so when the pointer is not
 * over the element's scrolling ancestor, move it there first.
 */
async function overScroller(page, locator) {
  const r = await locator.evaluate((el) => {
    let s = el.parentElement
    while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement
    if (!s || s === document.body || s === document.documentElement) return null
    const b = s.getBoundingClientRect()
    return { x: b.x, y: Math.max(b.y, 0), width: b.width, height: Math.min(b.height, innerHeight - Math.max(b.y, 0)) }
  })
  if (!r) return
  const p = pos.get(page) ?? { x: 0, y: 0 }
  if (p.x >= r.x + 10 && p.x <= r.x + r.width - 10 && p.y >= r.y + 10 && p.y <= r.y + r.height - 10) return
  await glide(page, r.x + r.width * 0.55, Math.min(Math.max(p.y, r.y + 60), r.y + r.height - 60), 600)
}

/** Scrolls smoothly only as far as needed to bring the locator fully into view. */
export async function scrollIntoView(page, locator, { margin = 90 } = {}) {
  const b = await locator.boundingBox()
  if (!b) return
  const h = page.viewportSize().height
  if (b.y < margin || b.y + b.height > h - 30) await overScroller(page, locator)
  if (b.y < margin) await smooth(page, b.y - margin - 40)
  else if (b.y + b.height > h - 30) await smooth(page, Math.min(b.y - margin - 40, b.y + b.height - h + 120))
}

/** Scrolls the window (or the nearest scrollable ancestor of the pointer) smoothly by dy. */
async function smooth(page, dy, ms = 800) {
  const t0 = Date.now()
  let prev = 0
  for (;;) {
    const t = Math.min(1, (Date.now() - t0) / ms)
    const target = Math.round(dy * ease(t))
    if (target !== prev) await page.mouse.wheel(0, target - prev)
    prev = target
    if (t >= 1) break
    await page.waitForTimeout(12)
  }
  await pause(page, 250)
}
export { smooth }

/** Waits until the page's text and loading indicators stop changing. */
export async function stable(page, maxMs = 8000) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(100)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin').length)
    if (n === last) {
      if (++same >= 2) return
    } else {
      same = 0
      last = n
    }
  }
}

/**
 * "Zoom on" something: a real camera zoom would need post-production, so the
 * flow scrolls it into the middle of the view, points at it, and draws a soft
 * highlight ring around it for `ms`.
 */
export async function spotlight(page, locator, { ms = 2600, pad = 10 } = {}) {
  await scrollIntoView(page, locator)
  const b = await locator.boundingBox()
  await glide(page, b.x + Math.min(b.width - 8, 24), b.y + b.height / 2, 600)
  await page.evaluate(({ b, pad }) => {
    const el = document.createElement('div')
    el.className = 'docs-video-spotlight'
    Object.assign(el.style, {
      position: 'fixed', left: b.x - pad + 'px', top: b.y - pad + 'px', width: b.width + pad * 2 + 'px', height: b.height + pad * 2 + 'px',
      border: '3px solid #c9983a', borderRadius: '14px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.28)', pointerEvents: 'none', zIndex: '2147483646',
      opacity: '0', transition: 'opacity 250ms ease-out',
    })
    document.documentElement.appendChild(el)
    requestAnimationFrame(() => (el.style.opacity = '1'))
  }, { b, pad })
  await page.waitForTimeout(ms)
}

/** Removes any spotlight. */
export async function unspotlight(page) {
  await page.evaluate(() => document.querySelectorAll('.docs-video-spotlight').forEach((n) => n.remove()))
}

/** Where the pointer is, for flows that need it. */
export const pointerAt = (page) => pos.get(page) ?? { x: 0, y: 0 }

/**
 * Wraps a flow's segment functions so each starts by letting the page's clock
 * run again. lib.mjs installs a fake clock, and settle() and record.mjs's hold
 * advance it with clock.runFor(), which leaves it paused: timers, requestAnimationFrame
 * and Motion animations (a rail label fading in, a toast) would stop until resumed.
 */
export const segments = (fns) =>
  fns.map((fn) => async (page) => {
    await page.clock.resume()
    await fn(page)
  })

/**
 * Init script: Motion drives opacity and transform through the Web Animations
 * API, timed from the page's (fake) performance.now() but played on the real
 * document timeline. Each hold in record.mjs moves the fake clock ahead with
 * clock.runFor() while real time also passes, so the two drift apart and a
 * later animation starts seconds late (a rail label that never shows while
 * hovered). Without element.animate Motion animates on requestAnimationFrame,
 * which follows the fake clock. Nothing on these pages needs it otherwise.
 */
export function motionOnFakeClock() {
  return {
    fn: () => {
      try {
        delete Element.prototype.animate
      } catch {}
    },
    arg: null,
  }
}

/** The init scripts every flow here adds to its persona's world. */
export const videoInit = () => [pointer(), motionOnFakeClock()]
