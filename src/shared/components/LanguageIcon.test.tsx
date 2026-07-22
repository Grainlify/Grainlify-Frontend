import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LanguageIcon } from './LanguageIcon'

describe('LanguageIcon Component', () => {
  it('renders a known language correctly (e.g., TypeScript)', () => {
    const { container } = render(<LanguageIcon language="TypeScript" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('fill')).toBe('#3178C6')
    const title = container.querySelector('title')
    expect(title).toHaveTextContent('TypeScript')
  })

  it('renders a known language case-insensitively (e.g., javascript vs JavaScript)', () => {
    const { container: container1 } = render(<LanguageIcon language="javascript" />)
    const svg1 = container1.querySelector('svg')
    expect(svg1).toBeInTheDocument()
    expect(svg1?.getAttribute('fill')).toBe('#F7DF1E')

    const { container: container2 } = render(<LanguageIcon language="JavaScript" />)
    const svg2 = container2.querySelector('svg')
    expect(svg2).toBeInTheDocument()
    expect(svg2?.getAttribute('fill')).toBe('#F7DF1E')

    // Testing 'JS' edge case - it should fallback since it's not mapped
    const { container: container3 } = render(<LanguageIcon language="JS" />)
    const fallback = container3.querySelector('div[role="img"]')
    expect(fallback).toBeInTheDocument()
    expect(fallback?.getAttribute('aria-label')).toBe('JS')
  })

  it('renders special case language (CSS)', () => {
    const { container } = render(<LanguageIcon language="css" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('fill')).toBe('#1572B6')
    const title = container.querySelector('title')
    expect(title).toHaveTextContent('CSS')
  })

  it('renders special case language (Batchfile)', () => {
    // This was supported by one version but not the other
    const { container } = render(<LanguageIcon language="Batchfile" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('fill')).toBe('#0078D4')
    const title = container.querySelector('title')
    expect(title).toHaveTextContent('Batchfile')
  })

  it('renders fallback for unknown/unmapped language code', () => {
    const { container } = render(<LanguageIcon language="UnknownLang123" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeInTheDocument()

    const fallback = container.querySelector('div[role="img"]')
    expect(fallback).toBeInTheDocument()
    expect(fallback?.getAttribute('aria-label')).toBe('UnknownLang123')
    expect(fallback?.className).toContain('bg-[#9b8b7a]')
  })

  it('matches snapshot for a full render of common languages', () => {
    const { container } = render(
      <div>
        <LanguageIcon language="TypeScript" />
        <LanguageIcon language="Python" />
        <LanguageIcon language="Ruby" />
        <LanguageIcon language="UnknownFallback" />
      </div>
    )
    expect(container).toMatchSnapshot()
  })
})
