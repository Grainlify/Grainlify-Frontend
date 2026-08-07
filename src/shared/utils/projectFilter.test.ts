import { describe, it, expect } from 'vitest'
import { getRepoName, isValidProject } from './projectFilter'

describe('getRepoName', () => {
  it('extracts the repo portion from an "owner/repo" string', () => {
    expect(getRepoName('facebook/react')).toBe('react')
  })

  it('returns just the second segment when there are extra slashes', () => {
    expect(getRepoName('owner/repo/extra')).toBe('repo')
  })

  it('falls back to the original string when there is no "/" separator', () => {
    expect(getRepoName('no-slash-here')).toBe('no-slash-here')
  })

  it('falls back to the original (empty) string for an empty input', () => {
    expect(getRepoName('')).toBe('')
  })
})

describe('isValidProject', () => {
  it('rejects a project missing an id', () => {
    expect(isValidProject({ github_full_name: 'facebook/react' })).toBe(false)
  })

  it('rejects a project missing github_full_name', () => {
    expect(isValidProject({ id: '1' })).toBe(false)
  })

  it('rejects null/undefined project values', () => {
    expect(isValidProject(null)).toBe(false)
    expect(isValidProject(undefined)).toBe(false)
  })

  it('excludes a ".github" special repo regardless of the owner', () => {
    expect(isValidProject({ id: '1', github_full_name: 'someorg/.github' })).toBe(false)
    expect(isValidProject({ id: '2', github_full_name: 'facebook/.github' })).toBe(false)
  })

  it('does not exclude repos that merely contain ".github" as a substring', () => {
    // Confirms the rule is an exact match on the repo segment, not a substring test.
    expect(isValidProject({ id: '3', github_full_name: 'octocat/my.github.io' })).toBe(true)
    expect(isValidProject({ id: '4', github_full_name: 'octocat/dot-github-archive' })).toBe(
      true
    )
  })

  it('accepts a normal valid project', () => {
    expect(isValidProject({ id: '5', github_full_name: 'facebook/react' })).toBe(true)
  })
})
