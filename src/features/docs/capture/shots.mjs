// Every screenshot the docs use, gathered from shots/*.mjs (one file per docs
// section, so sections can be worked on separately). A Markdown page embeds a
// shot as ![alt](shot:<id> "caption"), and run.mjs writes four files for it:
// public/docs-media/shots/<id>.<light|dark>.<1440|390>.webp (or two, for a
// shot with widths: [1440]).
//
// Each entry: { id, page, url, persona?, api?, agent?, init?, tour?, widths?,
//   steps?(page, width), ready(page, width) -> locator, frame(page, width) -> 'viewport' | {x,y,width,height} }

import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shots')
export const SHOTS = []
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(path.join(DIR, f))
  SHOTS.push(...mod.SHOTS.map((s) => ({ ...s, section: f.replace(/\.mjs$/, '') })))
}
const seen = new Set()
for (const s of SHOTS) {
  if (seen.has(s.id)) throw new Error(`Shot id "${s.id}" is defined twice`)
  seen.add(s.id)
}
