import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { MaintainerViewRequired } from './components/MaintainerViewRequired'

/**
 * The maintainer surface must be gated on the VIEW, not only on the rail.
 *
 * The rail entry was already gated on activeRole. The page was not - so
 * arriving at ?tab=maintainers by any route other than the rail rendered the
 * whole maintainer dashboard while the role pill read CONTRIBUTOR. Hiding the
 * way in is not the same as gating the destination.
 *
 * That mattered beyond the display: activeRole was plain useState with no
 * persistence while currentPage read ?tab=, so every reload put a maintainer
 * back in contributor mode - and the rail entry leading to their own
 * application queue vanished with it.
 */
describe('maintainer view gate', () => {
  it('offers the switch rather than an explanation, and never claims lack of access', () => {
    const onSwitch = vi.fn()
    renderWithProviders(<MaintainerViewRequired onSwitch={onSwitch} />)

    // The remedy is the control, not the sentence: somebody who followed a
    // link here may not know the mode switch exists at all.
    expect(screen.getByRole('button', { name: /switch to maintainer view/i })).toBeInTheDocument()

    // Every action behind this is authorised server-side by ownership, so this
    // is a view mode and not a permission. Saying "no access" would be false.
    expect(screen.queryByText(/don't have access|no access|not authori/i)).not.toBeInTheDocument()
  })

  it('is not blank - a blank area cannot be told apart from a crash', () => {
    const { container } = renderWithProviders(<MaintainerViewRequired onSwitch={() => {}} />)
    expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(40)
  })
})
