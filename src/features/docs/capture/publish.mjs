// Uploads the docs' screenshots and videos to Vercel Blob, and records what is
// there in published.json, which the docs tests check every page against.
//
//   node src/features/docs/capture/publish.mjs [shots|videos] [file ...]
//
// Reads capture/out/shots/*.webp (from run.mjs) and capture/out/videos/*
// (from video/assemble.mjs), and writes them to <MEDIA_BASE in media.ts>/shots
// and /videos, public, under their own names. The version folder in MEDIA_BASE
// (docs-media/v1, v2, ...) is what makes a long cache safe: to replace media
// that is already live, bump it in media.ts and publish everything again.
//
// The read-write token comes from BLOB_ENV (default
// ~/.config/grainlify-docs/blob.env, outside every repository) and is never
// printed. The Blob SDK is not an app dependency: install it once outside the
// app with `npm install --prefix ~/.cache/grainlify-docs-tools @vercel/blob`
// (or point BLOB_SDK_DIR at another folder). Never run from CI.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const sdkDir = process.env.BLOB_SDK_DIR ?? path.join(os.homedir(), '.cache/grainlify-docs-tools')
const { put, list } = createRequire(path.join(sdkDir, 'noop.js'))('@vercel/blob')
const envFile = process.env.BLOB_ENV ?? path.join(os.homedir(), '.config/grainlify-docs/blob.env')
const token = readFileSync(envFile, 'utf8').match(/BLOB_READ_WRITE_TOKEN\s*=\s*['"]?([^'"\s]+)/)?.[1]
if (!token) throw new Error(`BLOB_READ_WRITE_TOKEN is not set in ${envFile}`)

const base = readFileSync(path.join(HERE, '../media.ts'), 'utf8').match(/MEDIA_BASE = '([^']+)'/)[1]
const prefix = base.replace(/^https:\/\/[^/]+\//, '') // e.g. docs-media/v1
const TYPES = { webp: 'image/webp', mp4: 'video/mp4', vtt: 'text/vtt' }

const [kindArg, ...only] = process.argv.slice(2)
for (const kind of kindArg ? [kindArg] : ['shots', 'videos']) {
  const dir = path.join(HERE, 'out', kind)
  let files = readdirSync(dir).filter((f) => TYPES[f.split('.').pop()])
  if (only.length) files = files.filter((f) => only.includes(f))
  const queue = [...files]
  const failed = []
  let bytes = 0
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const f = queue.shift()
      const body = readFileSync(path.join(dir, f))
      for (let attempt = 1; ; attempt++) {
        try {
          await put(`${prefix}/${kind}/${f}`, body, { token, access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: TYPES[f.split('.').pop()], cacheControlMaxAge: 31536000 })
          bytes += body.length
          break
        } catch (e) {
          if (attempt >= 3) { failed.push(`${f}: ${String(e.message).slice(0, 160)}`); break }
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
    }
  }))
  console.log(`${kind}: uploaded ${files.length - failed.length} of ${files.length}, ${(bytes / 1e6).toFixed(1)} MB`)
  if (failed.length) console.log('Failed:\n  ' + failed.join('\n  '))
}

// What is actually on Blob now, whoever uploaded it.
const names = { shots: [], videos: [] }
for (let cursor; ;) {
  const page = await list({ token, prefix: `${prefix}/`, cursor, limit: 1000 })
  for (const b of page.blobs) {
    const [kind, name] = b.pathname.slice(prefix.length + 1).split('/')
    if (names[kind] && name) names[kind].push(name)
  }
  if (!page.hasMore) break
  cursor = page.cursor
}
// A video counts as published when both themes have the video, captions and poster.
const videos = [...new Set(names.videos.map((n) => n.split('.')[0]))].filter((s) =>
  ['light', 'dark'].every((t) => ['mp4', 'vtt', 'poster.webp'].every((e) => names.videos.includes(`${s}.${t}.${e}`))),
)
writeFileSync(
  path.join(HERE, 'published.json'),
  JSON.stringify({ base, shots: names.shots.sort(), videos: videos.map((s) => s.replace(/__/g, '/')).sort() }, null, 1) + '\n',
)
console.log(`published.json: ${names.shots.length} screenshots, ${videos.length} videos.`)
