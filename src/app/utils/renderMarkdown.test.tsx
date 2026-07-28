import { render } from '@testing-library/react'
import RenderMarkdownContent from './renderMarkdown'

describe('RenderMarkdownContent sanitization', () => {
  it('strips a javascript: protocol href', () => {
    const { container } = render(
      <RenderMarkdownContent content={'[click me](javascript:alert(1))'} />
    )
    const link = container.querySelector('a')
    // rehype-sanitize's protocols.href allowlist (http/https/mailto) rejects
    // javascript: entirely - the href attribute itself is dropped.
    const href = link?.getAttribute('href') ?? null
    expect(href).toBeNull()
  })

  it('does not render a data: protocol image src', () => {
    const { container } = render(
      <RenderMarkdownContent content={'![alt](data:image/png;base64,AAAA)'} />
    )
    const img = container.querySelector('img')
    // Only http/https are allowlisted for src - data: is dropped entirely.
    const src = img?.getAttribute('src') ?? null
    expect(src).toBeNull()
  })

  it('never turns raw <script>/onerror HTML embedded in markdown into a live element or attribute', () => {
    const { container } = render(
      <RenderMarkdownContent content={'<img src=x onerror="window.__pwned3 = true">'} />
    )
    // react-markdown has no rehype-raw plugin wired in, so raw HTML is never
    // parsed into real DOM nodes in the first place - rehype-sanitize is a
    // second, redundant layer of defense on top of that. Either way, no
    // onerror handler must ever end up live in the DOM.
    const img = container.querySelector('img')
    expect(img?.getAttribute('onerror') ?? null).toBeNull()
    expect((window as unknown as Record<string, unknown>).__pwned3).toBeUndefined()
  })

  it('never renders a raw <script> tag embedded in markdown as an executable element', () => {
    const { container } = render(
      <RenderMarkdownContent content={'<script>window.__scriptRan = true</script>'} />
    )
    expect(container.querySelector('script')).toBeNull()
    expect((window as unknown as Record<string, unknown>).__scriptRan).toBeUndefined()
  })

  it('renders a legitimate https link with its href intact', () => {
    const { getByRole } = render(
      <RenderMarkdownContent content={'[Grainlify](https://grainlify.dev)'} />
    )
    const link = getByRole('link', { name: 'Grainlify' })
    expect(link).toHaveAttribute('href', 'https://grainlify.dev')
  })

  it('renders a legitimate mailto link with its href intact', () => {
    const { getByRole } = render(
      <RenderMarkdownContent content={'[Email us](mailto:team@grainlify.dev)'} />
    )
    const link = getByRole('link', { name: 'Email us' })
    expect(link).toHaveAttribute('href', 'mailto:team@grainlify.dev')
  })

  it('renders the custom h2/p component overrides for basic markdown', () => {
    const { container } = render(<RenderMarkdownContent content={'## Heading\n\nA paragraph.'} />)
    expect(container.querySelector('h2')).toHaveTextContent('Heading')
    expect(container.querySelector('p')).toHaveTextContent('A paragraph.')
  })

  it('renders nothing for an empty content string without throwing', () => {
    expect(() => render(<RenderMarkdownContent content="" />)).not.toThrow()
  })
})
