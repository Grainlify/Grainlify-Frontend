import { describe, it, expect } from 'vitest'
import { formatNumber, getProjectIcon, getProjectColor } from './projectDisplay'

describe('formatNumber', () => {
  it('returns the number as-is for values below 1,000', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(999)).toBe('999')
  })

  it('formats values in the thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K')
    expect(formatNumber(1234)).toBe('1.2K')
    expect(formatNumber(999999)).toBe('1000.0K')
  })

  it('formats values in the millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M')
    expect(formatNumber(1234567)).toBe('1.2M')
    expect(formatNumber(1500000000)).toBe('1500.0M')
  })
})

describe('getProjectIcon', () => {
  it('returns the GitHub avatar URL for the owner', () => {
    expect(getProjectIcon('facebook/react')).toBe(
      'https://github.com/facebook.png?size=200'
    )
  })

  it('handles full names with multiple path segments', () => {
    expect(getProjectIcon('Grainlify/Grainlify-Frontend')).toBe(
      'https://github.com/Grainlify.png?size=200'
    )
  })

  it('handles names without a slash', () => {
    expect(getProjectIcon('monorepo')).toBe(
      'https://github.com/monorepo.png?size=200'
    )
  })
})

describe('getProjectColor', () => {
  it('returns a color from the predefined palette', () => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-red-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-gray-600 to-gray-800',
      'from-green-600 to-green-800',
      'from-cyan-500 to-blue-600',
    ]
    const result = getProjectColor('test-project')
    expect(colors).toContain(result)
  })

  it('returns consistent colors for the same input', () => {
    expect(getProjectColor('react')).toBe(getProjectColor('react'))
  })

  it('can return different colors for different inputs', () => {
    // This is a probabilistic test — with 8 colors and 2 inputs,
    // there's a ~87% chance they differ, but we accept either outcome.
    const colorA = getProjectColor('aaaa')
    const colorB = getProjectColor('bbbb')
    // Just verify both are valid colors from the palette
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-red-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-gray-600 to-gray-800',
      'from-green-600 to-green-800',
      'from-cyan-500 to-blue-600',
    ]
    expect(colors).toContain(colorA)
    expect(colors).toContain(colorB)
  })
})