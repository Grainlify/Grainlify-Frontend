// Narration for the docs videos, from ElevenLabs.
//
//   node src/features/docs/capture/video/narrate.mjs <scripts-dir> [slug ...]
//       Prints what generating would cost. Generates nothing.
//
//   node src/features/docs/capture/video/narrate.mjs <scripts-dir> [slug ...] --approve <credits> [--allow-free]
//       Generates the segments that are not cached yet, but only if:
//         - the account's subscription is Starter or above, or --allow-free is
//           given (the free tier has no commercial licence and requires
//           crediting ElevenLabs; the product owner chose it on 27 Sep 2026);
//         - the uncached characters are no more than <credits>, the number the
//           run was approved at;
//         - they fit in what is left of this month's allowance.
//
// The key and voice are read from ELEVENLABS_ENV (default: the AnsemHack
// folder's .elevenlabs.env, outside every repository). ELEVENLABS_VOICE, if
// set, picks another voice by its (public) ID, e.g. a built-in one. The key is never
// printed or written anywhere. Audio is cached by a hash of the text, voice,
// model and settings, so an unchanged sentence is never billed twice; editing
// one sentence regenerates only that segment. Never run from CI.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readScript, characters } from './script.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const CACHE = path.join(HERE, 'cache')
// Eleven v3, which performs bracketed audio tags ([calm], [chuckles], [pause])
// as direction rather than reading them out. Stability 0.5 is v3's "Natural"
// setting: responsive to tags, close to the original voice.
const MODEL = 'eleven_v3'
const SETTINGS = { stability: 0.5, similarity_boost: 0.75 }
const PAID_TIERS = ['starter', 'creator', 'pro', 'scale', 'business', 'enterprise']

function loadEnv() {
  const file = process.env.ELEVENLABS_ENV ?? path.resolve(HERE, '../../../../../../../.elevenlabs.env')
  const env = Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')]),
  )
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) throw new Error(`ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must both be set in ${file}`)
  if (process.env.ELEVENLABS_VOICE) env.ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE
  return env
}

/** The voice the narration is made with; record and assemble look audio up by it. */
export const voiceId = () => loadEnv().ELEVENLABS_VOICE_ID

export const cacheKey = (voice, text) => createHash('sha256').update(JSON.stringify({ voice, model: MODEL, settings: SETTINGS, text })).digest('hex').slice(0, 24)

export function segmentFiles(voice, text) {
  const k = cacheKey(voice, text)
  return { mp3: path.join(CACHE, `${k}.mp3`), json: path.join(CACHE, `${k}.json`) }
}

async function subscription(key) {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } })
  if (!res.ok) throw new Error(`subscription check failed: HTTP ${res.status}`)
  return res.json()
}

async function generate(key, voice, text) {
  const body = JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS })
  const headers = { 'xi-api-key': key, 'content-type': 'application/json' }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers, body })
  if (res.ok) return res.json()
  const detail = (await res.text()).slice(0, 300)
  // If timings are not offered for this model, take the audio alone; captions
  // then fall back to spreading the words over the audio's length.
  if (res.status === 400 || res.status === 422) {
    const plain = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers, body })
    if (plain.ok) return { audio_base64: Buffer.from(await plain.arrayBuffer()).toString('base64'), alignment: null, note: detail }
    throw new Error(`text-to-speech failed: HTTP ${plain.status} ${(await plain.text()).slice(0, 300)}`)
  }
  throw new Error(`text-to-speech failed: HTTP ${res.status} ${detail}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const dir = args[0]
  const approveAt = args.indexOf('--approve')
  const approved = approveAt >= 0 ? Number(args[approveAt + 1]) : null
  const only = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--approve')
  const files = readdirSync(dir).filter((f) => f.endsWith('.md') && (!only.length || only.includes(f.replace(/\.md$/, '').replace(/__/g, '/'))))

  const env = loadEnv()
  mkdirSync(CACHE, { recursive: true })
  let total = 0
  let uncached = 0
  const todo = []
  for (const f of files) {
    const { title, segments } = readScript(path.join(dir, f))
    const chars = segments.reduce((n, s) => n + characters(s.say), 0)
    const missing = segments.filter((s) => !existsSync(segmentFiles(env.ELEVENLABS_VOICE_ID, s.say).mp3))
    const missingChars = missing.reduce((n, s) => n + characters(s.say), 0)
    total += chars
    uncached += missingChars
    todo.push(...missing)
    console.log(`${f.padEnd(48)} ${String(segments.length).padStart(2)} segments  ${String(chars).padStart(5)} chars  ${String(missingChars).padStart(5)} to generate  ${title}`)
  }
  console.log(`\nTotal ${total} characters; ${uncached} not cached. Text-to-speech costs 1 credit per character (tags and spaces included): this run would cost ${uncached} credits.`)

  if (approved === null) process.exit(0)
  if (uncached > approved) throw new Error(`Refusing: ${uncached} credits needed, run approved at ${approved}.`)
  const sub = await subscription(env.ELEVENLABS_API_KEY)
  const paid = PAID_TIERS.includes(String(sub.tier).toLowerCase())
  if (!paid && !args.includes('--allow-free')) throw new Error(`Refusing: the ElevenLabs account is on the "${sub.tier}" tier, not Starter or above. Pass --allow-free only if the product owner chose the free tier.`)
  const left = sub.character_limit - sub.character_count
  if (uncached > left) throw new Error(`Refusing: ${uncached} credits needed, ${left} left this month.`)
  console.log(`Subscription: ${sub.tier}, ${left} credits left. Generating ${todo.length} segments.`)
  for (const s of todo) {
    const out = segmentFiles(env.ELEVENLABS_VOICE_ID, s.say)
    if (existsSync(out.mp3)) continue
    const r = await generate(env.ELEVENLABS_API_KEY, env.ELEVENLABS_VOICE_ID, s.say)
    writeFileSync(out.mp3, Buffer.from(r.audio_base64, 'base64'))
    writeFileSync(out.json, JSON.stringify({ text: s.say, model: MODEL, alignment: r.alignment ?? null }, null, 1))
    process.stdout.write('.')
  }
  const after = await subscription(env.ELEVENLABS_API_KEY)
  console.log(`\nDone. Credits used this month: ${after.character_count} of ${after.character_limit}.`)
}
