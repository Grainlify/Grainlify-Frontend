import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogCTA } from './BlogCTA'

describe.each(['light', 'dark'] as const)('BlogCTA (%s theme)', (theme) => {
  it('renders without error', () => {
    expect(() => renderWithTheme(<BlogCTA />, { theme })).not.toThrow()
  })

  it('renders the heading and body copy', () => {
    const { getByRole, getByText } = renderWithTheme(<BlogCTA />, { theme })
    expect(getByRole('heading', { name: 'Ready to Get Started?' })).toBeInTheDocument()
    expect(
      getByText(/is your gateway to the future of open-source collaboration/)
    ).toBeInTheDocument()
  })

  it('renders both CTA buttons with their labels', () => {
    const { getByRole } = renderWithTheme(<BlogCTA />, { theme })
    expect(getByRole('button', { name: /Join as Contributor/ })).toBeInTheDocument()
    expect(getByRole('button', { name: /Submit Your Project/ })).toBeInTheDocument()
  })
})
