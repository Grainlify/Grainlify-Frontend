import { useState, useEffect, useCallback } from 'react'
import { BlogPost } from '../types'
import { getBlogPosts } from '../../../shared/api/client'
import { BlogHero } from '../components/BlogHero'
import { FeaturedPost } from '../components/FeaturedPost'
import { BlogArticle } from '../components/BlogArticle'
import { RecentPostsGrid } from '../components/RecentPostsGrid'
import { BlogStyles } from '../components/BlogStyles'
import { featuredPost as mockFeaturedPost, recentPosts as mockRecentPosts } from '../data/blogPosts'
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ok'; featured: BlogPost; recent: BlogPost[] }

export function BlogPage() {
  const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'
  const [state, setState] = useState<State>(
    useMock
      ? { status: 'ok', featured: mockFeaturedPost, recent: mockRecentPosts }
      : { status: 'loading' }
  )

  const fetchPosts = useCallback(() => {
    if (useMock) return
    setState({ status: 'loading' })
    getBlogPosts()
      .then((posts) => {
        if (!posts || posts.length === 0) {
          setState({ status: 'empty' })
        } else {
          setState({ status: 'ok', featured: posts[0], recent: posts.slice(1) })
        }
      })
      .catch(() => {
        setState({ status: 'error' })
      })
  }, [useMock])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  /**
   * Loading state view.
   * Renders layout-matching themed skeleton loader placeholders for both the
   * featured post and the recent articles grid.
   * Announced to screen readers/assistive technologies using `role="status"` and `aria-busy="true"`.
   */
  if (state.status === 'loading') {
    return (
      <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading blog posts">
        {/* Featured Post Skeleton Placeholder */}
        <div className="backdrop-blur-[40px] bg-gradient-to-br from-white/[0.18] to-white/[0.12] rounded-[28px] border border-white/25 p-10">
          <div className="flex flex-col lg:flex-row items-start gap-8">
            <SkeletonLoader className="flex-shrink-0 rounded-[24px]" width="128px" height="128px" />
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center gap-3">
                <SkeletonLoader
                  variant="default"
                  width="80px"
                  height="24px"
                  className="rounded-[10px]"
                />
                <SkeletonLoader variant="text" width="100px" height="16px" />
                <SkeletonLoader variant="text" width="80px" height="16px" />
              </div>
              <SkeletonLoader variant="text" width="60%" height="32px" className="rounded-[8px]" />
              <div className="space-y-2">
                <SkeletonLoader variant="text" width="100%" height="16px" />
                <SkeletonLoader variant="text" width="90%" height="16px" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <SkeletonLoader variant="text" width="120px" height="16px" />
                <SkeletonLoader
                  variant="default"
                  width="140px"
                  height="44px"
                  className="rounded-[14px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Articles Grid Skeleton Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="backdrop-blur-[30px] bg-white/[0.15] rounded-[20px] border border-white/25 p-6 space-y-4"
            >
              <SkeletonLoader className="rounded-[16px]" width="64px" height="64px" />
              <SkeletonLoader
                variant="default"
                width="70px"
                height="22px"
                className="rounded-[8px]"
              />
              <SkeletonLoader variant="text" width="90%" height="20px" className="rounded-[6px]" />
              <div className="space-y-2">
                <SkeletonLoader variant="text" width="100%" height="14px" />
                <SkeletonLoader variant="text" width="80%" height="14px" />
              </div>
              <div className="flex items-center gap-3 pt-2 pb-4 border-b border-white/10">
                <SkeletonLoader variant="text" width="60px" height="12px" />
                <SkeletonLoader variant="text" width="60px" height="12px" />
              </div>
              <SkeletonLoader variant="text" width="80px" height="14px" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 space-y-4 text-center"
        role="alert"
      >
        <p className="text-lg font-semibold">Unable to load blog posts.</p>
        <p className="text-sm opacity-70">Something went wrong. Please try again.</p>
        <button
          onClick={fetchPosts}
          className="px-6 py-2 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    )
  }

  if (state.status === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-2 text-center">
        <p className="text-lg font-semibold">No blog posts yet.</p>
        <p className="text-sm opacity-70">Check back soon for new articles.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <BlogHero />
      <FeaturedPost post={state.featured} />
      <BlogArticle />
      <RecentPostsGrid posts={state.recent} />
      <BlogStyles />
    </div>
  )
}
