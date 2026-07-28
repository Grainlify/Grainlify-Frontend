import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GithubIcon } from './GithubIcon'

describe('GithubIcon Component', () => {
  it('renders an svg with the GitHub brand path', () => {
    const { container } = render(<GithubIcon />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(container.querySelector('path')).toBeInTheDocument()
  })

  it('applies the given className for lucide-style sizing', () => {
    const { container } = render(<GithubIcon className="w-6 h-6" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toBe('w-6 h-6')
  })
})
