import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const brand = readFileSync(join(__dirname, 'brand.css'), 'utf8')
const tailwind = readFileSync(join(__dirname, 'tailwind.css'), 'utf8')

const srgb = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const lum = (hex: string) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const PAGE = '#e8dfd0'
const PANEL = '#d4c5b0'
const DARK = '#1a1512'

describe('the success colour', () => {
  // The values, read out of the file so the test fails if somebody edits them
  // without re-measuring.
  // Split on the .dark rule itself, not the word: the comments say "dark"
  // plenty of times and splitting on that silently took the wrong half.
  const at = brand.indexOf('\n.dark {')
  const root = brand.slice(0, at)
  const darkBlock = brand.slice(at)
  const pick = (block: string, name: string) => /(#[0-9a-f]{6})/i.exec(block.slice(block.indexOf(`--${name}:`)))![1]!
  const light = pick(root, 'brand-success-text')
  const deep = pick(root, 'brand-success-text-deep')
  const dark = pick(darkBlock, 'brand-success-text')

  it('passes AA as text on the page, which the Tailwind green it replaced did not', () => {
    // text-green-500 was 1.72 here and text-green-400 was 1.32.
    expect(ratio(light, PAGE)).toBeGreaterThanOrEqual(4.5)
    expect(ratio('#22c55e', PAGE)).toBeLessThan(4.5)
  })

  it('has a deeper companion for the warm panels, like the gold does', () => {
    // A panel is darker than the page, so the page value loses contrast there.
    // brand.css already warns against clearing the threshold by a hair.
    expect(ratio(deep, PANEL)).toBeGreaterThanOrEqual(5)
  })

  it('flips to a light value on the dark ground rather than staying unreadable', () => {
    expect(ratio(light, DARK)).toBeLessThan(4.5)
    expect(ratio(dark, DARK)).toBeGreaterThanOrEqual(7)
  })

  it('is warm: more red than blue, which is what makes it sit with the gold', () => {
    // Tailwind's greens are blue-leaning, which is why they looked borrowed.
    for (const hex of [light, deep, dark]) {
      const h = hex.replace('#', '')
      const [r, , b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
      expect(r).toBeGreaterThan(b)
    }
    const tw = '#22c55e'.replace('#', '')
    expect(parseInt(tw.slice(0, 2), 16)).toBeLessThan(parseInt(tw.slice(4, 6), 16))
  })

  it('repoints the whole Tailwind green scale, so success moves in one place', () => {
    // ~140 call sites use text-green-*/bg-green-*. Editing them individually
    // is the change most likely to be done partially.
    for (const step of [400, 500, 600, 700, 800, 900]) {
      expect(tailwind).toMatch(new RegExp(`--color-green-${step}:`))
    }
  })
})
