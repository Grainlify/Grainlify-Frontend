// Shared pieces for the maintainer and admin video flows (maintainers__bounties,
// maintainers__grainhack, admins__*): a drawn cursor (a Playwright recording
// does not show the real one), paced pointer moves and clicks, smooth wheel
// scrolling, human-speed typing, title cards, and an init script that keeps
// out of frame what the docs never show (the KeeperHub payout panel and the
// admin Open-Source Week events card).

/** Init script: draws a cursor that follows the mouse and rings on click. */
export const cursor = {
  fn: () => {
    const install = () => {
      if (document.getElementById('__am_cursor')) return
      const c = document.createElement('div')
      c.id = '__am_cursor'
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.3 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#1a1612" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
      Object.assign(c.style, { position: 'fixed', left: '-60px', top: '-60px', width: '26px', height: '26px', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-4px,-2px)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))' })
      const ring = document.createElement('div')
      Object.assign(ring.style, { position: 'fixed', left: '-60px', top: '-60px', width: '36px', height: '36px', marginLeft: '-18px', marginTop: '-18px', borderRadius: '50%', border: '3px solid #c9983a', zIndex: '2147483646', pointerEvents: 'none', opacity: '0' })
      document.documentElement.append(ring, c)
      const at = window.__amPointer
      if (at) Object.assign(c.style, { left: at.x + 'px', top: at.y + 'px' })
      window.addEventListener('mousemove', (e) => {
        // settle() parks the mouse at 0,0: keep the cursor off screen there.
        const off = e.clientX === 0 && e.clientY === 0
        window.__amPointer = { x: e.clientX, y: e.clientY }
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

/** Init script: hides what the docs never show, wherever it renders. */
export const hideNeverShown = {
  fn: () => {
    const css = '[data-testid="keeperhub-panel"]{display:none!important}'
    const hide = () => {
      for (const h of document.querySelectorAll('h2')) {
        if (h.textContent.trim() === 'Open-Source Week Events') {
          const card = h.closest('div[class*="rounded-[24px]"]')
          if (card && card.style.display !== 'none') card.style.display = 'none'
        }
      }
    }
    const start = () => {
      const s = document.createElement('style')
      s.textContent = css
      document.head.appendChild(s)
      hide()
      new MutationObserver(hide).observe(document.body, { childList: true, subtree: true })
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
  },
}

/** Init script: clipboard writes succeed (headless Chromium refuses them without a permission). */
export const clipboardOk = {
  fn: () => {
    try {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') }, configurable: true })
    } catch {}
  },
}

export const initScripts = (world) => [...(world.init ?? []), cursor, hideNeverShown]

const pos = new WeakMap()
export const wait = (page, ms) => page.waitForTimeout(ms)

/** The centre of a locator (or {x, y}), scrolling it smoothly into view first when it is off screen. */
async function centre(page, target, { scroll = true } = {}) {
  if (!('locator' in target) && 'x' in target) return target
  await target.waitFor({ state: 'visible', timeout: 20000 })
  let b = await target.boundingBox()
  const vh = page.viewportSize().height
  if (scroll && (b.y < 90 || b.y + Math.min(b.height, 60) > vh - 30)) {
    await scrollTo(page, target, { top: Math.max(140, vh / 2 - b.height / 2) })
    b = await target.boundingBox()
  }
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.x }
}

/** Moves the pointer to the target in 20 steps and rests there. */
export async function point(page, target, { pause = 400, steps = 20, dx = 0, dy = 0, left = null } = {}) {
  const c = await centre(page, target)
  // `left`: this many px in from the element's left edge (for full-width lines of text).
  const x = (left !== null && c.left !== undefined ? Math.min(c.left + left, c.x) : c.x) + dx
  await page.mouse.move(x, c.y + dy, { steps })
  pos.set(page, { x, y: c.y + dy })
  await page.waitForTimeout(pause)
}

/** Points at the target, then clicks it. */
export async function click(page, target, { pause = 400, after = 350, dx = 0, dy = 0, left = null } = {}) {
  await point(page, target, { pause, dx, dy, left })
  await page.mouse.down()
  await page.waitForTimeout(70)
  await page.mouse.up()
  await page.waitForTimeout(after)
}

/** Types at a human pace into whatever has focus. */
export async function type(page, text, { delay = 60 } = {}) {
  await page.keyboard.type(text, { delay })
}

/** Clicks a field, clears it, and types into it. */
export async function fillIn(page, field, text, opts = {}) {
  await click(page, field, { after: 150 })
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.press('Backspace')
  await type(page, text, opts)
}

/** Puts the pointer somewhere neutral over the content, so wheel events scroll the page. */
async function ensureOverContent(page) {
  const p = pos.get(page)
  if (p && p.x > 100) return
  const vw = page.viewportSize().width
  await page.mouse.move(vw * 0.62, 460, { steps: 12 })
  pos.set(page, { x: vw * 0.62, y: 460 })
}

/** Wheels by a distance in small eased steps (the wheel scroll lands a frame later, so the steps are planned, not measured). */
async function wheelBy(page, dy, settleOn = null) {
  // A focused number field under the pointer takes the wheel as up/down steps.
  await page.evaluate(() => {
    const a = document.activeElement
    if (a && a.tagName === 'INPUT' && a.type === 'number') a.blur()
  })
  const t0 = Date.now()
  // Timed, not counted: an eased curve over a duration set by the distance, so
  // a page that renders slowly gets bigger steps rather than a longer scroll.
  const duration = Math.min(3000, Math.max(Math.abs(dy) < 60 ? 200 : 700, 450 + Math.abs(dy) * 0.9))
  let sent = 0
  for (;;) {
    const f = Math.min(1, (Date.now() - t0) / duration)
    const target = (dy * (1 - Math.cos(Math.PI * f))) / 2
    const step = Math.round(target - sent)
    if (step) await page.mouse.wheel(0, step)
    sent += step
    if (f >= 1) break
    await page.waitForTimeout(16)
  }
  // Wait for the scroll to land (a heavy page can lag the wheel by a few frames).
  let last = null
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(60)
    const y = settleOn ? (await settleOn.boundingBox())?.y : await page.evaluate(() => scrollY)
    if (last !== null && Math.abs(y - last) < 0.5) break
    last = y
  }
}

/** Scrolls smoothly, in small wheel steps, until the target's top sits `top` px from the top of the viewport. */
export async function scrollTo(page, target, { top = 130 } = {}) {
  await scrollToInner(page, target, top)
}
async function scrollToInner(page, target, top) {
  await target.waitFor({ timeout: 20000 })
  await ensureOverContent(page)
  let last = null
  for (let pass = 0; pass < 3; pass++) {
    const b = await target.boundingBox()
    if (!b) break
    if (last !== null && Math.abs(b.y - last) < 1) break
    const d = b.y - top
    if (Math.abs(d) < 4) break
    last = b.y
    await wheelBy(page, d, target)
  }
}

/** Scrolls by a distance, smoothly. */
export async function scrollBy(page, dy) {
  await ensureOverContent(page)
  await wheelBy(page, dy)
}

/** A full-screen title card for things that happen off Grainlify (GitHub). */
export async function titleCard(page, { eyebrow = '', lines = [] }) {
  await page.evaluate(
    ({ eyebrow, lines }) => {
      const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
      let card = document.getElementById('__am_card')
      if (!card) {
        card = document.createElement('div')
        card.id = '__am_card'
        Object.assign(card.style, {
          position: 'fixed', inset: '0', zIndex: '2147483647', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '18px', padding: '0 120px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', opacity: '0', transition: 'opacity 350ms ease',
          background: dark ? 'radial-gradient(circle at 50% 40%, #2d241d 0%, #16120e 75%)' : 'radial-gradient(circle at 50% 40%, #f4ecdd 0%, #dccbad 80%)',
          color: dark ? '#f5efe5' : '#2d2820',
        })
        document.documentElement.appendChild(card)
      }
      const gold = dark ? '#e8c571' : '#8b6f3a'
      card.innerHTML =
        (eyebrow ? `<div style="font-size:15px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${gold}">${eyebrow}</div>` : '') +
        lines.map((l, i) => `<div data-line="${i}" style="font-size:${i === 0 ? 38 : 30}px;font-weight:${i === 0 ? 700 : 600};line-height:1.3;max-width:1000px;${i > 0 ? `color:${gold};` : ''}">${l}</div>`).join('')
      requestAnimationFrame(() => (card.style.opacity = '1'))
    },
    { eyebrow, lines },
  )
  await page.waitForTimeout(450)
}

/** Adds a line to the title card, fading it in. */
export async function titleCardAdd(page, line) {
  await page.evaluate((line) => {
    const card = document.getElementById('__am_card')
    const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
    const d = document.createElement('div')
    d.textContent = line
    Object.assign(d.style, { fontSize: '30px', fontWeight: '600', lineHeight: '1.3', color: dark ? '#e8c571' : '#8b6f3a', opacity: '0', transition: 'opacity 400ms ease' })
    card.appendChild(d)
    requestAnimationFrame(() => (d.style.opacity = '1'))
  }, line)
  await page.waitForTimeout(450)
}

export async function titleCardClose(page) {
  await page.evaluate(() => {
    const card = document.getElementById('__am_card')
    if (!card) return
    card.style.opacity = '0'
    setTimeout(() => card.remove(), 400)
  })
  await page.waitForTimeout(450)
}

/** Waits until the page's text and spinner count stop changing. */
export async function waitStable(page, maxMs = 8000) {
  let last = -1
  let same = 0
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(150)
    const n = await page.evaluate(() => document.body.innerText.length * 1000 + document.querySelectorAll('.animate-pulse, .animate-spin, [aria-busy="true"]').length)
    if (n === last) {
      if (++same >= 3) {
        return
      }
    } else {
      same = 0
      last = n
    }
  }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The innermost rounded card that holds a heading with exactly this text. */
export const card = (page, heading, cls = 'rounded-[24px]') =>
  page.locator(`div[class*="${cls}"]`, { has: page.locator('h2, h3', { hasText: new RegExp(`^\\s*${esc(heading)}\\s*$`) }) }).last()

/** The open window (shared Modal). */
export const modal = (page) => page.locator('div[class*="z-[10000]"] > div').last()

/** The page a request came from, so fixture state is per recording (light and dark each get a fresh page). */
export const pageOf = (req) => {
  try {
    return req.frame().page()
  } catch {
    return null
  }
}

/** Per-page state for stateful fixtures. */
export function perPage(init) {
  const m = new WeakMap()
  const none = {}
  return (req) => {
    const p = pageOf(req) ?? none
    if (!m.has(p)) m.set(p, init())
    return m.get(p)
  }
}

/**
 * Chooses an option in a native <select>. Headless Chromium does not draw a
 * native select's popup, so this draws one in its place (the options, under
 * the control, in the browser's own style), clicks the option in it, and then
 * sets the value the way a real choice would.
 */
export async function chooseNative(page, select, optionText, { hold = 700 } = {}) {
  // Point and ring as a click would, without a real press (that would open
  // the invisible native popup, which then swallows the next click).
  await point(page, select)
  const at = pos.get(page)
  await page.evaluate(({ x, y }) => window.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y })), at)
  await select.focus()
  await page.waitForTimeout(150)
  const box = await select.boundingBox()
  const options = await select.evaluate((s) => [...s.options].map((o) => ({ value: o.value, text: o.text })))
  const index = options.findIndex((o) => (optionText instanceof RegExp ? optionText.test(o.text) : o.text === optionText))
  if (index < 0) throw new Error(`No option ${optionText}`)
  await page.evaluate(
    ({ box, options, index }) => {
      const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
      const pop = document.createElement('div')
      pop.id = '__am_select'
      const rowH = 26
      const below = innerHeight - (box.y + box.height) - 12
      const h = Math.min(options.length * rowH + 8, Math.max(below, 200))
      const top = below >= h ? box.y + box.height + 2 : box.y - h - 2
      Object.assign(pop.style, {
        position: 'fixed', left: box.x + 'px', top: top + 'px', width: Math.max(box.width, 240) + 'px', maxHeight: h + 'px', overflow: 'hidden',
        zIndex: '2147483645', padding: '4px 0', borderRadius: '8px', font: '13px Inter, system-ui, sans-serif',
        background: dark ? '#2b2724' : '#ffffff', color: dark ? '#f0ebe4' : '#1d1a17', border: `1px solid ${dark ? '#4a433c' : '#d4cbbf'}`,
        boxShadow: '0 10px 30px rgba(0,0,0,.25)',
      })
      options.forEach((o, i) => {
        const r = document.createElement('div')
        r.textContent = o.text
        r.dataset.i = String(i)
        Object.assign(r.style, { height: rowH + 'px', lineHeight: rowH + 'px', padding: '0 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
        pop.appendChild(r)
      })
      document.documentElement.appendChild(pop)
      // Highlight the row under the pointer, as the native list does.
      window.addEventListener('mousemove', (e) => {
        for (const r of pop.children) {
          const b = r.getBoundingClientRect()
          const on = e.clientY >= b.top && e.clientY < b.bottom && e.clientX >= b.left && e.clientX <= b.right
          r.style.background = on ? '#c9983a' : 'transparent'
          r.style.color = on ? '#fff' : ''
        }
      })
    },
    { box, options, index },
  )
  await page.waitForTimeout(400)
  const row = page.locator(`#__am_select > div[data-i="${index}"]`)
  await point(page, row, { pause: 350, left: 90 })
  await page.mouse.down()
  await page.waitForTimeout(70)
  await page.mouse.up()
  await page.evaluate(() => document.getElementById('__am_select')?.remove())
  await select.selectOption(options[index].value)
  await page.waitForTimeout(hold)
}
