import { describe, it, expect } from 'vitest'
import { allBlogPosts } from './blogPosts'
import { blogPostSchema } from '../types'

describe('blogPosts data validation', () => {
  it('each post should conform to the BlogPost schema (required fields and valid URL-safe slug)', () => {
    allBlogPosts.forEach((post) => {
      const result = blogPostSchema.safeParse(post)
      expect(
        result.success,
        `Post ID ${post.id} failed schema validation: ${result.success ? '' : result.error.message}`
      ).toBe(true)
    })
  })

  it('each post should have a unique slug', () => {
    const slugs = allBlogPosts.map((post) => post.slug)
    const uniqueSlugs = new Set(slugs)
    expect(slugs.length, 'There are duplicate slugs in the blog posts data').toBe(uniqueSlugs.size)
  })
})
