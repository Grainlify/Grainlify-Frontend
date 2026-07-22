// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { BlogArticle } from './BlogArticle'
import { renderWithTheme } from '../../../test/renderWithTheme'

describe('BlogArticle markdown sanitization', () => {
  it('neutralizes raw script tags in post body', () => {
    const maliciousContent = '# Hello\n<script>alert("xss")</script>'
    const { container } = renderWithTheme(<BlogArticle content={maliciousContent} />)

    // The script tag should be stripped from the DOM.
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('neutralizes event-handler attributes like onerror in image tags', () => {
    const maliciousContent =
      '![Alt text](invalid-image.jpg "Title" onerror="alert(1)")\n\n<img src="invalid.jpg" onerror="alert(2)" />'
    const { container } = renderWithTheme(<BlogArticle content={maliciousContent} />)

    const images = container.querySelectorAll('img')
    // Normal markdown images do not get onerror injected by rehype-sanitize
    // Raw img tags get onerror stripped
    images.forEach((img) => {
      expect(img.hasAttribute('onerror')).toBe(false)
    })
  })

  it('neutralizes javascript: URLs in markdown links', () => {
    const maliciousContent = '[Click me](javascript:alert("xss"))'
    const { container } = renderWithTheme(<BlogArticle content={maliciousContent} />)

    const links = container.querySelectorAll('a')
    links.forEach((link) => {
      expect(link.getAttribute('href') || '').not.toMatch(/^javascript:/i)
    })
  })

  it('correctly renders safe deeply nested formatting', () => {
    const complexContent =
      '***[**Bold italic link**](https://example.com)*** and `inline code` within a paragraph.'
    renderWithTheme(<BlogArticle content={complexContent} />)

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://example.com')
    // We expect the formatting to be preserved:
    expect(link.querySelector('strong')).toBeInTheDocument()
    expect(screen.getByText('inline code')).toBeInTheDocument()
    expect(screen.getByText('inline code').tagName.toLowerCase()).toBe('code')
  })

  it('renders safe markdown constructs properly (links, images, code blocks)', () => {
    const safeContent = `
# Heading 1
## Heading 2

[Safe Link](https://safe.com)

![Safe Image](https://safe.com/image.png)

\`\`\`javascript
const x = 1;
\`\`\`
    `
    const { container } = renderWithTheme(<BlogArticle content={safeContent} />)

    expect(screen.getByText('Heading 1').tagName.toLowerCase()).toBe('h1')
    expect(screen.getByText('Heading 2').tagName.toLowerCase()).toBe('h2')

    const link = screen.getByRole('link', { name: 'Safe Link' })
    expect(link).toHaveAttribute('href', 'https://safe.com')

    const img = screen.getByAltText('Safe Image')
    expect(img).toHaveAttribute('src', 'https://safe.com/image.png')

    // Pre/code block
    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre?.textContent).toContain('const x = 1;')
  })
})
