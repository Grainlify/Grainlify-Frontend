// Regenerates the docs screenshots from the running app.
//
//   node src/features/docs/capture/run.mjs            every shot
//   node src/features/docs/capture/run.mjs signin     only the named shots
//   node src/features/docs/capture/run.mjs --section maintainers   one shots/<section>.mjs file
//
// Starts its own Vite dev server, captures every shot in shots.mjs in light and
// dark at 1440 and 390, and writes WebP files to public/docs-media/shots/.
// Nothing is committed for you: the run ends by listing which files changed
// and writing a review sheet (both themes, both widths, side by side) to
// src/features/docs/capture/out/review.html.
//
// Needs Playwright's Chromium (pnpm exec playwright install chromium) or Google Chrome.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { SHOTS } from './shots.mjs'
import { openPage, settle, assertRendered } from './lib.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../../..')
const OUT = path.join(ROOT, 'public/docs-media/shots')
const REVIEW = path.join(HERE, 'out')
const THEMES = ['light', 'dark']
const WIDTHS = [1440, 390]

const argv = process.argv.slice(2)
const section = argv.includes('--section') ? argv[argv.indexOf('--section') + 1] : null
const only = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--section')
const shots = SHOTS.filter((s) => (!section || s.section === section) && (!only.length || only.includes(s.id)))
if (only.length && shots.length !== only.length) {
  console.error('Unknown shot id. Known ids:', SHOTS.map((s) => s.id).join(', '))
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
mkdirSync(REVIEW, { recursive: true })

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5231, strictPort: false, host: '127.0.0.1' } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

let browser
try {
  // DOCS_CHROMIUM: a browser binary, for when Playwright's own build is not the installed one.
  browser = await chromium.launch(process.env.DOCS_CHROMIUM ? { executablePath: process.env.DOCS_CHROMIUM } : {})
} catch {
  browser = await chromium.launch({ channel: 'chrome' })
}

/** Mean per-channel difference between two images, 0-255; Infinity when their sizes differ. */
async function difference(a, b) {
  const [ra, rb] = await Promise.all([sharp(a).raw().toBuffer({ resolveWithObject: true }), sharp(b).raw().toBuffer({ resolveWithObject: true })])
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) return Infinity
  let sum = 0
  for (let i = 0; i < ra.data.length; i++) sum += Math.abs(ra.data[i] - rb.data[i])
  return sum / ra.data.length
}

const changed = []
const failures = []
for (const shot of shots) {
  for (const theme of THEMES) {
    for (const width of shot.widths ?? WIDTHS) {
      const name = `${shot.id}.${theme}.${width}.webp`
      const { ctx, page, unanswered } = await openPage(browser, { base, theme, width, persona: shot.persona, api: shot.api, agent: shot.agent, init: shot.init, tour: shot.tour })
      try {
        await page.goto(base + shot.url)
        if (shot.steps) await shot.steps(page, width)
        await shot.ready(page, width).waitFor({ timeout: 20000 })
        await settle(page)
        await assertRendered(page, shot.id)
        const frame = await shot.frame(page, width)
        const png = await page.screenshot(frame === 'viewport' ? {} : { clip: frame })
        const webp = await sharp(png).webp({ quality: 82, effort: 6 }).toBuffer()
        const file = path.join(OUT, name)
        const before = existsSync(file) ? file : null
        if (!before || (await difference(before, webp)) > 0.5) changed.push(name)
        await sharp(webp).toFile(file)
        console.log(`  ${name}`)
      } catch (e) {
        failures.push(`${name}: ${e.message.split('\n')[0]}`)
        if (unanswered.size) failures.push(`    API calls with no fixture: ${[...unanswered].join(', ')}`)
      } finally {
        await ctx.close()
      }
    }
  }
}

await browser.close()
await server.close()

// The review sheet: every shot in all four variants, beside each other.
const rows = shots
  .map(
    (s) => `<section><h2>${s.id} <small>used on /docs/${s.page}</small></h2><div class="row">${THEMES.map((t) =>
      (s.widths ?? WIDTHS).map((w) => `<figure><img src="../../../../../public/docs-media/shots/${s.id}.${t}.${w}.webp" alt=""><figcaption>${t} · ${w}</figcaption></figure>`).join(''),
    ).join('')}</div></section>`,
  )
  .join('\n')
writeFileSync(
  path.join(REVIEW, section ? `review-${section}.html` : 'review.html'),
  `<!doctype html><meta charset="utf-8"><title>Docs screenshots</title><style>body{font:14px Inter,system-ui,sans-serif;background:#e8dfd0;color:#2d2820;padding:24px}h2{font-size:16px}small{font-weight:400;color:#7a6b5a}.row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}figure{margin:0}img{max-width:560px;max-height:640px;border:1px solid #0002;border-radius:10px}figcaption{color:#7a6b5a;margin-top:4px}</style>${rows}`,
)

console.log(`\n${changed.length ? `Changed or new (${changed.length}):\n  ${changed.join('\n  ')}` : 'No screenshot changed.'}`)
console.log(`Review sheet: ${path.relative(ROOT, path.join(REVIEW, 'review.html'))}`)
if (failures.length) {
  console.error(`\nFailed (${failures.length}):\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
