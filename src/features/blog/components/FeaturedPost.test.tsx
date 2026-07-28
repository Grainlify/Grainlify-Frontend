// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { FeaturedPost } from './FeaturedPost'
import { renderWithTheme } from '../../../test/renderWithTheme'
import type { BlogPost } from '../types'

// ── Fixtures ──────────────────────────────────────────────
const fullPost: BlogPost = {
  id: 1,
  slug: 'test-post',
  title: 'Test Post Title',
  excerpt: 'This is a test excerpt for the featured post.',
  date: 'January 1, 2025',
  readTime: '5 min read',
  author: 'Test Author',
  image: '🚀',
  isFeatured: true,
}

const postWithoutAuthor: BlogPost = {
  id: 2,
  slug: 'no-author-post',
  title: 'Post Without Author',
  excerpt: 'This post has no author field.',
  date: 'January 2, 2025',
  readTime: '3 min read',
  image: '📝',
}

// ── Tests ─────────────────────────────────────────────────
describe('FeaturedPost', () => {
  describe('null/undefined fallback', () => {
    it('renders the empty state when post is null', () => {
      renderWithTheme(<FeaturedPost post={null} />)
      expect(
        screen.getByText('No featured post available.')
      ).toBeInTheDocument()
    })

    it('renders the empty state when post is undefined', () => {
      renderWithTheme(<FeaturedPost post={undefined} />)
      expect(
        screen.getByText('No featured post available.')
      ).toBeInTheDocument()
    })

    it('marks the empty state with the correct aria-label', () => {
      const { container } = renderWithTheme(<FeaturedPost post={null} />)
      const emptyDiv = container.querySelector('[aria-label="No featured post available"]')
      expect(emptyDiv).toBeInTheDocument()
    })
  })

  describe('full post rendering', () => {
    it('renders the title, excerpt, date, and read time', () => {
      renderWithTheme(<FeaturedPost post={fullPost} />)
      expect(screen.getByText('Test Post Title')).toBeInTheDocument()
      expect(screen.getByText('This is a test excerpt for the featured post.')).toBeInTheDocument()
      expect(screen.getByText('January 1, 2025')).toBeInTheDocument()
      expect(screen.getByText('5 min read')).toBeInTheDocument()
    })

    it('renders the image text', () => {
      renderWithTheme(<FeaturedPost post={fullPost} />)
      expect(screen.getByText('🚀')).toBeInTheDocument()
    })

    it('renders the author block when author is present', () => {
      renderWithTheme(<FeaturedPost post={fullPost} />)
      expect(screen.getByText('Test Author')).toBeInTheDocument()
    })

    it('renders the FEATURED badge', () => {
      renderWithTheme(<FeaturedPost post={fullPost} />)
      expect(screen.getByText('FEATURED')).toBeInTheDocument()
    })

    it('renders the Read Full Story button', () => {
      renderWithTheme(<FeaturedPost post={fullPost} />)
      expect(screen.getByText('Read Full Story')).toBeInTheDocument()
    })
  })

  describe('missing author branch', () => {
    it('renders without throwing when post has no author', () => {
      expect(() =>
        renderWithTheme(<FeaturedPost post={postWithoutAuthor} />)
      ).not.toThrow()
    })

    it('does not render an author block when author is omitted', () => {
      renderWithTheme(<FeaturedPost post={postWithoutAuthor} />)
      expect(screen.queryByText('Test Author')).not.toBeInTheDocument()
    })

    it('still renders the title and excerpt when author is missing', () => {
      renderWithTheme(<FeaturedPost post={postWithoutAuthor} />)
      expect(screen.getByText('Post Without Author')).toBeInTheDocument()
      expect(screen.getByText('This post has no author field.')).toBeInTheDocument()
    })
  })
})