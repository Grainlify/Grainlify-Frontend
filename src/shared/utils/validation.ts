/**
 * Validates that a GitHub repository name matches "owner/repo" format.
 * Accepts alphanumeric characters, hyphens, underscores, and dots in both segments.
 *
 * @param value - The repository full name to validate.
 * @returns `true` if valid, or an error message string if invalid.
 */
export function validateRepoName(value: string): string | true {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Repository name is required'
  }
  if (!trimmed.includes('/')) {
    return 'Repository name must be in format: owner/repo'
  }
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    return 'Repository name must be in format: owner/repo'
  }
  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return 'Repository name contains invalid characters. Use owner/repo format with letters, numbers, hyphens, underscores, and dots.'
  }
  return true
}

/**
 * Validates a URL string. Accepts empty values (optional field).
 * Must start with http:// or https:// and have a valid hostname.
 *
 * @param value - The URL to validate.
 * @returns `true` if valid or empty, or an error message string if invalid.
 */
export function validateUrl(value: string): string | true {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'URL must start with http:// or https://'
    }
    if (!url.hostname) {
      return 'URL must have a valid hostname'
    }
    return true
  } catch {
    return 'Please enter a valid URL starting with http:// or https://'
  }
}

/**
 * Validates an email address. Accepts empty values (optional field).
 * Must have a local part, @ symbol, domain, and TLD with no spaces.
 *
 * @param value - The email address to validate.
 * @returns `true` if valid or empty, or an error message string if invalid.
 */
export function validateEmail(value: string): string | true {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) {
    return 'Please enter a valid email address'
  }
  return true
}

/**
 * Validates that a route-level parameter (like :slug, :projectId, or :issueId)
 * is well-formed before it is used in API requests.
 *
 * A well-formed parameter must:
 * 1. Be non-empty.
 * 2. Contain only alphanumeric characters and hyphens (no slashes, dots, or spaces).
 * 3. Be between 1 and 100 characters in length.
 *
 * This check prevents path traversal (../), markup injection, and oversized
 * input from reaching backend endpoints.
 *
 * @param value - The route parameter to validate.
 * @returns `true` if valid, otherwise `false`.
 */
export function isValidRouteParam(value: string | undefined): value is string {
  if (!value) return false
  if (value.length > 100) return false
  return /^[a-zA-Z0-9-]+$/.test(value)
}

/**
 * Validates that a value is non-empty after trimming.
 *
 * @param value - The value to check.
 * @param fieldName - Display name for the field in the error message.
 * @returns `true` if non-empty, or an error message string if empty.
 */
export function validateRequired(value: string, fieldName: string): string | true {
  if (!value.trim()) {
    return `${fieldName} is required`
  }
  return true
}
