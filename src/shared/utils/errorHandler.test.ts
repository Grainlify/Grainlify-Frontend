import { describe, it, expect } from 'vitest';
import { getUserFriendlyError } from './errorHandler';

describe('getUserFriendlyError', () => {
  it('returns default message for falsy input', () => {
    expect(getUserFriendlyError(null)).toBe(
      'Something went wrong. Please try again.',
    );
    expect(getUserFriendlyError(undefined)).toBe(
      'Something went wrong. Please try again.',
    );
    expect(getUserFriendlyError('')).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('maps network errors', () => {
    expect(getUserFriendlyError(new Error('Network error'))).toBe(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
    expect(getUserFriendlyError(new Error('Failed to fetch'))).toBe(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
    expect(getUserFriendlyError(new Error('Unable to connect'))).toBe(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
  });

  it('maps authentication errors', () => {
    expect(getUserFriendlyError(new Error('Authentication failed'))).toBe(
      'Your session has expired. Please sign in again.',
    );
    expect(getUserFriendlyError(new Error('Unauthorized'))).toBe(
      'Your session has expired. Please sign in again.',
    );
    expect(getUserFriendlyError(new Error('401'))).toBe(
      'Your session has expired. Please sign in again.',
    );
  });

  it('maps server errors', () => {
    expect(getUserFriendlyError(new Error('500'))).toBe(
      'Our servers are experiencing issues. Please try again in a few moments.',
    );
    expect(getUserFriendlyError(new Error('Internal Server Error'))).toBe(
      'Our servers are experiencing issues. Please try again in a few moments.',
    );
    expect(getUserFriendlyError(new Error('server error'))).toBe(
      'Our servers are experiencing issues. Please try again in a few moments.',
    );
  });

  it('maps not-found errors', () => {
    expect(getUserFriendlyError(new Error('404'))).toBe(
      'The requested resource could not be found.',
    );
    expect(getUserFriendlyError(new Error('Not Found'))).toBe(
      'The requested resource could not be found.',
    );
    expect(getUserFriendlyError(new Error('not found'))).toBe(
      'The requested resource could not be found.',
    );
  });

  it('maps timeout errors', () => {
    expect(getUserFriendlyError(new Error('timeout'))).toBe(
      'The request took too long. Please try again.',
    );
    expect(getUserFriendlyError(new Error('Timeout'))).toBe(
      'The request took too long. Please try again.',
    );
    expect(getUserFriendlyError(new Error('timed out'))).toBe(
      'The request took too long. Please try again.',
    );
  });

  it('maps invalid response errors', () => {
    expect(getUserFriendlyError(new Error('Invalid response'))).toBe(
      'We received an unexpected response from the server. Please try again.',
    );
    expect(getUserFriendlyError(new Error('Invalid response format'))).toBe(
      'We received an unexpected response from the server. Please try again.',
    );
  });

  it('maps generic API request failures', () => {
    expect(getUserFriendlyError(new Error('API request failed'))).toBe(
      'Unable to complete your request. Please try again.',
    );
    expect(getUserFriendlyError(new Error('request failed'))).toBe(
      'Unable to complete your request. Please try again.',
    );
  });

  it('returns generic message for unrecognized errors', () => {
    expect(
      getUserFriendlyError(new Error('Some random error')),
    ).toBe('Something went wrong. Please try again later.');
  });

  it('does not expose raw internal details in fallback messages', () => {
    const rawError =
      'DatabaseError: password reset token abc123 failed for /internal/users/42';

    const friendlyMessage = getUserFriendlyError(new Error(rawError));

    expect(friendlyMessage).toBe('Something went wrong. Please try again later.');
    expect(friendlyMessage).not.toContain('DatabaseError');
    expect(friendlyMessage).not.toContain('abc123');
    expect(friendlyMessage).not.toContain('/internal/users/42');
  });

  it('does not echo raw details for mapped API errors', () => {
    const rawError =
      'API request failed: upstream returned traceId=secret-trace-789';

    const friendlyMessage = getUserFriendlyError(new Error(rawError));

    expect(friendlyMessage).toBe(
      'Unable to complete your request. Please try again.',
    );
    expect(friendlyMessage).not.toContain('secret-trace-789');
    expect(friendlyMessage).not.toContain('upstream');
  });

  it('handles string input directly', () => {
    expect(getUserFriendlyError('Network error')).toBe(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
  });

  it('handles non-Error objects', () => {
    expect(getUserFriendlyError({ code: 500 })).toBe(
      'Something went wrong. Please try again later.',
    );
  });
});
