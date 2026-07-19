import { describe, expect, it } from 'vitest'
import { addRepositorySchema } from './addRepositorySchema'

const formatMessage = 'Repository name must be in format: owner/repo'
const invalidRepositoryMessage =
  'Repository name contains invalid characters. Use owner/repo format with letters, numbers, hyphens, underscores, and dots.'

const validForm = (githubFullName: string) => ({
  githubFullName,
  ecosystemName: 'Ethereum',
  language: '',
  tags: '',
  category: '',
})

describe('addRepositorySchema', () => {
  it.each([
    ['owner/repository', 'owner/repository'],
    ['grainlify/frontend_ui.v2', 'grainlify/frontend_ui.v2'],
    ['https://github.com/owner/repository', 'owner/repository'],
  ])('accepts %s and normalizes it to %s', (input, expected) => {
    const result = addRepositorySchema.safeParse(validForm(input))

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.githubFullName).toBe(expected)
    }
  })

  it.each([
    ['', 'Repository name is required'],
    ['/repository', formatMessage],
    ['owner/', formatMessage],
    ['owner/repository/', formatMessage],
    ['https://github.com/owner/repository/', formatMessage],
    ['https://gitlab.com/owner/repository', invalidRepositoryMessage],
    [' owner/repository', invalidRepositoryMessage],
    ['owner/repository ', invalidRepositoryMessage],
  ])('rejects %j with the expected message', (input, expectedMessage) => {
    const result = addRepositorySchema.safeParse(validForm(input))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(expectedMessage)
    }
  })

  it('rejects repository names longer than 140 characters after URL normalization', () => {
    const result = addRepositorySchema.safeParse(validForm(`owner/${'r'.repeat(135)}`))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Repository name must be 140 characters or less')
    }
  })
})
