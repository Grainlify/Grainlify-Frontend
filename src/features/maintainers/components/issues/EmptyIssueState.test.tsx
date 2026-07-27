// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { I18nProvider } from '../../../../shared/i18n'
import { EmptyIssueState } from './EmptyIssueState'

describe('EmptyIssueState', () => {
  it('renders localized copy, illustration, and a clickable create issue CTA', async () => {
    const handleCtaClick = vi.fn()
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <EmptyIssueState
          issueCount={0}
          ctaHref="https://github.com/test-org/test-repo/issues/new"
          onCtaClick={handleCtaClick}
        />
      </I18nProvider>
    )

    expect(screen.getByRole('heading', { name: 'No open issues yet' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Create or import issues from GitHub so contributors know where they can help next.'
      )
    ).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /create an issue on github/i })
    expect(cta).toHaveAttribute('href', 'https://github.com/test-org/test-repo/issues/new')

    await user.click(cta)

    expect(handleCtaClick).toHaveBeenCalledTimes(1)
  })
})
