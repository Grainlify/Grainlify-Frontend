import { render } from '@testing-library/react'
import { PRRowSkeleton } from './PRRowSkeleton'
import { useTheme } from '../contexts/ThemeContext'

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

const mockUseTheme = vi.mocked(useTheme)

function renderSkeleton() {
  return render(
    <table>
      <tbody>
        <PRRowSkeleton />
      </tbody>
    </table>
  )
}

describe('PRRowSkeleton', () => {
  it('renders light-mode classes when theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light' } as ReturnType<typeof useTheme>)
    const { getByRole } = renderSkeleton()
    const row = getByRole('row')
    expect(row.className).toContain('bg-white/[0.08]')
    expect(row.className).toContain('border-white/15')
    expect(row.className).not.toContain('bg-white/[0.06]')
  })

  it('renders dark-mode classes when theme is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark' } as ReturnType<typeof useTheme>)
    const { getByRole } = renderSkeleton()
    const row = getByRole('row')
    expect(row.className).toContain('bg-white/[0.06]')
    expect(row.className).toContain('border-white/[0.12]')
    expect(row.className).not.toContain('bg-white/[0.08]')
  })
})
