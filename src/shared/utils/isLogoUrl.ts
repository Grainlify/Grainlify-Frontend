/**
 * Checks whether a string is a valid HTTP/HTTPS URL (for use as a logo source).
 * Returns `false` for emoji, initials, or any non-URL string.
 */
export function isLogoUrl(logo: string): boolean {
  return typeof logo === 'string' && (logo.startsWith('http://') || logo.startsWith('https://'))
}