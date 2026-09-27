// Reads a narrated-video script: Markdown with numbered segments, each with a
// "Say:" line (the narration) and a "Do:" line (what the screen does).
//
//   # Link your Solana wallet
//   Length target: 60-90 seconds. Persona: contributor. Start: /bounties/link
//   ## 1
//   Say: ...
//   Do: ...

import { readFileSync } from 'node:fs'

export function readScript(file) {
  const text = readFileSync(file, 'utf8')
  const title = /^# (.+)$/m.exec(text)?.[1]?.trim() ?? ''
  const segments = text
    .split(/^## /m)
    .slice(1)
    .map((chunk) => ({
      say: /^Say:\s*([\s\S]*?)(?=^Do:|$(?![\s\S]))/m.exec(chunk)?.[1]?.replace(/\s+/g, ' ').trim() ?? '',
      do: /^Do:\s*([\s\S]*?)$/m.exec(chunk)?.[1]?.replace(/\s+/g, ' ').trim() ?? '',
    }))
    .filter((s) => s.say)
  return { title, segments }
}

/** The narration as spoken and captioned: v3's bracketed audio tags removed. */
export const spoken = (say) => say.replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim()

/** Seconds a segment takes at a natural pace, used before any audio exists. */
export const estimateSeconds = (say) => (spoken(say).split(/\s+/).length / 150) * 60 + 0.4

/** ElevenLabs bills text-to-speech per character, spaces and punctuation included. */
export const characters = (say) => say.length
