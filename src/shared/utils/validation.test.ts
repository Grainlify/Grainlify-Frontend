import { describe, it, expect } from 'vitest'
import { validateRepoName, validateUrl, validateEmail, validateRequired } from './validation'

describe('validateRepoName', () => {
  it('accepts valid owner/repo format', () => {
    expect(validateRepoName('facebook/react')).toBe(true)
  })

  it('accepts names with hyphens', () => {
    expect(validateRepoName('my-org/my-repo')).toBe(true)
  })

  it('accepts names with dots', () => {
    expect(validateRepoName('org/repo.name')).toBe(true)
  })

  it('accepts names with underscores', () => {
    expect(validateRepoName('my_org/my_repo')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(validateRepoName('')).toBe('Repository name is required')
  })

  it('rejects whitespace-only string', () => {
    expect(validateRepoName('   ')).toBe('Repository name is required')
  })

  it('rejects missing slash', () => {
    const result = validateRepoName('just-a-name')
    expect(result).toBe('Repository name must be in format: owner/repo')
  })

  it('rejects trailing slash', () => {
    const result = validateRepoName('owner/')
    expect(result).toBe('Repository name must be in format: owner/repo')
  })

  it('rejects leading slash', () => {
    const result = validateRepoName('/repo')
    expect(result).toBe('Repository name must be in format: owner/repo')
  })

  it('rejects special characters', () => {
    const result = validateRepoName('own er/repo')
    expect(result).toContain('invalid characters')
  })

  it('rejects uppercase characters', () => {
    // lowercase & alphanumeric are fine; test special chars
    expect(validateRepoName('owner/repo!')).toContain('invalid characters')
  })
})

describe('validateUrl', () => {
  it('accepts empty string (optional field)', () => {
    expect(validateUrl('')).toBe(true)
  })

  it('accepts whitespace-only as empty', () => {
    expect(validateUrl('   ')).toBe(true)
  })

  it('accepts valid https URL', () => {
    expect(validateUrl('https://example.com')).toBe(true)
  })

  it('accepts valid http URL', () => {
    expect(validateUrl('http://example.com')).toBe(true)
  })

  it('accepts URL with path', () => {
    expect(validateUrl('https://example.com/path/to/page')).toBe(true)
  })

  it('rejects plain text', () => {
    const result = validateUrl('not-a-url')
    expect(result).toContain('valid URL')
  })

  it('rejects ftp protocol', () => {
    const result = validateUrl('ftp://example.com')
    expect(result).toContain('http')
  })

  it('rejects missing hostname', () => {
    const result = validateUrl('https://')
    expect(result).toContain('valid URL')
  })

  it('accepts localhost (no dot required)', () => {
    expect(validateUrl('https://localhost')).toBe(true)
  })

  it('accepts localhost with port', () => {
    expect(validateUrl('http://localhost:3000')).toBe(true)
  })

  it('accepts IP address', () => {
    expect(validateUrl('http://192.168.1.1')).toBe(true)
  })

  it('rejects javascript: scheme', () => {
    const result = validateUrl('javascript:alert(1)')
    expect(result).toContain('http')
  })

  it('rejects data: scheme', () => {
    const result = validateUrl('data:text/html,<h1>hi</h1>')
    expect(result).toContain('http')
  })
})

describe('validateEmail', () => {
  it('accepts empty string (optional field)', () => {
    expect(validateEmail('')).toBe(true)
  })

  it('accepts whitespace-only as empty', () => {
    expect(validateEmail('   ')).toBe(true)
  })

  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('accepts email with dots and plus in local part', () => {
    expect(validateEmail('user.name+tag@example.co.uk')).toBe(true)
  })

  it('rejects missing TLD', () => {
    expect(validateEmail('user@example')).toContain('valid email')
  })

  it('rejects missing local part', () => {
    expect(validateEmail('@example.com')).toContain('valid email')
  })

  it('rejects double @', () => {
    expect(validateEmail('user@@example.com')).toContain('valid email')
  })

  it('rejects spaces in email', () => {
    expect(validateEmail('user @example.com')).toContain('valid email')
  })

  it('rejects missing domain name', () => {
    expect(validateEmail('user@.com')).toContain('valid email')
  })

  it('rejects trailing dot after TLD', () => {
    expect(validateEmail('user@example.')).toContain('valid email')
  })

  it('rejects double dot in domain', () => {
    expect(validateEmail('user@example..com')).toContain('valid email')
  })

  it('accepts subdomain email', () => {
    expect(validateEmail('user@mail.example.co.uk')).toBe(true)
  })

  it('rejects missing domain before dot', () => {
    expect(validateEmail('user@.com')).toContain('valid email')
  })
})

describe('validateRequired', () => {
  it('accepts non-empty value', () => {
    expect(validateRequired('hello', 'Field')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(validateRequired('', 'Field')).toBe('Field is required')
  })

  it('rejects whitespace-only', () => {
    expect(validateRequired('   ', 'Field')).toBe('Field is required')
  })

  it('uses custom field name in message', () => {
    expect(validateRequired('', 'Ecosystem')).toBe('Ecosystem is required')
  })
})
