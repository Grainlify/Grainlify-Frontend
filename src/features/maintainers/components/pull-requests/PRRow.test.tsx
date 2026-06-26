// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { PRRow } from './PRRow'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import type { PullRequest } from '../../types'

const PR: PullRequest = {
  id: 1,
  number: 42,
  title: 'Improve pull request indicators',
  status: 'open',
  statusDetail: 'opened today',
  url: 'https://github.com/octo-org/frontend-app/pull/42',
  author: {
    name: 'alice',
    avatar: '',
    badges: [],
  },
  repo: 'frontend-app',
  org: 'octo-org',
  indicators: ['check', 'x', 'trophy', 'eye', 'code'],
}

describe('PRRow indicators', () => {
  it('labels status indicators for screen readers and hides the decorative icons', () => {
    renderWithTheme(<PRRow pr={PR} />)

    expect(screen.getByText('Improve pull request indicators')).toBeInTheDocument()

    const labels = [
      'Checks passing',
      'Checks failing',
      'Rewarded pull request',
      'Needs review',
      'Code changes',
    ]

    labels.forEach((label) => {
      const indicator = screen.getByRole('img', { name: label })
      expect(indicator.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
