// Small helpers shared by every file in the fixture world.
//
// Every date is relative to the capture clock (lib.mjs NOW), so "3 days ago"
// and "closes in 5 hours" read the same whenever the screenshots are taken.

import { NOW } from '../lib.mjs'

export { NOW }

const H = 3_600_000
const D = 24 * H

/** An ISO time `days` (and optionally `hours`) before the capture clock. */
export const ago = (days, hours = 0, minutes = 0) => new Date(NOW.getTime() - days * D - hours * H - minutes * 60_000).toISOString()

/** An ISO time after the capture clock. */
export const ahead = (days, hours = 0, minutes = 0) => new Date(NOW.getTime() + days * D + hours * H + minutes * 60_000).toISOString()

/** The generated-avatar URL for a user or org (lib.mjs draws it from the path). */
export const avatar = (login) => `https://avatars.example/${login}`

/** A deterministic pseudo-random sequence, so the world is identical on every run. */
export function seeded(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

/** A UUID-shaped id derived from a short name, stable across runs. */
export function uuidFor(name) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (const c of name) {
    h1 = Math.imul(h1 ^ c.charCodeAt(0), 16777619) >>> 0
    h2 = Math.imul(h2 + c.charCodeAt(0), 2246822519) >>> 0
  }
  const hex = (n, len) => n.toString(16).padStart(8, '0').slice(0, len)
  const a = hex(h1, 8)
  const b = hex(h2, 8)
  const c = hex(Math.imul(h1, 31) ^ h2, 8)
  const d = hex(Math.imul(h2, 17) ^ h1, 8)
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4, 8)}${d}`
}

/** A contribution calendar for the year up to the capture clock. */
export function calendar(seed, intensity = 1) {
  const rnd = seeded(seed)
  const days = []
  let total = 0
  for (let i = 364; i >= 0; i--) {
    const date = new Date(NOW.getTime() - i * D)
    const weekday = date.getUTCDay()
    const busy = weekday !== 0 && weekday !== 6
    // Busier in recent months, quieter on weekends, with some empty days.
    const recency = 0.45 + 0.55 * (1 - i / 365)
    const r = rnd()
    let count = 0
    if (r < (busy ? 0.72 : 0.35) * recency) count = Math.round(rnd() * 7 * intensity * recency) + (rnd() < 0.2 ? 3 : 0)
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 9 ? 3 : 4
    total += count
    days.push({ date: date.toISOString().slice(0, 10), count, level })
  }
  return { calendar: days, total }
}

/**
 * A tiny PNG-free "screenshot" for proof uploads: an SVG data URL with a caption.
 * The admin review shows it with object-fit: cover in a fixed-height box, which
 * crops the sides on a phone and the top and bottom on a computer, so what
 * matters (name, handle, the Following button) sits in the middle.
 */
export function proofImage(title, handle) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f6f1e8"/><rect x="0" y="0" width="640" height="56" fill="#2d2820"/><text x="112" y="36" font-family="Inter,Arial,sans-serif" font-size="20" fill="#f5efe5">${title}</text><circle cx="148" cy="140" r="36" fill="#c9983a"/><text x="198" y="132" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#2d2820">Grainlify</text><text x="198" y="160" font-family="Inter,Arial,sans-serif" font-size="15" fill="#7a6b5a">Followed by @${handle}</text><rect x="112" y="196" width="112" height="36" rx="18" fill="#a67c2e"/><text x="168" y="219" font-family="Inter,Arial,sans-serif" font-size="15" fill="#fff" text-anchor="middle">Following</text><rect x="112" y="252" width="416" height="12" rx="6" fill="#e3d8c6"/><rect x="112" y="276" width="300" height="12" rx="6" fill="#e3d8c6"/></svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

/** Filters a list by the query parameters a request carries. */
export const query = (req) => new URL(req.url()).searchParams
