// Paced, visible actions for the video flows: a drawn pointer (headless video
// has none), mouse moves with steps, smooth wheel scrolling, typing at a human
// pace, and a zoom that scales the dashboard content around a region.
//
//   import { pointer, point, click, scrollTo, zoom, unzoom, type } from './_money-motion.mjs'
//   start: { ..., init: [...w.init, pointer] }

/** An init script that draws a pointer where the mouse is, and a ring on each click. */
export const pointer = {
  fn: () => {
    const make = () => {
      if (document.getElementById('__vid-pointer')) return
      const p = document.createElement('div')
      p.id = '__vid-pointer'
      p.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:30px;z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .2s;will-change:transform;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))'
      p.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L7.5 18.5 L11.5 27.5 L15 26 L11 17 L19 17 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round"/></svg>'
      document.documentElement.appendChild(p)
    }
    const move = (x, y) => {
      make()
      const p = document.getElementById('__vid-pointer')
      p.style.transform = `translate(${x - 2}px, ${y - 2}px)`
      p.style.opacity = x < 4 && y < 4 ? '0' : '1'
    }
    addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true)
    addEventListener(
      'mousedown',
      (e) => {
        const r = document.createElement('div')
        r.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;border:3px solid #c9983a;background:rgba(201,152,58,.25);z-index:2147483646;pointer-events:none;transform:scale(.3);opacity:1;transition:transform .45s ease-out,opacity .45s ease-out`
        document.documentElement.appendChild(r)
        requestAnimationFrame(() => requestAnimationFrame(() => ((r.style.transform = 'scale(1.3)'), (r.style.opacity = '0'))))
        setTimeout(() => r.remove(), 600)
      },
      true,
    )
    new MutationObserver(() => document.body && make()).observe(document, { childList: true })
  },
  arg: null,
}

const VIEW = { top: 76, bottom: 890, left: 88, right: 1432 }

/**
 * The box of an element, or for a text-only element (a paragraph, a label),
 * of its words: a block paragraph is as wide as its card, its words may not
 * be. With `firstLine`, only the first line of the words.
 */
const textBox = (n, firstLine) => {
  const r = n.getBoundingClientRect()
  if ([...n.children].every((c) => c.tagName.toLowerCase() === 'svg') && !/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(n.tagName) && n.textContent.trim()) {
    // Only the words: an icon beside them is not what is being pointed at.
    const rects = []
    for (const t of n.childNodes) {
      if (t.nodeType !== 3 || !t.textContent.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(t)
      rects.push(...[...range.getClientRects()].filter((r) => r.width > 0))
    }
    if (rects.length) {
      if (firstLine) return { x: rects[0].left, y: rects[0].top, width: rects[0].width, height: rects[0].height }
      const x = Math.min(...rects.map((t) => t.left)), y = Math.min(...rects.map((t) => t.top))
      return { x, y, width: Math.max(...rects.map((t) => t.right)) - x, height: Math.max(...rects.map((t) => t.bottom)) - y }
    }
  }
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

/** The centre of an element, scrolling it into view (smoothly) first if it is off screen. */
async function centreOf(page, locator) {
  const el = locator.first()
  await el.waitFor({ state: 'visible', timeout: 20000 })
  // A text-only element (a paragraph, a label) is pointed at where its words
  // are, not at the middle of its box, which can be far to their right.
  const box = () => el.evaluate(textBox, true)
  let b = await box()
  if (b.y < VIEW.top || b.y + b.height > VIEW.bottom) {
    await scrollTo(page, el, { block: 'center' })
    b = await box()
  }
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** Moves the pointer to an element and rests there. */
export async function point(page, locator, { pause = 400, dx = 0, dy = 0 } = {}) {
  const c = await centreOf(page, locator)
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 20 })
  await page.waitForTimeout(pause)
}

/** Moves the pointer to an element, rests, and clicks it. */
export async function click(page, locator, { pause = 400, after = 500, dx = 0, dy = 0 } = {}) {
  const c = await centreOf(page, locator)
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 20 })
  await page.waitForTimeout(pause)
  await page.mouse.down()
  await page.waitForTimeout(60)
  await page.mouse.up()
  await page.waitForTimeout(after)
}

/** Types at a readable pace into whatever has focus. */
export async function type(page, text) {
  await page.keyboard.type(text, { delay: 60 })
}

/** Scrolls the window by `delta` pixels in small wheel steps, easing in and out. */
export async function scrollBy(page, delta, { ms } = {}) {
  if (Math.abs(delta) < 2) return
  const duration = ms ?? Math.min(1600, 350 + Math.abs(delta) * 0.9)
  const steps = Math.max(8, Math.round(duration / 25))
  // Keep the wheel over the page, not over a nested scroller or the rail.
  const vp = page.viewportSize()
  const pos = await page.evaluate(() => ({ x: window.__vidX ?? null, y: window.__vidY ?? null }))
  void pos
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  const start = await page.evaluate(() => window.scrollY)
  let done = 0
  for (let i = 1; i <= steps; i++) {
    const want = Math.round(delta * ease(i / steps))
    await page.mouse.wheel(0, want - done)
    done = want
    await page.waitForTimeout(duration / steps)
  }
  // Wheel deltas can round or be clamped: settle exactly where we meant to be.
  await page.waitForTimeout(80)
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const target = Math.max(0, Math.min(max, start + delta))
  const now = await page.evaluate(() => window.scrollY)
  if (Math.abs(now - target) > 1) await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), target)
  void vp
}

/**
 * Scrolls smoothly so an element sits at the top of the content (under the
 * floating header, plus `offset`), in the centre, or with its bottom at the
 * bottom of the screen.
 */
