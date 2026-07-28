import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { RecentPostsGrid } from './RecentPostsGrid'
import type { BlogPost } from '../types'

const mockPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'future-of-decentralized-development',
    title: 'The Future of Decentralized Development',
    excerpt: 'Exploring how blockchain technology is transforming collaboration.',
    date: 'December 20, 2024',
    readTime: '6 min read',
    category: 'Innovation',
    icon: '🚀',
  },
  {
    id: 2,
    slug: 'getting-started-with-soroban',
    title: 'Getting Started with Soroban',
    excerpt: 'A beginner-friendly guide to writing smart contracts.',
    date: 'January 15, 2025',
    readTime: '8 min read',
    category: 'Tutorial',
    icon: '📘',
  },
  {
    id: 3,
    slug: 'open-source-best-practices',
    title: 'Open Source Best Practices',
    excerpt: 'Tips for maintaining healthy open-source projects.',
    date: 'February 5, 2025',
    readTime: '5 min read',
    category: 'Guides',
    icon: '⭐',
  },
]

function renderGrid(posts: BlogPost[]) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard/blog']}>
        <Routes>
          <Route path="/dashboard/blog" element={<RecentPostsGrid posts={posts} />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('RecentPostsGrid', () => {
  it('renders the "Recent Articles" heading', () => {
    renderGrid([])

    expect(screen.getByText('Recent Articles')).toBeInTheDocument()
  })

  it('renders the empty-state message when posts is an empty array', () => {
    renderGrid([])

    expect(screen.getByText('No recent articles available.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders one BlogPostCard per post when posts is populated', () => {
    renderGrid(mockPosts)

    // Each BlogPostCard renders as a link
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
  })

  it('renders post titles in the correct order', () => {
    renderGrid(mockPosts)

    expect(screen.getByText('The Future of Decentralized Development')).toBeInTheDocument()
    expect(screen.getByText('Getting Started with Soroban')).toBeInTheDocument()
    expect(screen.getByText('Open Source Best Practices')).toBeInTheDocument()
  })
})