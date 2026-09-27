// Before/after review captures for a release.
//
//   node src/features/docs/capture/review.mjs --before http://127.0.0.1:5251 --after http://127.0.0.1:5250 \
//        --out /tmp/review --pages pages.json
//
// pages.json: [{ "id": "docs-wallet", "url": "/docs/contributors/link-solana-wallet",
//               "persona": "contributor" | "maintainer" | "admin" | null, "opts": { world options }, "phantom": true }]
// Signed-in pages are answered from the fixture world (world/index.mjs), for
// both builds, so a difference between before and after is the code's.
//
// Every page is captured in light and dark, at 1440 and 390, from both builds,
// at THREE scroll positions: the top, halfway, and the bottom. The middle and
// bottom are there because a layout can be right at the top and wrong once
// you scroll (a sticky sidebar that does not stick looked perfect in every
// top-of-page capture). Writes <out>/<id>.<theme>.<width>.<pos>.<before|after>.png
// and <out>/review.html, which lays each pair side by side.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { openPage, settle } from './lib.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const before = arg('before')
const after = arg('after')
const out = arg('out', path.resolve('review-out'))
const pages = JSON.parse(readFileSync(arg('pages'), 'utf8'))
const { world } = await import('./world/index.mjs')
const { phantomWallet } = await import('./fixtures.mjs')
mkdirSync(out, { recursive: true })

const POSITIONS = ['top', 'middle', 'bottom']
let browser
try {
  // DOCS_CHROMIUM: a browser binary, for when Playwright's own build is not the installed one.
  browser = await chromium.launch(process.env.DOCS_CHROMIUM ? { executablePath: process.env.DOCS_CHROMIUM } : {})
} catch {
  browser = await chromium.launch({ channel: 'chrome' })
}

const rows = []
for (const p of pages) {
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      for (const [label, base] of [['before', before], ['after', after]]) {
        if (!base) continue
        const w = world(p.persona ?? 'contributor', p.opts ?? {})
        const init = [...(Array.isArray(w.init) ? w.init : w.init ? [w.init] : []), ...(p.phantom ? [phantomWallet()] : [])]
        const { ctx, page } = await openPage(browser, { base, theme, width, persona: p.persona ? w.persona : null, api: w.api, agent: w.agent, init })
        try {
          const res = await page.goto(base + p.url)
          await page.waitForTimeout(1500)
          await settle(page, 1200)
          const height = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
          for (const pos of POSITIONS) {
            const y = pos === 'top' ? 0 : pos === 'middle' ? Math.round(height / 2) : height
            await page.evaluate((y) => window.scrollTo(0, y), y)
            await page.waitForTimeout(400)
            await page.screenshot({ path: path.join(out, `${p.id}.${theme}.${width}.${pos}.${label}.png`) })
          }
          console.log(`${p.id} ${theme} ${width} ${label}: HTTP ${res?.status()}`)
        } catch (e) {
          console.log(`FAILED ${p.id} ${theme} ${width} ${label}: ${e.message.split('\n')[0]}`)
        } finally {
          await ctx.close()
        }
      }
      for (const pos of POSITIONS) rows.push({ id: p.id, theme, width, pos })
    }
  }
}
await browser.close()

const cell = (f, cap) => `<figure><img loading="lazy" src="${f}"><figcaption>${cap}</figcaption></figure>`
writeFileSync(
  path.join(out, 'review.html'),
  `<!doctype html><meta charset="utf-8"><title>Review</title><style>body{font:14px Inter,system-ui,sans-serif;background:#e8dfd0;color:#2d2820;padding:24px}h2{font-size:15px;margin:28px 0 8px}.row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}figure{margin:0}img{max-width:640px;border:1px solid #0002;border-radius:8px}figcaption{color:#7a6b5a;margin-top:4px}</style>` +
    rows
      .map((r) => {
        const f = (l) => `${r.id}.${r.theme}.${r.width}.${r.pos}.${l}.png`
        return `<h2>${r.id} · ${r.theme} · ${r.width} · ${r.pos}</h2><div class="row">${before ? cell(f('before'), 'before') : ''}${cell(f('after'), 'after')}</div>`
      })
      .join('\n'),
)
console.log(`Review sheet: ${path.join(out, 'review.html')}`)