export async function scrollTo(page, locator, { block = 'start', offset = 16, ms } = {}) {
  const el = locator.first()
  await el.waitFor({ state: 'attached', timeout: 20000 })
  const b = await el.evaluate((n) => {
    const r = n.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height }
  })
  let delta
  if (block === 'start') delta = b.top - (VIEW.top + offset)
  else if (block === 'end') delta = b.bottom - (VIEW.bottom - offset)
  else delta = b.top + b.height / 2 - (VIEW.top + VIEW.bottom) / 2
  await scrollBy(page, delta, { ms })
}

/** Scrolls to an absolute window position, smoothly. */
export async function scrollToY(page, y, opts) {
  const now = await page.evaluate(() => window.scrollY)
  await scrollBy(page, y - now, opts)
}

/**
 * Zooms the dashboard content so `frame` (a locator, or several whose union is
 * the frame) fills more of the screen: scaled by `scale` (capped so its height
 * fits), centred when it fits across, otherwise aligned to the left (or right)
 * edge. The header and rail stay as they are.
 */
export async function zoom(page, frame, { scale = 1.5, align = 'left', ms = 900 } = {}) {
  const els = (Array.isArray(frame) ? frame : [frame]).map((l) => l.first())
  for (const el of els) await el.waitFor({ state: 'visible', timeout: 20000 })
  const boxes = await Promise.all(els.map((el) => el.evaluate(textBox)))
  const F = {
    left: Math.min(...boxes.map((b) => b.x)),
    top: Math.min(...boxes.map((b) => b.y)),
    right: Math.max(...boxes.map((b) => b.x + b.width)),
    bottom: Math.max(...boxes.map((b) => b.y + b.height)),
  }
  await els[0].evaluate(
    (n, { F, scale, align, ms, view }) => {
      let c = n
      while (c.parentElement && !(c.parentElement.parentElement && c.parentElement.parentElement.tagName === 'MAIN')) c = c.parentElement
      if (!c.parentElement) c = document.body
      const C = c.getBoundingClientRect()
      const fw = F.right - F.left
      const fh = F.bottom - F.top
      const availW = view.right - view.left
      const availH = view.bottom - view.top
      const s = Math.max(1, Math.min(scale, (availH - 24) / fh))
      const W = fw * s
      let left
      if (align === 'start') left = view.left + 40
      else if (align === 'right' && W < availW / 2) left = view.right - 60 - W
      else if (W <= availW - 24) left = view.left + (availW - W) / 2
      else if (align === 'right') left = view.right - 12 - W
      else left = view.left + 12
      const top = view.top + (availH - fh * s) / 2
      const tx = left - C.left - s * (F.left - C.left)
      const ty = top - C.top - s * (F.top - C.top)
      document.documentElement.style.overflowX = 'clip'
      c.dataset.vidZoom = '1'
      c.style.transformOrigin = '0 0'
      c.style.transition = `transform ${ms}ms cubic-bezier(.3,.1,.2,1)`
      c.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
    },
    { F, scale, align, ms, view: VIEW },
  )
  await page.waitForTimeout(ms + 100)
}

/** Undoes zoom(). */
export async function unzoom(page, { ms = 700 } = {}) {
  const had = await page.evaluate((ms) => {
    const c = document.querySelector('[data-vid-zoom]')
    if (!c) return false
    c.style.transition = `transform ${ms}ms cubic-bezier(.3,.1,.2,1)`
    c.style.transform = 'translate(0px, 0px) scale(1)'
    return true
  }, ms)
  if (!had) return
  await page.waitForTimeout(ms + 80)
  await page.evaluate(() => {
    const c = document.querySelector('[data-vid-zoom]')
    if (!c) return
    c.style.transition = ''
    c.style.transform = ''
    c.style.transformOrigin = ''
    delete c.dataset.vidZoom
    document.documentElement.style.overflowX = ''
  })
}

/** A soft gold ring drawn around an element (on top of the page), until unring(). */
export async function ring(page, locator, { pad = 8 } = {}) {
  const el = locator.first()
  const b = await el.boundingBox()
  await page.evaluate(
    ({ b, pad }) => {
      document.getElementById('__vid-ring')?.remove()
      const r = document.createElement('div')
      r.id = '__vid-ring'
      r.style.cssText = `position:fixed;left:${b.x - pad}px;top:${b.y - pad}px;width:${b.width + pad * 2}px;height:${b.height + pad * 2}px;border-radius:18px;border:3px solid #c9983a;box-shadow:0 0 0 6px rgba(201,152,58,.22);z-index:2147483640;pointer-events:none;opacity:0;transition:opacity .4s`
      document.documentElement.appendChild(r)
      requestAnimationFrame(() => requestAnimationFrame(() => (r.style.opacity = '1')))
    },
    { b, pad },
  )
  await page.waitForTimeout(450)
}

export async function unring(page) {
  await page.evaluate(() => {
    const r = document.getElementById('__vid-ring')
    if (!r) return
    r.style.opacity = '0'
    setTimeout(() => r.remove(), 450)
  })
  await page.waitForTimeout(450)
}

/** Parks the pointer out of the way (it fades out in the top-left corner). */
export async function park(page) {
  await page.mouse.move(1, 1, { steps: 12 })
}

/** Moves the pointer gently over a point, for when a segment has nothing to click. */
export async function drift(page, x, y, steps = 30) {
  await page.mouse.move(x, y, { steps })
}

/** world(persona) spread into a flow's start, with extra API answers and init scripts. */
export function startWith(w, { url, api = {}, init = [], ready } = {}) {
  return { url, persona: w.persona, api: { ...w.api, ...api }, agent: w.agent, init: [...w.init, pointer, ...init], ...(ready ? { ready } : {}) }
}
