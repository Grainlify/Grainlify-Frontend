export function isLogoUrl(logo: string): boolean {
  return typeof logo === 'string' && (logo.startsWith('http://') || logo.startsWith('https://'))
}
