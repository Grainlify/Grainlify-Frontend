import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogFeatureList } from './BlogFeatureList'
import { BlogFeature } from '../types'

function feature(overrides: Partial<BlogFeature> = {}): BlogFeature {
  return {
    number: 1,
    title: 'Default title',
    description: 'Default description',
    ...overrides,
  }
}

describe('BlogFeatureList', () => {
  it('renders an empty container without throwing for an empty features array', () => {
    const { container } = renderWithTheme(<BlogFeatureList features={[]} />)
    expect(container.firstElementChild).toBeEmptyDOMElement()
  })

  it('renders a single feature with its number, title, and description', () => {
    const { getByText } = renderWithTheme(
      <BlogFeatureList
        features={[feature({ number: 1, title: 'Connect', description: 'Link your account' })]}
      />
    )
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('Connect')).toBeInTheDocument()
    expect(getByText('Link your account')).toBeInTheDocument()
  })

  it('renders multiple features in the given order', () => {
    const features: BlogFeature[] = [
      feature({ number: 1, title: 'First', description: 'First description' }),
      feature({ number: 2, title: 'Second', description: 'Second description' }),
      feature({ number: 3, title: 'Third', description: 'Third description' }),
    ]
    const { getAllByRole } = renderWithTheme(<BlogFeatureList features={features} />)

    const headings = getAllByRole('heading', { level: 4 })
    expect(headings.map((h) => h.textContent)).toEqual(['First', 'Second', 'Third'])
  })
})
