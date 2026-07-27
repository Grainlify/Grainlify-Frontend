/**
 * Converts technical error messages to user-friendly messages
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  /** Network errors: connectivity failures should not expose transport details. */
  if (
    errorMessage.includes('Network error') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Unable to connect')
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  /** Authentication errors: expired or invalid sessions should prompt re-authentication. */
  if (
    errorMessage.includes('Authentication failed') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('401')
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  /** Server errors: backend failures should be reported without leaking internals. */
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('Internal Server Error') ||
    errorMessage.includes('server error')
  ) {
    return 'Our servers are experiencing issues. Please try again in a few moments.';
  }

  /** Not-found errors: missing resources should get a stable user-facing message. */
  if (
    errorMessage.includes('404') ||
    errorMessage.includes('Not Found') ||
    errorMessage.includes('not found')
  ) {
    return 'The requested resource could not be found.';
  }

  /** Timeout errors: slow requests should guide users to retry. */
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('Timeout') ||
    errorMessage.includes('timed out')
  ) {
    return 'The request took too long. Please try again.';
  }

  /** Invalid response errors: malformed API responses should remain generic. */
  if (
    errorMessage.includes('Invalid response') ||
    errorMessage.includes('Invalid response format')
  ) {
    return 'We received an unexpected response from the server. Please try again.';
  }

  /** Generic API errors: failed requests should avoid raw request details. */
  if (
    errorMessage.includes('API request failed') ||
    errorMessage.includes('request failed')
  ) {
    return 'Unable to complete your request. Please try again.';
  }

  // For any other errors, return a generic message
  // This prevents exposing technical details to users
  return 'Something went wrong. Please try again later.';
}

