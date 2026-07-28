import { render } from '@testing-library/react'
import { ContributorsTableSkeleton } from './ContributorsTableSkeleton'
import { useTheme } from '../../../shared/contexts/ThemeContext'

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

const mockUseTheme = vi.mocked(useTheme)

describe('ContributorsTableSkeleton', () => {
  it('renders light-mode container classes when theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light' } as ReturnType<typeof useTheme>)
    const { container } = render(<ContributorsTableSkeleton />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-white/[0.12]')
    expect(outer.className).toContain('border-white/20')
    expect(outer.className).not.toContain('bg-white/[0.10]')
  })

  it('renders dark-mode container classes when theme is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark' } as ReturnType<typeof useTheme>)
    const { container } = render(<ContributorsTableSkeleton />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-white/[0.10]')
    expect(outer.className).toContain('border-white/[0.16]')
    expect(outer.className).not.toContain('bg-white/[0.12]')
  })
})
