import { render } from '@testing-library/react'
import { IssueCardSkeleton } from './IssueCardSkeleton'
import { useTheme } from '../contexts/ThemeContext'

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

const mockUseTheme = vi.mocked(useTheme)

describe('IssueCardSkeleton', () => {
  it('renders light-mode classes when theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light' } as ReturnType<typeof useTheme>)
    const { container } = render(<IssueCardSkeleton />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-white/[0.15]')
    expect(outer.className).toContain('border-white/25')
    expect(outer.className).not.toContain('bg-white/[0.08]')
  })

  it('renders dark-mode classes when theme is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark' } as ReturnType<typeof useTheme>)
    const { container } = render(<IssueCardSkeleton />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-white/[0.08]')
    expect(outer.className).toContain('border-white/10')
    expect(outer.className).not.toContain('bg-white/[0.15]')
  })
})
