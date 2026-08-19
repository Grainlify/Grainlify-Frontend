import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RenderMarkdownContent from './renderMarkdown'

describe('RenderMarkdownContent', () => {
  it('strips an HTML comment instead of rendering it as visible text', () => {
    render(
      <RenderMarkdownContent
        content={'<!-- ghit#filepath: /some/path/.issues-work -->\n# Description\n\nBody text.'}
      />
    )

    expect(screen.queryByText(/ghit#filepath/)).not.toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Body text.')).toBeInTheDocument()
  })

  it('strips a multi-line HTML comment', () => {
    render(
      <RenderMarkdownContent
        content={'<!--\nhidden metadata\nspanning lines\n-->\nVisible paragraph.'}
      />
    )

    expect(screen.queryByText(/hidden metadata/)).not.toBeInTheDocument()
    expect(screen.getByText('Visible paragraph.')).toBeInTheDocument()
  })

  it('renders normal markdown (heading, bold, inline code) unaffected', () => {
    render(
      <RenderMarkdownContent
        content={'## Requirements\n\nSee **EVENTS_PROCESSING.md** and `src/routes/reprocess-events.ts`.'}
      />
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Requirements' })).toBeInTheDocument()
    expect(screen.getByText('EVENTS_PROCESSING.md').tagName).toBe('STRONG')
    expect(screen.getByText('src/routes/reprocess-events.ts').tagName).toBe('CODE')
  })

  it('renders an empty string without crashing', () => {
    const { container } = render(<RenderMarkdownContent content="" />)
    expect(container).toBeInTheDocument()
  })
})

/** What upstream markdown can and cannot make this page request.
 *
 *  This matters because of a trade-off in the CSP added alongside it.
 *  `upgrade-insecure-requests` upgrades ACTIVE mixed content - stylesheets,
 *  scripts, iframes, fetch - which browsers otherwise block outright. That is
 *  strictly more third-party content executing than before, not less.
 *
 *  The exposure is bounded by the renderer rather than by the header: markdown
 *  can only emit an image, and raw HTML is inert because rehype-raw is
 *  deliberately not installed. These tests assert that bound instead of
 *  reasoning about it, so that adding rehype-raw later fails here rather than
 *  silently widening what the header will upgrade.
 */
describe('RenderMarkdownContent: what upstream content can emit', () => {
  const activeHtml = [
    ['script', '<script src="http://evil.example.com/x.js"></script>'],
    ['stylesheet link', '<link rel="stylesheet" href="http://evil.example.com/x.css">'],
    ['iframe', '<iframe src="http://evil.example.com/frame"></iframe>'],
    ['style block', '<style>body{background:url("http://evil.example.com/bg.png")}</style>'],
    ['object', '<object data="http://evil.example.com/x.swf"></object>'],
    ['embed', '<embed src="http://evil.example.com/x">'],
    ['raw img', '<img src="http://evil.example.com/tracker.gif">'],
  ] as const

  it.each(activeHtml)('renders raw %s as inert text, not as an element', (_label, html) => {
    const { container } = render(<RenderMarkdownContent content={html} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('link')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('style')).toBeNull()
    expect(container.querySelector('object')).toBeNull()
    expect(container.querySelector('embed')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    // Positively demonstrate why: the markup arrives escaped, as text. An
    // earlier version of this test asserted the absence of the substring
    // "src=", which fails on correct output - escaped text still contains
    // those characters. The escaping is the fact worth asserting.
    expect(container.innerHTML).toContain('&lt;')
  })

  // The one subresource markdown CAN emit, and it is passive. Asserted so the
  // bound is stated as a fact rather than assumed from the absence of tests.
  it('does render a markdown image, which is the only subresource it can emit', () => {
    const { container } = render(
      <RenderMarkdownContent content={'![badge](http://img.example.com/b.svg)'} />
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('http://img.example.com/b.svg')
  })

  // A link is a navigation, not a subresource: it loads nothing until clicked
  // and so is not mixed content.
  it('renders a markdown link as an anchor, which loads nothing', () => {
    const { container } = render(
      <RenderMarkdownContent content={'[x](http://example.com/page)'} />
    )
    expect(container.querySelector('a')?.getAttribute('href')).toBe('http://example.com/page')
    expect(container.querySelector('img')).toBeNull()
  })

  // The guard that keeps the above true.
  it('has no rehype-raw wired in, which is what keeps raw HTML inert', async () => {
    const mod = await import('./renderMarkdown?raw').catch(() => null)
    const src = (mod as { default?: string } | null)?.default
    if (typeof src === 'string') {
      // Match an actual import or plugin wiring, not the word. The file's own
      // comment explains why rehype-raw is absent, and a bare /rehype-raw/
      // search matches that explanation - a check that fails on correct code.
      expect(src).not.toMatch(/^\s*import[^\n]*rehype-raw/m)
      expect(src).not.toMatch(/rehypePlugins/)
    }
    const { container } = render(<RenderMarkdownContent content={'<b>bold</b>'} />)
    expect(container.querySelector('b')).toBeNull()
    expect(container.innerHTML).toContain('&lt;b&gt;')
  })
})
