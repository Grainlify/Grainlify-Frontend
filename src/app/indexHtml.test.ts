import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')

describe('index.html', () => {
  it('has the empty root markup exactly once', () => {
    // The docs prerender fills the first `<div id="root"></div>` it finds.
    // Written out anywhere else - a comment included - it fills that instead
    // and the docs pages ship with their article commented out, which a
    // throttled measurement caught once already.
    expect(html.split('<div id="root"></div>').length - 1).toBe(1)
  })

  it('applies the saved theme before any stylesheet', () => {
    // An inline script after a stylesheet stops the parser until that
    // stylesheet has downloaded - here, a third-party one.
    const theme = html.indexOf("localStorage.getItem('theme')")
    const firstStylesheet = html.search(/rel="stylesheet"/)
    expect(theme).toBeGreaterThan(-1)
    expect(theme).toBeLessThan(firstStylesheet)
  })

  it('gives the home page a description and link-preview tags', () => {
    for (const tag of [
      '<meta name="description"',
      '<meta property="og:title"',
      '<meta property="og:description"',
      '<meta property="og:image" content="https://grainlify.com/og-home.png"',
      '<meta property="og:url" content="https://grainlify.com/"',
      '<meta property="og:type" content="website"',
      '<meta name="twitter:card" content="summary_large_image"',
    ]) {
      expect(html).toContain(tag)
    }
    // Inside the block the docs prerender strips, so docs pages do not
    // inherit them.
    const start = html.indexOf('<!-- home-meta:')
    const end = html.indexOf('<!-- /home-meta -->')
    expect(start).toBeGreaterThan(-1)
    expect(html.indexOf('property="og:title"')).toBeGreaterThan(start)
    expect(html.indexOf('property="og:title"')).toBeLessThan(end)
  })

  it('points the preview at an image that exists, at the size the tags state', () => {
    const png = readFileSync(resolve(__dirname, '../../public/og-home.png'))
    // PNG IHDR: width and height are big-endian at bytes 16 and 20.
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
  })
})
