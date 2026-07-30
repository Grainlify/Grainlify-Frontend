import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { FeaturedPost } from './FeaturedPost'

const post = {
  id: 1,
  slug: 'featured-story',
  title: 'Featured Story',
  excerpt: 'A featured article.',
  date: 'June 20, 2026',
  readTime: '5 min read',
  image: '✨',
}

describe('FeaturedPost', () => {
  it('links Read Full Story to the featured article route', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <FeaturedPost post={post} />
        </MemoryRouter>
      </ThemeProvider>
    )

    expect(screen.getByRole('link', { name: /read full story/i })).toHaveAttribute(
      'href',
      '/dashboard/blog/featured-story'
    )
  })
})
