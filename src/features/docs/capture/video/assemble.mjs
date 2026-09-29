// Turns a recording (record.mjs) and its narration (narrate.mjs) into the
// published video: H.264 MP4, a poster frame, and WebVTT captions.
//
//   node src/features/docs/capture/video/assemble.mjs <slug> [--out <dir>]
//
// Per theme: the recording is trimmed to start on the loaded page, each
// segment's narration is placed at the moment its screen action began,
// loudness is normalised to -16 LUFS, and captions are built from ElevenLabs'
// character timings (or evenly spread over the estimate for a silent cut).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { segmentFiles, voiceId } from './narrate.mjs'
import { spoken } from './script.mjs'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../../../..')
const WORK = path.join(HERE, 'out')
const args = process.argv.slice(2)
const slug = args[0]
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(HERE, '../out/videos')
const file = slug.replace(/\//g, '__')
mkdirSync(outDir, { recursive: true })

const LEAD = 0.5 // seconds shown before the first segment
const pad = (n) => String(n).padStart(2, '0')
const stamp = (t) => `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(Math.floor(t % 60))}.${String(Math.round((t % 1) * 1000)).padStart(3, '0')}`

/** Caption cues for one segment: words grouped into lines of at most ~42 characters. */
function cues(say, start, length, alignment) {
  const words = []
  if (alignment) {
    // Rebuild words from per-character timings.
    let w = null
    let inTag = false
    alignment.characters.forEach((ch, i) => {
      // Audio tags ([calm], [chuckles]) are direction, not words: no caption.
      if (ch === '[') inTag = true
      if (inTag) {
        if (ch === ']') inTag = false
        return
      }
      if (/\s/.test(ch)) {
        if (w) words.push(w), (w = null)
        return
      }
      if (!w) w = { text: '', from: alignment.character_start_times_seconds[i], to: 0 }
      w.text += ch
      w.to = alignment.character_end_times_seconds[i]
    })
    if (w) words.push(w)
  } else {
    const parts = spoken(say).split(/\s+/)
    parts.forEach((text, i) => words.push({ text, from: (i / parts.length) * length, to: ((i + 1) / parts.length) * length }))
  }
  const out = []
  let line = null
  for (const w of words) {
    if (line && (line.text + ' ' + w.text).length > 42) out.push(line), (line = null)
    if (!line) line = { text: w.text, from: w.from, to: w.to }
    else (line.text += ' ' + w.text), (line.to = w.to)
    if (/[.!?]$/.test(w.text)) out.push(line), (line = null)
  }
  if (line) out.push(line)
  return out.map((c) => ({ from: start + c.from, to: start + Math.max(c.to, c.from + 0.8), text: c.text }))
}

for (const theme of ['light', 'dark']) {
  const tl = JSON.parse(readFileSync(path.join(WORK, `${file}.${theme}.json`), 'utf8'))
  const webm = path.join(WORK, `${file}.${theme}.webm`)
  const trim = Math.max(0, tl.timeline[0].start - LEAD)
  const duration = tl.end - trim
  const base = path.join(outDir, `${file}.${theme}`)

  const inputs = ['-ss', trim.toFixed(3), '-i', webm]
  const filters = []
  const mixes = []
  const allCues = []
  let voice = null
  if (!tl.silent) voice = voiceId()
  tl.timeline.forEach((seg, i) => {
    const at = seg.start - trim
    let alignment = null
    if (!tl.silent) {
      const f = segmentFiles(voice, seg.say)
      inputs.push('-i', f.mp3)
      filters.push(`[${i + 1}:a]adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)}[a${i}]`)
      mixes.push(`[a${i}]`)
      if (existsSync(f.json)) alignment = JSON.parse(readFileSync(f.json, 'utf8')).alignment
    }
    allCues.push(...cues(seg.say, at, seg.length, alignment))
  })

  const common = ['-y', ...inputs]
  const video = ['-map', '0:v', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-t', duration.toFixed(3)]
  if (tl.silent) {
    execFileSync('ffmpeg', [...common, ...video, '-an', `${base}.mp4`], { stdio: 'ignore' })
  } else {
    const graph = `${filters.join(';')};${mixes.join('')}amix=inputs=${mixes.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`
    execFileSync('ffmpeg', [...common, '-filter_complex', graph, ...video, '-map', '[aout]', '-c:a', 'aac', '-b:a', '128k', `${base}.mp4`], { stdio: 'ignore' })
  }
  // Poster: the first frame of the first segment.
  // (This ffmpeg build has no WebP encoder: take a PNG, and let sharp write the WebP.)
  const png = execFileSync('ffmpeg', ['-v', 'error', '-ss', LEAD.toFixed(2), '-i', `${base}.mp4`, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { maxBuffer: 64 << 20 })
  await sharp(png).webp({ quality: 80 }).toFile(`${base}.poster.webp`)
  writeFileSync(`${base}.vtt`, 'WEBVTT\n\n' + allCues.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join('\n'))
  const mb = (Number(execFileSync('stat', ['-f', '%z', `${base}.mp4`]).toString()) / 1e6).toFixed(1)
  console.log(`${slug} ${theme}: ${duration.toFixed(1)}s, ${mb} MB${tl.silent ? ' (silent cut)' : ''}`)
}
