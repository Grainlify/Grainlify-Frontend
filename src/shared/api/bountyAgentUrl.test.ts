import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('the agent base URL', () => {
  // A production build must never call the agent cross-origin. It was made to
  // do exactly that by a deployment variable: VITE_BOUNTY_AGENT_URL was set to
  // the agent's absolute URL in Vercel, which overrode the same-origin proxy
  // and reproduced the very bug the proxy exists to prevent -- with the
  // deployed commit looking correct the whole time.
  const src = readFileSync(join(__dirname, 'bountyAgent.ts'), 'utf8')

  it('is a same-origin path, never an absolute URL, outside development', () => {
    const decl = /export const BOUNTY_AGENT_URL[\s\S]*?;\n/.exec(src)?.[0] ?? ''
    expect(decl).toContain('import.meta.env.DEV')
    // The non-dev branch is the literal path and nothing else.
    expect(decl).toMatch(/:\s*'\/agent';/)
  })

  it('has no absolute agent host anywhere in the client', () => {
    expect(src).not.toMatch(/https:\/\/agent\./)
    expect(src).not.toMatch(/railway\.app/)
  })
})
