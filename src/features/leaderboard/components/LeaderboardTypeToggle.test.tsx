import { render, screen, fireEvent } from '@testing-library/react'
import { LeaderboardTypeToggle } from './LeaderboardTypeToggle'

describe('LeaderboardTypeToggle', () => {
  it('gives each tab an id matching its own aria-controls target', () => {
    render(<LeaderboardTypeToggle leaderboardType="contributors" onToggle={() => {}} isLoaded />)

    const contributorsTab = screen.getByRole('tab', { name: /contributors/i })
    const projectsTab = screen.getByRole('tab', { name: /projects/i })

    expect(contributorsTab).toHaveAttribute('id', 'leaderboard-tab-contributors')
    expect(contributorsTab).toHaveAttribute('aria-controls', 'leaderboard-panel-contributors')
    expect(projectsTab).toHaveAttribute('id', 'leaderboard-tab-projects')
    expect(projectsTab).toHaveAttribute('aria-controls', 'leaderboard-panel-projects')
  })

  it('calls onToggle when a tab is clicked', () => {
    const onToggle = vi.fn()
    render(<LeaderboardTypeToggle leaderboardType="contributors" onToggle={onToggle} isLoaded />)

    fireEvent.click(screen.getByRole('tab', { name: /projects/i }))
    expect(onToggle).toHaveBeenCalledWith('projects')
  })

  it('preserves ArrowLeft/ArrowRight keyboard navigation between the two tabs', () => {
    const onToggle = vi.fn()
    render(<LeaderboardTypeToggle leaderboardType="contributors" onToggle={onToggle} isLoaded />)

    const contributorsTab = screen.getByRole('tab', { name: /contributors/i })
    fireEvent.keyDown(contributorsTab, { key: 'ArrowRight' })
    expect(onToggle).toHaveBeenCalledWith('projects')

    onToggle.mockClear()
    fireEvent.keyDown(contributorsTab, { key: 'ArrowLeft' })
    expect(onToggle).toHaveBeenCalledWith('projects')
  })
})
