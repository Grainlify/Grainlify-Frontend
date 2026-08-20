import { describe, it, expect, beforeEach } from 'vitest'
import { claimReload, isChunkLoadError, reloadAlreadyUsed } from './chunkReload'

/** A fake Storage whose every method can be made to throw, because the guard's
 *  behaviour WHEN IT CANNOT RECORD is the property that matters most. */
function storage(opts: { throwOnGet?: boolean; throwOnSet?: boolean } = {}): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    getItem: (k: string) => { if (opts.throwOnGet) throw new Error('SecurityError'); return map.get(k) ?? null },
    setItem: (k: string, v: string) => { if (opts.throwOnSet) throw new Error('QuotaExceeded'); map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) },
  } as Storage
}

describe('isChunkLoadError', () => {
  // Each engine words it differently. Matching only Chrome's would leave
  // Firefox and Safari users with the blank page.
  it.each([
    ['Chrome',  'Failed to fetch dynamically imported module: https://x/assets/A-1.js'],
    ['Firefox', 'error loading dynamically imported module'],
    ['Safari',  'Importing a module script failed.'],
    ['Vite CSS','Unable to preload CSS for /assets/x.css'],
  ])('recognises %s', (_engine, message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  // A reload must not be the response to an ordinary render bug: it would
  // discard the person's work to fix nothing.
  it.each([
    'suggested_reason_codes is not iterable',
    'Cannot read properties of null (reading "github")',
    'Network error: Unable to connect to the server.',
    'Authentication failed. Please sign in again.',
  ])('does not treat %s as a chunk failure', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(false)
  })

  it('survives a non-Error being thrown', () => {
    expect(isChunkLoadError('some string')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

describe('claimReload', () => {
  let s: Storage
  beforeEach(() => { s = storage() })

  // The whole guard, in one assertion.
  it('grants exactly one reload, then never again', () => {
    expect(claimReload(s)).toBe(true)
    for (let i = 0; i < 25; i++) expect(claimReload(s)).toBe(false)
  })

  // The flag has to survive the reload it is guarding, which is why it lives
  // in sessionStorage rather than in memory.
  it('stays claimed across a simulated reload', () => {
    expect(claimReload(s)).toBe(true)
    // A reload destroys every module-level variable but not sessionStorage.
    expect(reloadAlreadyUsed(s)).toBe(true)
    expect(claimReload(s)).toBe(false)
  })

  /** The property that decides whether this is safe.
   *
   *  Without a durable flag there is no way to prevent a loop, so the guard
   *  refuses rather than acting blind. An unguarded reload is the one outcome
   *  worse than showing the error: it also destroys whatever was typed, on
   *  every cycle, with no way to stop it from inside the tab.
   */
  it('refuses when it cannot record the flag', () => {
    expect(claimReload(storage({ throwOnSet: true }))).toBe(false)
    expect(claimReload(storage({ throwOnGet: true }))).toBe(false)
    expect(claimReload(null)).toBe(false)
  })

  it('reports no prior reload when storage is unreadable, rather than throwing', () => {
    expect(reloadAlreadyUsed(storage({ throwOnGet: true }))).toBe(false)
    expect(reloadAlreadyUsed(null)).toBe(false)
  })
})

describe('offline', () => {
  // A browser that knows it has no network fetches nothing on reload either, so
  // reloading can only replace a card explaining the problem with a blank page.
  it('does not spend the reload while offline', () => {
    expect(claimReload(storage(), false)).toBe(false)
  })

  it('still reloads when online', () => {
    expect(claimReload(storage(), true)).toBe(true)
  })

  // The check suppresses a reload in a known-bad state; it must never be a
  // precondition that a missing navigator can fail.
  it('does not require proof of being online', () => {
    expect(claimReload(storage())).toBe(true)
  })
})
