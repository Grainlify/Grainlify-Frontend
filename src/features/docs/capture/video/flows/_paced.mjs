// Paced, visible actions for the docs-video flows: the pointer travels to what
// it clicks, scrolling is a run of small wheel steps, typing is key by key,
// and "zoom on" is an animated magnification of the page around an element.
//
// Used by the flows in this folder; record.mjs never imports it directly.

import sharp from 'sharp'

export const wait = (page, ms) => page.waitForTimeout(ms)

// Where the pointer is, per page (each theme records on a fresh page, parked at 0,0).
const pointers = new WeakMap()
const pointerOf = (page) => pointers.get(page) ?? { x: 0, y: 0 }

/**
 * Init script: a drawn cursor (a Playwright recording shows none) that follows
 * the mouse and rings on click. Put it in the flow's start.init.
 */
export const cursor = {
  fn: () => {
    const install = () => {
      if (document.getElementById('__paced_cursor')) return
      const c = document.createElement('div')
      c.id = '__paced_cursor'
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.3 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#1a1612" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
      Object.assign(c.style, { position: 'fixed', left: '-60px', top: '-60px', width: '26px', height: '26px', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-4px,-2px)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))' })
      const ring = document.createElement('div')
      Object.assign(ring.style, { position: 'fixed', left: '-60px', top: '-60px', width: '36px', height: '36px', marginLeft: '-18px', marginTop: '-18px', borderRadius: '50%', border: '3px solid #c9983a', zIndex: '2147483646', pointerEvents: 'none', opacity: '0' })
      document.documentElement.append(ring, c)
      window.addEventListener('mousemove', (e) => {
        // settle() parks the mouse at 0,0: keep the cursor off screen there.
        const off = e.clientX === 0 && e.clientY === 0
        c.style.left = (off ? -60 : e.clientX) + 'px'
        c.style.top = (off ? -60 : e.clientY) + 'px'
      }, true)
      window.addEventListener('mousedown', (e) => {
        Object.assign(ring.style, { left: e.clientX + 'px', top: e.clientY + 'px' })
        ring.animate([{ opacity: 1, transform: 'scale(.45)' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 520, easing: 'ease-out' })
      }, true)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install)
    else install()
  },
}

/** Resolves a locator to its first visible match. */
const first = (l) => l.first()

/** The page area the fixed header covers; content above this line is hidden behind it. */
const HEADER = 110

/** Scrolls smoothly (small wheel steps) until the element sits comfortably in view. */
export async function reveal(page, locator, { block = 'center', margin = 60 } = {}) {
  const el = first(locator)
  await el.waitFor({ state: 'visible', timeout: 20000 })
  const vh = page.viewportSize().height
  let stuck = 0
  for (let guard = 0; guard < 120; guard++) {
    const b = await el.boundingBox()
    if (!b) return
    let delta = 0
    if (block === 'center') {
      const target = HEADER + (vh - HEADER) / 2
      const c = b.y + b.height / 2
      if (b.y < HEADER + margin / 2 || b.y + b.height > vh - margin / 2) delta = c - target
    } else if (block === 'start') {
      delta = b.y - (HEADER + margin)
      if (Math.abs(delta) < 12) delta = 0
    } else {
      if (b.y < HEADER + margin) delta = b.y - (HEADER + margin)
      else if (b.y + b.height > vh - margin) delta = b.y + b.height - (vh - margin)
    }
    if (Math.abs(delta) < 8) return
    const step = Math.sign(delta) * Math.min(Math.abs(delta), 70)
    await pointerOverScroller(page, el, guard === 0)
    await page.mouse.wheel(0, step)
    await page.waitForTimeout(35)
    const again = await el.boundingBox()
    // Nothing moved three times running: the scroller is at its end.
    if (again && Math.abs(again.y - b.y) < 1) {
      if (++stuck >= 5) return
      await page.waitForTimeout(120)
    } else stuck = 0
  }
}

