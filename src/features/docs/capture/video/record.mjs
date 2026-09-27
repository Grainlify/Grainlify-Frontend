// Records a docs video: the real app, driven by a flow, one segment at a time,
// each held for as long as its narration lasts.
//
//   node src/features/docs/capture/video/record.mjs <scripts-dir> <slug> [--silent]
//
// The flow lives in flows/<slug with / as __>.mjs and exports
//   { start: { url, persona, init?, api?, agent? }, segments: [async (page) => { ... }, ...] }
// with one function per script segment, in order. The narration comes from
// the approved script; the audio from the narrate.mjs cache. With --silent the
// segment lengths come from a word-count estimate instead, for a free preview.
//
// Recorded in light and dark at 1440x900. Writes, per theme, a raw .webm and a
// timeline (.json) of when each segment started, for assemble.mjs.

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { openPage, settle } from '../lib.mjs'
import { readScript, estimateSeconds } from './script.mjs'
import { segmentFiles } from './narrate.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../../../..')
export const WORK = path.join(HERE, 'out')

const [dir, slug, ...rest] = process.argv.slice(2)
const silent = rest.includes('--silent')
const file = slug.replace(/\//g, '__')
const { segments } = readScript(path.join(dir, `${file}.md`))
const flow = (await import(path.join(HERE, 'flows', `${file}.mjs`))).default
if (flow.segments.length !== segments.length) throw new Error(`${slug}: script has ${segments.length} segments, flow has ${flow.segments.length}`)

// The length of each segment's audio, read from the mp3 via ffprobe-free parsing:
// duration = decoded samples / sample rate is what ffmpeg reports; here we ask ffprobe.
import { execFileSync } from 'node:child_process'
const voice = silent ? null : process.env.ELEVENLABS_VOICE_ID ?? readFileSync(process.env.ELEVENLABS_ENV ?? path.resolve(ROOT, '../../.elevenlabs.env'), 'utf8').match(/ELEVENLABS_VOICE_ID\s*=\s*['"]?([^'"\s]+)/)?.[1]
const lengths = segments.map((s) => {
  if (silent) return estimateSeconds(s.say)
  const { mp3 } = segmentFiles(voice, s.say)
  if (!existsSync(mp3)) throw new Error(`${slug}: no narration cached for segment "${s.say.slice(0, 40)}…". Run narrate.mjs first.`)
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim())
})

mkdirSync(WORK, { recursive: true })
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5232, strictPort: false, host: '127.0.0.1' } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
let browser
try {
  // DOCS_CHROMIUM: a browser binary, for when Playwright's own build is not the installed one.
  browser = await chromium.launch(process.env.DOCS_CHROMIUM ? { executablePath: process.env.DOCS_CHROMIUM } : {})
} catch {
  browser = await chromium.launch({ channel: 'chrome' })
}

const GAP = 0.35 // seconds of quiet after each segment
for (const theme of ['light', 'dark']) {
  const tmp = path.join(WORK, `tmp-${file}-${theme}`)
  const { ctx, page } = await openPage(browser, { base, theme, width: 1440, persona: flow.start.persona, api: flow.start.api, agent: flow.start.agent, init: flow.start.init ?? [], record: { dir: tmp, size: { width: 1440, height: 900 } } })
  const t0 = Date.now()
  await page.goto(base + flow.start.url)
  await (flow.start.ready ? flow.start.ready(page) : page.locator('body')).waitFor({ timeout: 20000 })
  await settle(page, 800)
  const timeline = []
  for (let i = 0; i < segments.length; i++) {
    const start = (Date.now() - t0) / 1000
    timeline.push({ start, length: lengths[i], say: segments[i].say })
    await flow.segments[i](page)
    // Hold until the narration for this segment has finished.
    const spent = (Date.now() - t0) / 1000 - start
    const wait = Math.max(0, lengths[i] + GAP - spent)
    await page.clock.runFor(Math.round(wait * 1000)).catch(() => {})
    await page.waitForTimeout(Math.round(wait * 1000))
  }
  const end = (Date.now() - t0) / 1000
  const video = page.video()
  await ctx.close()
  const raw = await video.path()
  renameSync(raw, path.join(WORK, `${file}.${theme}.webm`))
  writeFileSync(path.join(WORK, `${file}.${theme}.json`), JSON.stringify({ slug, theme, silent, end, timeline }, null, 1))
  console.log(`${slug} ${theme}: ${end.toFixed(1)}s recorded`)
}
await browser.close()
await server.close()
