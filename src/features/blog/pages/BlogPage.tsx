import { useState, useEffect, useCallback } from "react";
import { BlogPost } from "../types";
import { getBlogPosts } from "../../../shared/api/client";
import { BlogHero } from "../components/BlogHero";
import { FeaturedPost } from "../components/FeaturedPost";
import { BlogArticle } from "../components/BlogArticle";
import { RecentPostsGrid } from "../components/RecentPostsGrid";
import { BlogStyles } from "../components/BlogStyles";
import { featuredPost as mockFeaturedPost, recentPosts as mockRecentPosts } from "../data/blogPosts";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ok"; featured: BlogPost; recent: BlogPost[] };

export function BlogPage() {
  const useMock = import.meta.env.VITE_USE_MOCK_DATA === "true";
  const [state, setState] = useState<State>(
    useMock
      ? { status: "ok", featured: mockFeaturedPost, recent: mockRecentPosts }
      : { status: "loading" },
  );

  const fetchPosts = useCallback(() => {
    if (useMock) return;
    setState({ status: "loading" });
    getBlogPosts()
      .then((posts) => {
        if (!posts || posts.length === 0) {
          setState({ status: "empty" });
        } else {
          setState({ status: "ok", featured: posts[0], recent: posts.slice(1) });
        }
      })
      .catch(() => {
        setState({ status: "error" });
      });
  }, [useMock]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (state.status === "loading") {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading blog posts">
        {/* Featured post skeleton */}
        <div className="animate-pulse rounded-[28px] bg-white/10 h-48" />
        {/* Recent posts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-[20px] bg-white/10 h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center" role="alert">
        <p className="text-lg font-semibold">Unable to load blog posts.</p>
        <p className="text-sm opacity-70">Something went wrong. Please try again.</p>
        <button
          onClick={fetchPosts}
          className="px-6 py-2 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-2 text-center">
        <p className="text-lg font-semibold">No blog posts yet.</p>
        <p className="text-sm opacity-70">Check back soon for new articles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BlogHero />
      <FeaturedPost post={state.featured} />
      <BlogArticle />
      <RecentPostsGrid posts={state.recent} />
      <BlogStyles />
    </div>
  );
}
