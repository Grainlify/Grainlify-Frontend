import { fireEvent, render, screen } from '@testing-library/react'
import { MaintainerIssueCard } from './MaintainerIssueCard'
import { Issue } from '../../types'

vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    title: 'Fix the bug',
    repo: 'grainlify/frontend',
    comments: 2,
    applicants: 1,
    tags: [],
    user: 'octocat',
    timeAgo: '2h ago',
    applicationStatus: 'none',
    ...overrides,
  }
}

describe('MaintainerIssueCard avatar fallback', () => {
  it('shows the avatar image by default', () => {
    render(<MaintainerIssueCard issue={makeIssue()} index={0} onClick={() => {}} />)
    const img = screen.getByAltText('octocat') as HTMLImageElement
    expect(img.src).toContain('https://github.com/octocat.png?size=24')
  })

  it('falls back to initials when the image fails to load', () => {
    render(<MaintainerIssueCard issue={makeIssue()} index={0} onClick={() => {}} />)
    const img = screen.getByAltText('octocat')
    fireEvent.error(img)

    expect(screen.queryByAltText('octocat')).not.toBeInTheDocument()
    expect(screen.getByText('OC')).toBeInTheDocument()
  })

  it('does not leave a stray DOM node outside React control after a failure', () => {
    const { container } = render(
      <MaintainerIssueCard issue={makeIssue()} index={0} onClick={() => {}} />
    )
    fireEvent.error(screen.getByAltText('octocat'))

    // The fallback div is the only element rendered in place of the <img> -
    // no extra sibling inserted via insertBefore.
    const avatarSlot = container.querySelector('.border-t')
    expect(avatarSlot?.children).toHaveLength(3) // fallback div, username span, time span
  })

  it('retries loading a new avatar instead of showing stale initials when issue.user changes', () => {
    const { rerender } = render(
      <MaintainerIssueCard issue={makeIssue({ user: 'octocat' })} index={0} onClick={() => {}} />
    )
    fireEvent.error(screen.getByAltText('octocat'))
    expect(screen.getByText('OC')).toBeInTheDocument()

    rerender(
      <MaintainerIssueCard issue={makeIssue({ user: 'newuser' })} index={0} onClick={() => {}} />
    )

    // The failure state resets on a new user - the real <img> is attempted again,
    // not stuck showing the old user's initials.
    expect(screen.queryByText('OC')).not.toBeInTheDocument()
    expect(screen.queryByText('NE')).not.toBeInTheDocument()
    const img = screen.getByAltText('newuser') as HTMLImageElement
    expect(img.src).toContain('https://github.com/newuser.png?size=24')
  })
})
