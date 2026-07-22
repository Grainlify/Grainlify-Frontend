import { describe, expect, it } from 'vitest'

import { allBlogPosts } from '../data/blogPosts'
import { sanitizeSlug } from './slug'

const URL_PATH_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function expectSafeResult(input: string | undefined, expected: string | null) {
  const result = sanitizeSlug(input)

  expect(result).toBe(expected)
  expect(sanitizeSlug(input)).toBe(result)

  if (result !== null) {
    expect(result).toMatch(URL_PATH_SEGMENT_PATTERN)
    expect(encodeURIComponent(result)).toBe(result)
    expect(result).not.toContain('../')
  }
}

describe('sanitizeSlug', () => {
  it.each([
    ['Cross-Chain-Collaboration', 'cross-chain-collaboration'],
    ['  future-of-dev  ', 'future-of-dev'],
    ['post123', 'post123'],
  ])('normalizes the safe slug %j', (input, expected) => {
    expectSafeResult(input, expected)
  })

  it.each([
    ['accented Latin characters', 'café-consensus'],
    ['non-Latin characters', '跨链-collaboration'],
    ['emoji', 'web3-🚀'],
    ['slashes', 'a/b'],
    ['markup', '<script>'],
    ['single spaces', 'has space'],
    ['consecutive spaces', 'cross  chain'],
    ['tabs', 'cross\tchain'],
    ['leading hyphens', '-leading'],
    ['trailing hyphens', 'trailing-'],
    ['consecutive hyphens', 'cross--chain'],
    ['underscores', 'under_score'],
    ['leading punctuation', '.future-of-web3'],
    ['trailing punctuation', 'future-of-web3!'],
    ['punctuation only', '...!!!'],
    ['Unicode punctuation only', '———'],
  ])('rejects title-like input containing $0', (_caseName, input) => {
    expectSafeResult(input, null)
  })

  it.each([undefined, '', '   '])('returns null for empty input %j', (input) => {
    expectSafeResult(input, null)
  })

  it.each(['../etc/passwd', 'safe/../admin', '..%2Fetc%2Fpasswd', '%2e%2e%2fsecret'])(
    'rejects the path-traversal input %j',
    (input) => {
      expectSafeResult(input, null)
    }
  )

  it.each(allBlogPosts)('accepts the checked-in slug for "$title"', (post) => {
    expectSafeResult(post.slug, post.slug)
  })
})