/**
 * The wheel scrolls whatever is under the pointer. Put the pointer over the
 * element's nearest scrolling ancestor (a panel with its own scroll), or over
 * the page content when the document itself scrolls.
 */
async function pointerOverScroller(page, el, first) {
  const spot = await el.evaluate((n) => {
    for (let p = n.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) {
        const r = p.getBoundingClientRect()
        const top = Math.max(r.top, 70)
        const bottom = Math.min(r.bottom, window.innerHeight - 10)
        return { x: r.left + r.width / 2, y: (top + bottom) / 2, top, bottom, left: r.left, right: r.right }
      }
    }
    return null
  })
  const at = pointerOf(page)
  if (spot) {
    const inside = at.x > spot.left + 10 && at.x < spot.right - 10 && at.y > spot.top + 10 && at.y < spot.bottom - 10
    if (!inside) await moveTo(page, spot.x, spot.y, first ? 20 : 8)
  } else await ensurePointerOnPage(page)
}

/** Scrolls by a distance in small wheel steps. */
export async function scrollBy(page, dy, { step = 60, pause = 35 } = {}) {
  await ensurePointerOnPage(page)
  let left = dy
  while (Math.abs(left) > 0.5) {
    const s = Math.sign(left) * Math.min(Math.abs(left), step)
    await page.mouse.wheel(0, s)
    left -= s
    await page.waitForTimeout(pause)
  }
  await page.waitForTimeout(250)
}

async function ensurePointerOnPage(page) {
  // The wheel scrolls whatever is under the pointer: keep it over the content, not the rail or the edges.
  const at = pointerOf(page)
  if (at.x < 90 || at.y < 80 || at.y > page.viewportSize().height - 60) await moveTo(page, Math.max(at.x, 760), 500, 10)
}

async function moveTo(page, x, y, steps = 20) {
  await page.mouse.move(x, y, { steps })
  pointers.set(page, { x, y })
}

/** Moves the pointer to the centre of the element (scrolling it into view first) and rests there. */
export async function point(page, locator, { pause = 400, scroll = true, dx = 0, dy = 0, tip = 'centre' } = {}) {
  const el = first(locator)
  await el.waitFor({ state: 'visible', timeout: 20000 })
  if (scroll) await reveal(page, el, { block: 'nearest' })
  const b = await el.boundingBox()
  // tip: 'right' rests the arrow's tip at the end of a short label, so the arrow does not cover it.
  const x = tip === 'right' ? b.x + b.width - 3 : b.x + b.width / 2
  const y = tip === 'right' ? b.y + b.height * 0.7 : b.y + b.height / 2
  await moveTo(page, x + dx, y + dy)
  await page.waitForTimeout(pause)
}

/** Points at the element, then clicks where the pointer is. */
export async function click(page, locator, opts = {}) {
  await point(page, locator, opts)
  await page.mouse.down()
  await page.waitForTimeout(60)
  await page.mouse.up()
  await page.waitForTimeout(opts.after ?? 500)
}

/** Types into the focused field, key by key. */
export async function type(page, text, delay = 60) {
  await page.keyboard.type(text, { delay })
}

/** Parks the pointer out of the way: at the right edge, beside the content, where it hovers nothing. */
export async function park(page, y = 450) {
  await moveTo(page, 1436, y, 20)
}

// --- Zoom ------------------------------------------------------------------------
//
// An animated CSS transform that brings the target to the middle of the
// screen, magnified. By default the whole app (#root) moves, like a camera;
// with `within`, only that container grows in place and the fixed header and
// rail stay put (use it on a scrolled page: a transformed #root carries the
// fixed header away with it).

let zoomed = null

/** The box of an element's text (not the whole block), for zooming on a sentence. */
export async function textBox(locator) {
  return first(locator).evaluate((n) => {
    const r = document.createRange()
    r.selectNodeContents(n)
    const b = r.getBoundingClientRect()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
  })
}

async function boxOf(target) {
  if (target && typeof target.x === 'number') return target
  if (target && typeof target.then === 'function') return target
  return first(target).boundingBox()
}

