import { describe, it, expect } from 'vitest'
import { getOnBrandGradient } from './motionVariants'

// Mirrors the private ON_BRAND_GRADIENTS palette declared in motionVariants.ts.
// It isn't exported, so it's duplicated here deliberately to assert the
// function never returns anything outside the declared palette. Keep this in
// sync if the source palette ever changes.
const KNOWN_GRADIENTS = [
  'from-[#c9983a] to-[#a67c2e]',
  'from-[#d4af37] to-[#a67c2e]',
  'from-[#a67c2e] to-[#8b7355]',
  'from-[#8b6f3a] to-[#2d2820]',
  'from-[#c9983a] to-[#2d2820]',
  'from-[#a67c2e] to-[#2d2820]',
]

describe('getOnBrandGradient', () => {
  it('is deterministic: the same name always returns the same gradient', () => {
    const name = 'grainlify-core'

    const first = getOnBrandGradient(name)
    const second = getOnBrandGradient(name)
    const third = getOnBrandGradient(name)

    expect(first).toBe(second)
    expect(second).toBe(third)
  })

  it('always returns one of the declared palette gradients', () => {
    const names = [
      'facebook/react',
      'a',
      'zzz',
      'Grainlify',
      '',
      'tokio-rs/tokio',
      'x'.repeat(50),
    ]

    for (const name of names) {
      expect(KNOWN_GRADIENTS).toContain(getOnBrandGradient(name))
    }
  })

  it('maps different names to more than one gradient (not a constant function)', () => {
    const results = new Set(
      ['alpha', 'bravo-project', 'zzz', 'a'].map((name) => getOnBrandGradient(name))
    )

    expect(results.size).toBeGreaterThan(1)
  })
})
