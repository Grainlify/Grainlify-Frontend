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
})