/** Magnifies around the union of the targets (locators or {x, y, width, height} boxes). */
export async function zoom(page, targets, { scale = null, max = 1.9, min = 1.1, pad = 40, ms = 900, within = null, top = 64 } = {}) {
  const list = Array.isArray(targets) ? targets : [targets]
  const boxes = []
  for (const t of list) {
    const b = await boxOf(t)
    if (b) boxes.push(b)
  }
  if (!boxes.length) throw new Error('zoom: nothing to zoom on')
  const x1 = Math.min(...boxes.map((b) => b.x)) - pad
  const y1 = Math.min(...boxes.map((b) => b.y)) - pad
  const x2 = Math.max(...boxes.map((b) => b.x + b.width)) + pad
  const y2 = Math.max(...boxes.map((b) => b.y + b.height)) + pad
  const { width: vw, height: vh } = page.viewportSize()
  const container = within ? first(within) : page.locator('#root')
  const c = await container.boundingBox()
  // Grow in place around the target's centre, then slide only as far as it
  // takes to keep the magnified target clear of the header, the rail and the edges.
  const left = 81 + 24
  const right = vw - 24
  const upper = top + 16
  const lower = vh - 24
  const s = scale ?? Math.max(min, Math.min(max, (right - left) / (x2 - x1), (lower - upper) / (y2 - y1)))
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const fit = (a1, a2, lo, hi) => {
    const w = a2 - a1
    if (w > hi - lo) return (lo + hi) / 2 - (a1 + a2) / 2
    if (a1 < lo) return lo - a1
    if (a2 > hi) return hi - a2
    return 0
  }
  const sx1 = cx + (x1 - cx) * s
  const sx2 = cx + (x2 - cx) * s
  const sy1 = cy + (y1 - cy) * s
  const sy2 = cy + (y2 - cy) * s
  const dx = fit(sx1, sx2, left, right)
  const dy = fit(sy1, sy2, upper, lower)
  // Origin at the container's top-left: a point p lands at c + (p - c) * s + t.
  let tx = cx + dx - c.x - (cx - c.x) * s
  let ty = cy + dy - c.y - (cy - c.y) * s
  if (!within) {
    // Keep the camera inside the page: no empty band at any edge.
    tx = Math.min(-c.x, Math.max(vw - c.x - c.width * s, tx))
    ty = Math.min(-c.y, Math.max(vh - c.y - c.height * s, ty))
  }
  // A zoomed panel is glass: what lies under it would show through. Back it
  // with the colour it has now, sampled from its own padding.
  let backdrop = null
  if (within) {
    const px = Math.max(0, Math.round(c.x + 6))
    const py = Math.max(70, Math.round(c.y + 6))
    if (py < vh - 2) {
      const png = await page.screenshot({ clip: { x: px, y: py, width: 1, height: 1 } })
      const { data } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      backdrop = `rgb(${data[0]}, ${data[1]}, ${data[2]})`
    }
  }
  const handle = await container.elementHandle()
  await handle.evaluate(
    (el, { tx, ty, s, ms, clip, backdrop }) => {
      el.style.transformOrigin = '0 0'
      el.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`
      el.style.willChange = 'transform'
      el.style.position = el.style.position || 'relative'
      el.style.zIndex = '20'
      el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
      if (backdrop) el.style.backgroundColor = backdrop
      if (clip) {
        // Nothing magnified shows above the header: clip the (untransformed) parent there.
        const p = el.parentElement
        const top = p.getBoundingClientRect().top
        p.style.clipPath = `inset(${Math.max(0, 34 - top)}px -4000px -4000px -4000px)`
      }
    },
    { tx, ty, s, ms, clip: !!within, backdrop },
  )
  zoomed = handle
  await page.waitForTimeout(ms + 100)
}

/** Returns to the normal view. */
export async function unzoom(page, { ms = 700 } = {}) {
  if (!zoomed) return
  const el = zoomed
  zoomed = null
  try {
    await el.evaluate((el, ms) => {
      el.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`
      el.style.transform = 'translate(0px, 0px) scale(1)'
    }, ms)
    await page.waitForTimeout(ms + 100)
    await el.evaluate((el) => {
      el.style.transform = ''
      el.style.transition = ''
      el.style.willChange = ''
      el.style.zIndex = ''
      el.style.backgroundColor = ''
      if (el.parentElement) el.parentElement.style.clipPath = ''
    })
  } catch {
    // The element went away (a navigation): nothing to undo.
  }
}

