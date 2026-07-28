import { memo } from 'react'
import { siGithub } from 'simple-icons'

// lucide-react no longer ships a GitHub brand icon (removed upstream); this
// shared component fills that gap using the already-installed simple-icons
// data, matching lucide's className-driven sizing convention.
export const GithubIcon = memo(function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={siGithub.path} />
    </svg>
  )
})
