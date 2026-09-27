// Uploads the docs' screenshots and videos to Vercel Blob and records them in
// src/features/docs/media-manifest.json, which is what the site reads.
//
//   node src/features/docs/capture/upload.mjs --dry-run   list what would go up
//   BLOB_READ_WRITE_TOKEN=... node src/features/docs/capture/upload.mjs
//   node src/features/docs/capture/upload.mjs --index     only (re)write the manifest's file list, no upload
//
// Reads public/docs-media/{shots,videos}/ (written by run.mjs and video/assemble.mjs;
// not committed). Each file is stored as docs-media/<dir>/<name>.<hash8>.<ext>, so an
// unchanged file is skipped and a changed one gets a new URL. Old versions are left
// in the store; nothing is ever deleted by this script.
//
// The token is read from the environment and never printed.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../../..')
const MEDIA = path.join(ROOT, 'public/docs-media')
const MANIFEST = path.resolve(HERE, '../media-manifest.json')
const dryRun = process.argv.includes('--dry-run')
const indexOnly = process.argv.includes('--index')

const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.mp3': 'audio/mpeg' }
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))

const local = ['shots', 'videos'].flatMap((dir) =>
  existsSync(path.join(MEDIA, dir))
    ? readdirSync(path.join(MEDIA, dir))
        .filter((n) => TYPES[path.extname(n)])
        .map((n) => `${dir}/${n}`)
    : [],
)

const hashed = (key) => {
  const hash = createHash('sha256').update(readFileSync(path.join(MEDIA, key))).digest('hex').slice(0, 8)
  const ext = key.endsWith('.poster.webp') ? '.poster.webp' : path.extname(key)
  return `docs-media/${key.slice(0, -ext.length)}.${hash}${ext}`
}

const todo = local.map((key) => ({ key, pathname: hashed(key) })).filter((f) => manifest.files[f.key] !== f.pathname)
console.log(`${local.length} local files, ${todo.length} new or changed`)

const save = () => {
  const sorted = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(MANIFEST, JSON.stringify({ ...manifest, files: sorted }, null, 2) + '\n')
}

if (dryRun) {
  for (const f of todo) console.log(`  ${f.key} -> ${f.pathname}`)
  process.exit(0)
}
if (indexOnly) {
  // Locally served files keep their plain name: media.ts only uses the hashed
  // name once `base` points at Blob.
  for (const key of local) manifest.files[key] ??= key
  save()
  console.log(`manifest lists ${Object.keys(manifest.files).length} files`)
  process.exit(0)
}

const token = process.env.BLOB_READ_WRITE_TOKEN
if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN is not set')
  process.exit(1)
}
const storeId = token.split('_')[3]
if (!storeId) {
  console.error('BLOB_READ_WRITE_TOKEN does not look like a Blob read-write token')
  process.exit(1)
}
const base = `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com`

async function put({ key, pathname }, attempt = 0) {
  const res = await fetch(`https://vercel.com/api/blob/?${new URLSearchParams({ pathname })}`, {
    method: 'PUT',
    body: readFileSync(path.join(MEDIA, key)),
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '12',
      'x-vercel-blob-store-id': storeId,
      'x-vercel-blob-access': 'public',
      'x-add-random-suffix': '0',
      'x-allow-overwrite': '1',
      'x-content-type': TYPES[path.extname(key)],
      // Names carry a content hash, so a file never changes under its URL.
      'x-cache-control-max-age': String(365 * 24 * 3600),
    },
  })
  if (res.ok) {
    const body = await res.json()
    if (!body.url?.startsWith(base)) throw new Error(`unexpected URL for ${key}`)
    return
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    return put({ key, pathname }, attempt + 1)
  }
  throw new Error(`${key}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
}

let done = 0
const queue = [...todo]
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let f; (f = queue.shift()); ) {
      await put(f)
      manifest.files[f.key] = f.pathname
      if (++done % 50 === 0) {
        console.log(`  ${done}/${todo.length}`)
        save()
      }
    }
  }),
)
manifest.base = base
save()
console.log(`uploaded ${done}; the site now reads media from ${base}`)