// --- Title cards -----------------------------------------------------------------

/** A full-screen card over the page, in the app's colours for the current theme. */
export async function titleCard(page, text, { ms = 500 } = {}) {
  await page.evaluate(
    ({ text, ms }) => {
      const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
      const card = document.createElement('div')
      card.id = 'docs-video-title-card'
      card.style.cssText = `position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:0 160px;
        background:${dark ? 'linear-gradient(135deg,#1a1512,#2d241d)' : 'linear-gradient(135deg,#efe6d8,#d9c9b2)'};
        color:${dark ? '#f5efe6' : '#2d2820'};font:600 44px/1.3 Inter,system-ui,sans-serif;text-align:center;opacity:0;transition:opacity ${ms}ms ease`
      const inner = document.createElement('div')
      inner.textContent = text
      const bar = document.createElement('div')
      bar.style.cssText = 'width:72px;height:4px;border-radius:2px;background:#c9983a;margin:0 auto 28px'
      inner.prepend(bar)
      card.appendChild(inner)
      document.body.appendChild(card)
      requestAnimationFrame(() => requestAnimationFrame(() => (card.style.opacity = '1')))
    },
    { text, ms },
  )
  await page.waitForTimeout(ms + 50)
}

export async function clearTitleCard(page, { ms = 400 } = {}) {
  await page.evaluate((ms) => {
    const card = document.getElementById('docs-video-title-card')
    if (!card) return
    card.style.transition = `opacity ${ms}ms ease`
    card.style.opacity = '0'
    setTimeout(() => card.remove(), ms + 20)
  }, ms)
  await page.waitForTimeout(ms + 50)
}

/**
 * A cut to another URL: a quick fade to the page background, navigation, and
 * a fade back in once `ready` shows.
 */
export async function cutTo(page, url, ready, { fade = 250 } = {}) {
  zoomed = null
  await page.evaluate((fade) => {
    const veil = document.createElement('div')
    veil.style.cssText = `position:fixed;inset:0;z-index:2147483647;background:${getComputedStyle(document.body).backgroundColor || '#000'};opacity:0;transition:opacity ${fade}ms ease`
    document.body.appendChild(veil)
    requestAnimationFrame(() => requestAnimationFrame(() => (veil.style.opacity = '1')))
  }, fade)
  await page.waitForTimeout(fade + 30)
  await page.goto(new URL(url, page.url()).href)
  await ready(page).waitFor({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  // Show the cursor where it was before the cut.
  const at = pointerOf(page)
  if (at.x || at.y) await page.mouse.move(at.x + 1, at.y)
}

/**
 * Fixture state that changes during a video, kept per page: record.mjs films
 * light and dark on two pages in one process, and each must start fresh.
 * Returns state(pageOrRequest) -> that page's state object.
 */
export function perPage(initial) {
  const states = new WeakMap()
  return (x) => {
    const page = typeof x.goto === 'function' ? x : x.frame().page()
    if (!states.has(page)) states.set(page, initial())
    return states.get(page)
  }
}

/**
 * Init script: account setup finished (a billing profile saved in this
 * browser; the world already has identity verified), so Discover does not
 * show its "Finish setup" nudge, which names things the docs never mention.
 */
export const setupDone = {
  fn: () => {
    try {
      if (!localStorage.getItem('billing_profiles')) localStorage.setItem('billing_profiles', JSON.stringify([{ id: 'bp-docs-video', name: 'Docs video' }]))
    } catch {}
  },
}
