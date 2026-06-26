import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import RenderMarkdownContent from './renderMarkdown'

describe('RenderMarkdownContent', () => {
  it('strips raw script tags and nested HTML event-handler payloads', () => {
    const { container } = render(
      <RenderMarkdownContent
        content={`
Safe copy.

<script>window.__grainlifyMarkdownScript = true</script>

<div><img src="https://example.com/tracker.png" onerror="window.__grainlifyMarkdownImage = true"></div>
`}
      />
    )

    expect(screen.getByText('Safe copy.')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('__grainlifyMarkdownScript')
    expect(container.innerHTML).not.toContain('__grainlifyMarkdownImage')
    expect(container.innerHTML).not.toContain('onerror')
    expect((window as unknown as Record<string, unknown>).__grainlifyMarkdownScript).toBeUndefined()
    expect((window as unknown as Record<string, unknown>).__grainlifyMarkdownImage).toBeUndefined()
  })

  it('blocks javascript links from becoming clickable hrefs', () => {
    render(<RenderMarkdownContent content="[open me](javascript:alert(1))" />)

    const linkText = screen.getByText('open me')
    const href = linkText.closest('a')?.getAttribute('href') ?? ''

    expect(href).not.toMatch(/^javascript:/i)
  })

  it('blocks data URI image sources while preserving safe alt text', () => {
    render(
      <RenderMarkdownContent content="![tracking pixel](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+)" />
    )

    const image = screen.getByAltText('tracking pixel')

    expect(image.getAttribute('src') ?? '').not.toMatch(/^data:/i)
  })

  it('still renders benign markdown headings, safe links, and inline code', () => {
    render(
      <RenderMarkdownContent
        content={`
## Release notes

[Read the docs](https://example.com/docs)

\`pnpm test\`
`}
      />
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Release notes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read the docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs'
    )
    expect(screen.getByText('pnpm test')).toBeInTheDocument()
  })
})
