import { describe, expect, it } from 'vitest'
import {
  isValidRouteParam,
  validateEmail,
  validateRepoName,
  validateRequired,
  validateUrl,
} from './validation'

const repoNameRequiredMessage = 'Repository name is required'
const repoNameFormatMessage = 'Repository name must be in format: owner/repo'
const repoNameInvalidCharactersMessage =
  'Repository name contains invalid characters. Use owner/repo format with letters, numbers, hyphens, underscores, and dots.'
const invalidUrlMessage = 'Please enter a valid URL starting with http:// or https://'
const invalidUrlProtocolMessage = 'URL must start with http:// or https://'
const invalidEmailMessage = 'Please enter a valid email address'

describe('validateRepoName', () => {
  it.each([
    ['valid owner/repo format', 'facebook/react', true],
    ['hyphens', 'my-org/my-repo', true],
    ['dots', 'org/repo.name', true],
    ['underscores', 'my_org/my_repo', true],
    ['leading and trailing whitespace around a valid repo', '  facebook/react  ', true],
    ['empty string', '', repoNameRequiredMessage],
    ['whitespace-only string', '   ', repoNameRequiredMessage],
    ['missing slash', 'just-a-name', repoNameFormatMessage],
    ['trailing slash', 'owner/', repoNameFormatMessage],
    ['leading slash', '/repo', repoNameFormatMessage],
    ['space in owner', 'own er/repo', repoNameInvalidCharactersMessage],
    ['punctuation in repo', 'owner/repo!', repoNameInvalidCharactersMessage],
    ['unicode owner', 'mañana/repo', repoNameInvalidCharactersMessage],
    ['emoji repo', 'owner/repo🚀', repoNameInvalidCharactersMessage],
  ])('returns a stable result for %s', (_caseName, value, expected) => {
    expect(validateRepoName(value)).toBe(expected)
  })
})

describe('validateUrl', () => {
  const exactlyAtLimitHost = `${'a'.repeat(63)}.com`

  it.each([
    ['empty string optional value', '', true],
    ['whitespace-only optional value', '   ', true],
    ['https URL', 'https://example.com', true],
    ['http URL', 'http://example.com', true],
    ['URL with path', 'https://example.com/path/to/page', true],
    ['trimmed URL', '  https://example.com  ', true],
    ['localhost', 'https://localhost', true],
    ['localhost with port', 'http://localhost:3000', true],
    ['IP address', 'http://192.168.1.1', true],
    ['unicode hostname', 'https://例え.テスト', true],
    ['emoji path', 'https://example.com/🚀', true],
    ['63-character DNS label', `https://${exactlyAtLimitHost}`, true],
    ['plain text', 'not-a-url', invalidUrlMessage],
    ['missing hostname', 'https://', invalidUrlMessage],
    ['ftp protocol', 'ftp://example.com', invalidUrlProtocolMessage],
    ['javascript scheme', 'javascript:alert(1)', invalidUrlProtocolMessage],
    ['data scheme', 'data:text/html,<h1>hi</h1>', invalidUrlProtocolMessage],
  ])('returns a stable result for %s', (_caseName, value, expected) => {
    expect(validateUrl(value)).toBe(expected)
  })
})

describe('validateEmail', () => {
  const exactlyAtLimitLocalPart = 'a'.repeat(64)

  it.each([
    ['empty string optional value', '', true],
    ['whitespace-only optional value', '   ', true],
    ['valid email', 'user@example.com', true],
    ['trimmed valid email', '  user@example.com  ', true],
    ['dots and plus in local part', 'user.name+tag@example.co.uk', true],
    ['subdomain email', 'user@mail.example.co.uk', true],
    ['64-character local part', `${exactlyAtLimitLocalPart}@example.com`, true],
    ['unicode local part', 'mañana@example.com', true],
    ['unicode domain', 'user@例え.テスト', true],
    ['emoji local part', '🚀@example.com', true],
    ['missing TLD', 'user@example', invalidEmailMessage],
    ['missing local part', '@example.com', invalidEmailMessage],
    ['double @', 'user@@example.com', invalidEmailMessage],
    ['spaces in email', 'user @example.com', invalidEmailMessage],
    ['missing domain name', 'user@.com', invalidEmailMessage],
    ['trailing dot after TLD', 'user@example.', invalidEmailMessage],
    ['double dot in domain', 'user@example..com', invalidEmailMessage],
  ])('returns a stable result for %s', (_caseName, value, expected) => {
    expect(validateEmail(value)).toBe(expected)
  })
})

describe('isValidRouteParam', () => {
  const exactlyAtLimit = 'a'.repeat(100)
  const overLimit = 'a'.repeat(101)

  it.each([
    ['undefined', undefined, false],
    ['empty string', '', false],
    ['whitespace-only string', '   ', false],
    ['single character lower boundary', 'a', true],
    ['hyphenated alphanumeric slug', 'project-123', true],
    ['exactly 100 characters', exactlyAtLimit, true],
    ['over 100 characters', overLimit, false],
    ['unicode text', 'mañana', false],
    ['emoji input', 'project🚀', false],
    ['slash path segment', 'owner/repo', false],
    ['dot path segment', 'project.name', false],
  ])('returns a stable result for %s', (_caseName, value, expected) => {
    expect(isValidRouteParam(value)).toBe(expected)
  })
})

describe('validateRequired', () => {
  it.each([
    ['non-empty value', 'hello', 'Field', true],
    ['trimmed non-empty value', '  hello  ', 'Field', true],
    ['unicode value', 'mañana', 'Field', true],
    ['emoji value', '🚀', 'Field', true],
    ['exactly one character', 'a', 'Field', true],
    ['empty string', '', 'Field', 'Field is required'],
    ['whitespace-only', '   ', 'Field', 'Field is required'],
    ['custom field name', '', 'Ecosystem', 'Ecosystem is required'],
  ])('returns a stable result for %s', (_caseName, value, fieldName, expected) => {
    expect(validateRequired(value, fieldName)).toBe(expected)
  })
})
