// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RenderMarkdownContent from './renderMarkdown'

/**
 * Helper: render markdown and return the container's innerHTML for
 * direct DOM inspection of what survived sanitization.
 */
function renderAndGetHtml(content: string): string {
  const { container } = render(<RenderMarkdownContent content={content} />)
  return container.innerHTML
}

describe('RenderMarkdownContent – sanitization', () => {
  // ── Protocol allowlisting ─────────────────────────────
  it('strips javascript: protocol from href', () => {
    const html = renderAndGetHtml(
      '[click](javascript:alert("xss"))'
    )
    // The link should either be stripped of href or the entire tag removed
    expect(html).not.toContain('javascript:')
  })

  it('strips data: protocol from src', () => {
    const html = renderAndGetHtml(
      '![](data:image/svg+xml;base64,PHN2Zy9vbmxvYWQ9YWxlcnQoMSk+)'
    )
    // data: should not survive as an src attribute
    expect(html).not.toContain('data:image')
  })

  it('allows http protocol in href', () => {
    render(<RenderMarkdownContent content="[link](http://example.com)" />)
    const link = screen.getByRole('link', { name: 'link' })
    expect(link).toHaveAttribute('href', 'http://example.com')
  })

  it('allows https protocol in href', () => {
    render(<RenderMarkdownContent content="[secure](https://example.com)" />)
    const link = screen.getByRole('link', { name: 'secure' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('allows mailto protocol in href', () => {
    render(<RenderMarkdownContent content="[email](mailto:test@example.com)" />)
    const link = screen.getByRole('link', { name: 'email' })
    expect(link).toHaveAttribute('href', 'mailto:test@example.com')
  })

  // ── Raw HTML stripping ────────────────────────────────
  it('strips raw <script> tags embedded in markdown', () => {
    const html = renderAndGetHtml(
      'hello <script>alert("xss")</script> world'
    )
    expect(html).not.toContain('<script>')
    // The text content of the script tag may survive as regular text
  })

  it('strips onerror event handlers from raw HTML img tags', () => {
    const html = renderAndGetHtml(
      '<img src="x" onerror="alert(1)">'
    )
    // rehype-sanitize strips raw HTML tags by default unless they are
    // explicitly allowed, so <img> itself should not appear
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<img')
  })

  // ── Basic formatting ──────────────────────────────────
  it('renders a heading and paragraph from basic markdown', () => {
    render(
      <RenderMarkdownContent
        content={'## Title\n\nThis is a paragraph.'}
      />
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument()
    expect(screen.getByText('This is a paragraph.')).toBeInTheDocument()
  })

  // ── Empty content ─────────────────────────────────────
  it('renders nothing for an empty content string', () => {
    const { container } = render(<RenderMarkdownContent content="" />)
    // react-markdown with empty string returns a container with no children
    expect(container.textContent).toBe('')
  })
})