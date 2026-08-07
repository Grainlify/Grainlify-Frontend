import { describe, it, expect } from 'vitest'
import { getUserFriendlyError } from './errorHandler'

describe('getUserFriendlyError', () => {
  it.each([
    {
      branch: 'network',
      error: new Error(
        'Network error: Unable to connect to the server. Please check your connection.'
      ),
      expected:
        'Unable to connect to the server. Please check your internet connection and try again.',
    },
    {
      branch: 'authentication',
      error: new Error('Authentication failed. Please sign in again.'),
      expected: 'Your session has expired. Please sign in again.',
    },
    {
      branch: 'server',
      error: new Error('Internal Server Error'),
      expected: 'Our servers are experiencing issues. Please try again in a few moments.',
    },
    {
      branch: 'not found',
      error: new Error('404 Not Found'),
      expected: 'The requested resource could not be found.',
    },
    {
      branch: 'timeout',
      error: new Error('Request timed out'),
      expected: 'The request took too long. Please try again.',
    },
    {
      branch: 'invalid response',
      error: new Error('Invalid response format from API'),
      expected: 'We received an unexpected response from the server. Please try again.',
    },
    {
      branch: 'generic API failure',
      error: new Error('API request failed with status 418'),
      expected: 'Unable to complete your request. Please try again.',
    },
    {
      branch: 'unrecognized error (fallback)',
      error: new Error('Something completely unexpected happened'),
      expected: 'Something went wrong. Please try again later.',
    },
  ])('maps a $branch error to the right user-facing message', ({ error, expected }) => {
    expect(getUserFriendlyError(error)).toBe(expected)
  })

  it('returns the no-error fallback message for a falsy input (distinct from the generic-unmatched fallback)', () => {
    expect(getUserFriendlyError(null)).toBe('Something went wrong. Please try again.')
    expect(getUserFriendlyError(undefined)).toBe('Something went wrong. Please try again.')
    expect(getUserFriendlyError('')).toBe('Something went wrong. Please try again.')
  })

  it('accepts a plain string (non-Error) message and still matches the right branch', () => {
    expect(getUserFriendlyError('404 page not found')).toBe(
      'The requested resource could not be found.'
    )
  })
})
