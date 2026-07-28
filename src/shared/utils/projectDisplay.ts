/**
 * Helper function to format numbers (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Helper function to get project icon/avatar URL from GitHub full name
 */
export function getProjectIcon(githubFullName: string): string {
  const [owner] = githubFullName.split('/')
  // Use higher‑resolution owner avatar so cards look crisp
  return `https://github.com/${owner}.png?size=200`
}

/**
 * Helper function to get gradient color based on project name
 */
export function getProjectColor(name: string): string {
  const colors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-red-500 to-pink-500',
    'from-orange-500 to-red-500',
    'from-gray-600 to-gray-800',
    'from-green-600 to-green-800',
    'from-cyan-500 to-blue-600',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}