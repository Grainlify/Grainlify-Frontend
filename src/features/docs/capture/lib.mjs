// Shared plumbing for the docs capture tool. See run.mjs.
//
// Every capture runs against the real app with the network answered locally:
// the API from fixtures, the bounty agent from fixtures, images with generated
// avatars, fonts from Google, and everything else refused. The clock is frozen,
// motion is reduced, and the theme is forced through BOTH the app's own switch
// (localStorage "theme") and the browser's colour scheme, because a stray
// class can follow either one.

export const NOW = new Date('2026-09-21T09:02:00Z')
export const VIEWPORTS = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }

// An empty answer in the shape most list endpoints use, so a page that reads
// an array renders an empty state instead of crashing on undefined.
const EMPTY = { projects: [], issues: [], prs: [], ecosystems: [], hackathons: [], events: [], items: [], results: [], applications: [], assignments: [], notifications: [], claims: [], total: 0, limit: 25, offset: 0, has_more: false }

const GOLDS = ['#c9983a', '#a67c2e', '#b89968', '#7d5c20', '#d4af37']

/** A round avatar with an initial, coloured from the brand golds by name. */
function avatarSvg(seed) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const bg = GOLDS[h % GOLDS.length]
  const letter = (seed.match(/[a-z]/i)?.[0] ?? 'g').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${bg}"/><text x="48" y="62" font-family="Inter,Arial,sans-serif" font-size="44" font-weight="700" fill="#fff8ec" text-anchor="middle">${letter}</text></svg>`
}

export async function openPage(browser, { base, theme, width, persona, api = {}, agent = {}, init = [], tour = false }) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[width],
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: 'reduce',
    isMobile: width === 390,
    hasTouch: width === 390,
  })
  await ctx.addInitScript(
    ([t, id, signedIn, showTour]) => {
      try {
        localStorage.setItem('theme', t)
        if (signedIn) localStorage.setItem('patchwork_jwt', 'docs-capture')
        if (id && !showTour) localStorage.setItem('grainlify_tour_seen_' + id, 'true')
      } catch {}
    },
    [theme, persona?.id ?? null, !!persona, tour],
  )
  for (const script of init) await ctx.addInitScript(script.fn, script.arg)
  const page = await ctx.newPage()
  await page.clock.install({ time: NOW })

  const apiMap = {
    ...(persona ? { '/me': { id: persona.id, role: persona.role, github: { login: persona.login, avatar_url: `https://avatars.example/${persona.login}` } } } : {}),
    '/notifications/unread-count': { count: 0 },
    ...api,
  }
  const unanswered = new Set()
  await page.route(() => true, (route) => {
    const req = route.request()
    const u = new URL(req.url())
    if (u.origin === base && !u.pathname.startsWith('/agent/')) return route.continue()
    if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return route.continue()
    if (u.pathname.startsWith('/agent/') || u.hostname === 'agent.grainlify.com') {
      const body = agent[u.pathname.replace(/^\/agent/, '')]
      return route.fulfill({ json: body ?? {} })
    }
    if (/^(localhost:8080|api\.grainlify\.com)$/.test(u.host)) {
      const body = apiMap[`${req.method()} ${u.pathname}`] ?? apiMap[u.pathname + u.search] ?? apiMap[u.pathname]
      if (body === undefined) unanswered.add(`${req.method()} ${u.pathname}`)
      return route.fulfill({ json: typeof body === 'function' ? body(req) : body ?? EMPTY })
    }
    if (req.resourceType() === 'image') return route.fulfill({ body: avatarSvg(u.pathname), contentType: 'image/svg+xml' })
    return route.abort()
  })
  return { ctx, page, unanswered }
}

/** Waits for fonts, parks the mouse, and lets the frozen clock run timers forward. */
export async function settle(page, ms = 1000) {
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await page.clock.runFor(ms)
  await page.waitForTimeout(300)
}

/** Refuses a capture of a blank page or a Vite error overlay. */
export async function assertRendered(page, id) {
  const r = await page.evaluate(() => ({
    overlay: !!document.querySelector('vite-error-overlay'),
    text: document.body.innerText.trim().length,
  }))
  if (r.overlay) throw new Error(`${id}: Vite error overlay on the page`)
  if (r.text < 40) throw new Error(`${id}: page rendered almost no text (${r.text} characters) - a fixture is probably missing`)
}
