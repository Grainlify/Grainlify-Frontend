import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogHowItWorks } from './BlogHowItWorks'

const CONTRIBUTOR_STEPS = [
  'Connect your GitHub account',
  'Browse projects that match your skills',
  'Start contributing to issues and features',
  'Earn rewards and build your reputation',
  'Climb the leaderboard and unlock opportunities',
]

const MAINTAINER_STEPS = [
  'Set up bounties and contribution guidelines',
  'Get matched with skilled developers',
  'Review contributions and approve rewards',
  'Scale your project with community support',
]

describe('BlogHowItWorks', () => {
  it('renders the "How It Works" heading', () => {
    const { getByRole } = renderWithTheme(<BlogHowItWorks />)
    expect(getByRole('heading', { name: /How It Works/ })).toBeInTheDocument()
  })

  it('renders all five contributor steps in order inside an <ol>', () => {
    const { getAllByRole } = renderWithTheme(<BlogHowItWorks />)
    const lists = getAllByRole('list')
    // First list is "For Contributors".
    const items = lists[0].querySelectorAll('li')
    expect(items).toHaveLength(5)
    items.forEach((li, i) => {
      expect(li.textContent).toContain(CONTRIBUTOR_STEPS[i])
    })
    expect(lists[0].tagName).toBe('OL')
  })

  it('renders all five maintainer steps in order inside a second <ol>', () => {
    const { getAllByRole, getByText } = renderWithTheme(<BlogHowItWorks />)
    const lists = getAllByRole('list')
    expect(lists).toHaveLength(2)

    const items = lists[1].querySelectorAll('li')
    expect(items).toHaveLength(5)
    // Steps 2-5 are stable regardless of the OnlyGrain/Grainlify branding
    // wording in step 1 (tracked independently) - asserted by substring so
    // this test doesn't depend on which PR merges first.
    MAINTAINER_STEPS.forEach((step, i) => {
      expect(items[i + 1].textContent).toContain(step)
    })
    expect(getByText(/Submit your project to (OnlyGrain|Grainlify)/)).toBeInTheDocument()
    expect(lists[1].tagName).toBe('OL')
  })

  it('renders under both light and dark theme without error', () => {
    expect(() => renderWithTheme(<BlogHowItWorks />, { theme: 'light' })).not.toThrow()
    expect(() => renderWithTheme(<BlogHowItWorks />, { theme: 'dark' })).not.toThrow()
  })
})
