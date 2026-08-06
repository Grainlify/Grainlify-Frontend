import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogHero } from './BlogHero'

describe.each(['light', 'dark'] as const)('BlogHero (%s theme)', (theme) => {
  beforeEach(() => {
    localStorage.setItem('theme', theme)
  })

  it('renders without error', () => {
    expect(() => renderWithTheme(<BlogHero />, { theme })).not.toThrow()
  })

  it('renders the blog hero heading', () => {
    const { getByRole } = renderWithTheme(<BlogHero />, { theme })
    expect(getByRole('heading', { name: 'Grainlify Blog' })).toBeInTheDocument()
  })

  it('renders the subtitle text', () => {
    const { getByText } = renderWithTheme(<BlogHero />, { theme })
    expect(
      getByText(/Insights, updates, and stories from the Grainlify ecosystem/)
    ).toBeInTheDocument()
  })

  it('renders the BookOpen icon wrapper', () => {
    const { container } = renderWithTheme(<BlogHero />, { theme })
    const iconWrapper = container.querySelector('.rounded-full.bg-gradient-to-br')
    expect(iconWrapper).toBeInTheDocument()
  })

  it('applies theme-aware text color to the heading', () => {
    const { getByRole } = renderWithTheme(<BlogHero />, { theme })
    const heading = getByRole('heading', { name: 'Grainlify Blog' })
    const expectedColor = theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
    expect(heading.className).toContain(expectedColor)
  })

  it('applies theme-aware text color to the subtitle', () => {
    const { getByText } = renderWithTheme(<BlogHero />, { theme })
    const subtitle = getByText(/Insights, updates, and stories/)
    const expectedColor = theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
    expect(subtitle.className).toContain(expectedColor)
  })

  it('renders animated background elements', () => {
    const { container } = renderWithTheme(<BlogHero />, { theme })
    const animatedBgs = container.querySelectorAll('.animate-pulse')
    expect(animatedBgs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the Sparkles icon', () => {
    const { container } = renderWithTheme(<BlogHero />, { theme })
    const sparklesContainer = container.querySelector('.animate-bounce-slow')
    expect(sparklesContainer).toBeInTheDocument()
  })
})
