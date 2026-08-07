import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BlogPage } from './BlogPage'
import { featuredPost, recentPosts } from '../data/blogPosts'

// BlogPage takes no props and fetches nothing - it is a fully static composition of
// BlogHero, FeaturedPost, BlogArticle, RecentPostsGrid, and BlogStyles, all driven
// by hardcoded content (BlogHero/BlogArticle's own copy) or the static
// featuredPost/recentPosts data imported from ../data/blogPosts (confirmed by
// reading BlogPage.tsx and its child components in full - none of them import
// anything from shared/api/client or useAuth).
describe('BlogPage', () => {
  it('renders the real static hero and article content without crashing', () => {
    renderWithProviders(<BlogPage />)

    expect(screen.getByText('OnlyGrain Blog')).toBeInTheDocument()
    expect(
      screen.getByText('Insights, updates, and stories from the OnlyGrain ecosystem'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Welcome to OnlyGrain: The Future of Open Source Collaboration'),
    ).toBeInTheDocument()
    expect(screen.getByText('Recent Articles')).toBeInTheDocument()
  })

  it('renders the real featured post content from blogPosts data', () => {
    renderWithProviders(<BlogPage />)

    expect(screen.getByText('FEATURED')).toBeInTheDocument()
    expect(screen.getByText(featuredPost.title)).toBeInTheDocument()
    expect(screen.getByText(featuredPost.excerpt)).toBeInTheDocument()
    expect(screen.getByText(featuredPost.author as string)).toBeInTheDocument()
  })

  it('renders the real recent posts grid from blogPosts data', () => {
    renderWithProviders(<BlogPage />)

    expect(recentPosts.length).toBeGreaterThan(0)
    recentPosts.forEach((post) => {
      expect(screen.getByText(post.title)).toBeInTheDocument()
    })
  })

  it('renders in both light and dark theme without crashing', () => {
    const { unmount } = renderWithProviders(<BlogPage />, { theme: 'light' })
    expect(screen.getByText('OnlyGrain Blog')).toBeInTheDocument()
    unmount()

    renderWithProviders(<BlogPage />, { theme: 'dark' })
    expect(screen.getByText('OnlyGrain Blog')).toBeInTheDocument()
  })
})
