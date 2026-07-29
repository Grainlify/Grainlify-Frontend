import { siGithub } from 'simple-icons'

interface GithubIconProps {
  className?: string
}

// lucide-react no longer ships a GitHub brand icon (removed upstream in
// 1.23.0); this shared component fills that gap using the already-installed
// simple-icons data, matching lucide's className-driven sizing convention.
export function GithubIcon({ className }: GithubIconProps) {
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
}
