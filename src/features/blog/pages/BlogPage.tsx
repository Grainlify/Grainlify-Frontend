import { useState, useEffect } from "react";
import { BlogPost } from "../types";
import { getBlogPosts } from "../../shared/api/client";

export function BlogPage() {
  const useMock = import.meta.env.VITE_USE_MOCK_DATA === "true";
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(!useMock);

  useEffect(() => {
    if (!useMock) {
      setLoading(true);
      getBlogPosts()
        .then((posts) => {
          if (posts.length > 0) {
            setFeaturedPost(posts[0]);
            setRecentPosts(posts.slice(1));
          }
        })
        .catch((err) => console.error("Failed to fetch blog posts:", err))
        .finally(() => setLoading(false));
    } else {
      // Use static imports as fallback
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { featuredPost, recentPosts } = require('../data/blogPosts');
      setFeaturedPost(featuredPost);
      setRecentPosts(recentPosts);
    }
  }, [useMock]);

  if (loading || !featuredPost) {
    return <div className="space-y-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Hero Section */}
      <BlogHero />

      {/* Featured Article */}
      <FeaturedPost post={featuredPost} />

      {/* Main Content Article - About OnlyGrain */}
      <BlogArticle />

      {/* Recent Posts Grid */}
      <RecentPostsGrid posts={recentPosts} />

      {/* CSS Animations */}
      <BlogStyles />
    </div>
  );
}
