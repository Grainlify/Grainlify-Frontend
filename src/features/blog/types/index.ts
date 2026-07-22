import { z } from 'zod'

export const blogPostSchema = z.object({
  id: z.number(),
  /**
   * URL-safe identifier used for deep-linking to an individual article at
   * `/dashboard/blog/:slug`. Must be unique across posts and contain only
   * lowercase alphanumerics separated by single hyphens (e.g.
   * `future-of-decentralized-development`). Treated as untrusted when it
   * arrives from the URL and is validated/looked up against the known post
   * set before use.
   */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  readTime: z.string().min(1, 'Read time is required'),
  author: z.string().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  isFeatured: z.boolean().optional(),
})

export type BlogPost = z.infer<typeof blogPostSchema>

export interface BlogStatistic {
  icon: React.ReactNode
  value: string
  label: string
}

export interface BlogFeature {
  number: number
  title: string
  description: string
}

export interface BlogWhyChooseCard {
  icon: React.ReactNode
  title: string
  description: string
}
