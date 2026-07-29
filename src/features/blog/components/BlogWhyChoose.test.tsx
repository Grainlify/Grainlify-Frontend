import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogWhyChoose } from './BlogWhyChoose'

const CARDS = [
  {
    title: 'Lightning Fast Matching',
    description:
      'Our AI-powered algorithm instantly connects you with the most relevant opportunities based on your profile and preferences.',
  },
  {
    title: 'All Chains, One Platform',
    description:
      'Access projects from every major blockchain ecosystem without switching platforms or creating multiple accounts.',
  },
  {
    title: 'Fair Compensation',
    description:
      'Transparent reward systems ensure contributors are fairly compensated for their work with competitive bounties and grants.',
  },
  {
    title: 'Vibrant Community',
    description:
      'Join thousands of developers and projects building the future of Web3 together in a supportive ecosystem.',
  },
]

describe.each(['light', 'dark'] as const)('BlogWhyChoose (%s theme)', (theme) => {
  it('renders all four cards with correct title and description text', () => {
    const { getByText } = renderWithTheme(<BlogWhyChoose />, { theme })

    for (const card of CARDS) {
      expect(getByText(card.title)).toBeInTheDocument()
      expect(getByText(card.description)).toBeInTheDocument()
    }
  })
})
