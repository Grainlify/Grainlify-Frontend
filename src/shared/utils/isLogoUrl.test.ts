import { describe, it, expect } from 'vitest'
import { isLogoUrl } from './isLogoUrl'

describe('isLogoUrl', () => {
  it('returns true for http URLs', () => {
    expect(isLogoUrl('http://example.com/logo.png')).toBe(true)
  })

  it('returns true for https URLs', () => {
    expect(isLogoUrl('https://example.com/logo.png')).toBe(true)
  })

  it('returns false for relative paths', () => {
    expect(isLogoUrl('/images/logo.png')).toBe(false)
  })

  it('returns false for emoji strings', () => {
    expect(isLogoUrl('🚀')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isLogoUrl('')).toBe(false)
  })
})