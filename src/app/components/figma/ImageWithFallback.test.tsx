import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageWithFallback, FALLBACK_IMAGE } from './ImageWithFallback'
import React from 'react'

describe('ImageWithFallback (Figma)', () => {
  it('renders the normal image with correct src and alt', () => {
    render(<ImageWithFallback src="https://example.com/normal.png" alt="My Image" />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/normal.png')
    expect(img).toHaveAttribute('alt', 'My Image')
  })

  it('uses default alt text when alt prop is missing', () => {
    render(<ImageWithFallback src="https://example.com/normal.png" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Image')
  })

  it('applies loading="lazy" by default or when specified', () => {
    // Default lazy
    const { rerender } = render(<ImageWithFallback src="https://example.com/normal.png" />)
    let img = screen.getByRole('img')
    expect(img).toHaveAttribute('loading', 'lazy')

    // Eager override
    rerender(<ImageWithFallback src="https://example.com/normal.png" loading="eager" />)
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('loading', 'eager')
  })

  it('triggers onLoad callback when the image loads successfully', () => {
    const handleLoad = vi.fn()
    render(<ImageWithFallback src="https://example.com/normal.png" onLoad={handleLoad} />)
    const img = screen.getByRole('img')
    
    fireEvent.load(img)
    expect(handleLoad).toHaveBeenCalledTimes(1)
  })

  it('handles automatic retry on first error and falls back on second error', () => {
    render(<ImageWithFallback src="https://example.com/broken.png" alt="Broken image" />)
    
    // First, it renders the normal image
    let img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/broken.png')

    // Trigger first error (retry 1)
    fireEvent.error(img)

    // It should still render the image but with the query parameter appended to trigger a new request
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/broken.png?retry=1')

    // Trigger second error (fallback)
    fireEvent.error(img)

    // Now it should render the fallback image
    const fallbackImg = screen.getByRole('img')
    expect(fallbackImg).toHaveAttribute('src', FALLBACK_IMAGE)
    expect(fallbackImg).toHaveAttribute('aria-label', 'Error loading image')
    expect(fallbackImg).toHaveAttribute('alt', 'Broken image')
    expect(fallbackImg).not.toHaveAttribute('data-original-url')
  })

  it('does not render the src of the image as visible text in the fallback', () => {
    const { container } = render(<ImageWithFallback src="https://example.com/very-secure-url.png" alt="Secure" />)
    
    // Trigger 2 errors to go to fallback
    let img = screen.getByRole('img')
    fireEvent.error(img)
    img = screen.getByRole('img')
    fireEvent.error(img)

    // The container should not contain the src string as visible text
    expect(container.textContent).not.toContain('https://example.com/very-secure-url.png')
  })

  it('resets states on src change', () => {
    const { rerender } = render(<ImageWithFallback src="https://example.com/broken.png" />)
    
    // Trigger first error
    let img = screen.getByRole('img')
    fireEvent.error(img)

    // Trigger second error to show fallback
    img = screen.getByRole('img')
    fireEvent.error(img)
    
    // Fallback is displayed
    const fallbackImg = screen.getByRole('img')
    expect(fallbackImg).toHaveAttribute('src', FALLBACK_IMAGE)

    // Change the src prop to a new URL
    rerender(<ImageWithFallback src="https://example.com/new-image.png" />)

    // It should reset the error state and show the normal image again
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/new-image.png')
  })

  it('handles load event when onLoad is not provided', () => {
    render(<ImageWithFallback src="https://example.com/normal.png" />)
    const img = screen.getByRole('img')
    // Triggering load shouldn't crash or throw
    expect(() => fireEvent.load(img)).not.toThrow()
  })

  it('renders fallback without crashing when className is not provided', () => {
    render(<ImageWithFallback src="https://example.com/broken.png" />)
    let img = screen.getByRole('img')
    fireEvent.error(img)
    img = screen.getByRole('img')
    fireEvent.error(img)
    
    const fallbackImg = screen.getByRole('img')
    expect(fallbackImg).toHaveAttribute('src', FALLBACK_IMAGE)
  })

  it('handles empty or missing src prop', () => {
    render(<ImageWithFallback src="" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '')
  })

  it('handles retry on image with existing query parameters', () => {
    render(<ImageWithFallback src="https://example.com/broken.png?v=2" />)
    let img = screen.getByRole('img')
    fireEvent.error(img)
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/broken.png?v=2&retry=1')
  })

  it('does not append retry query parameter for data URLs', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    render(<ImageWithFallback src={dataUrl} />)
    let img = screen.getByRole('img')
    fireEvent.error(img)
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', dataUrl)
  })
})

