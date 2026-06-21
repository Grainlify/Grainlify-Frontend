import { useTheme } from '../../../shared/contexts/ThemeContext';
import { BlogPost } from '../types';
import { BlogPostCard } from './BlogPostCard';

interface RecentPostsGridProps {
  /** Posts to display. Renders an empty-state message when the array is empty. */
  posts: BlogPost[];
}

export function RecentPostsGrid({ posts }: RecentPostsGridProps) {
  const { theme } = useTheme();

  return (
    <div>
      <h3 className={`text-[28px] font-bold mb-6 transition-colors ${
        theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
      }`}>Recent Articles</h3>

      {posts.length === 0 ? (
        <p className={`text-center py-12 text-sm opacity-70 transition-colors ${
          theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#6b5d4d]'
        }`}>
          No recent articles available.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
