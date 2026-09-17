import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'

vi.mock('./ClaimsCard', () => ({ ClaimsCard: () => <div>claims-card</div> }))
vi.mock('./PayoutReadinessCard', () => ({ PayoutReadinessCard: () => <div>readiness-card</div> }))
vi.mock('./PayoutAddressCard', () => ({ PayoutAddressCard: () => <div>address-card</div> }))
vi.mock('./BaseAddressCard', () => ({ BaseAddressCard: () => <div>base-address-card</div> }))

import { PayoutTab } from './PayoutTab'

describe('PayoutTab', () => {
  it('renders the four payout cards', () => {
    renderWithProviders(<PayoutTab />)
    expect(screen.getByText('claims-card')).toBeInTheDocument()
    expect(screen.getByText('readiness-card')).toBeInTheDocument()
    expect(screen.getByText('address-card')).toBeInTheDocument()
    expect(screen.getByText('base-address-card')).toBeInTheDocument()
  })

  // The regression this file exists for.
  //
  // A "Payout preferences" card used to sit below these three: a per-project
  // billing-profile dropdown and a Save button whose handler was one
  // console.log behind a TODO. It shipped in the initial commit and survived
  // six months, and the previous version of THIS FILE is the reason it lasted:
  // it carried a comment reading "handleSave just console.logs a TODO, per the
  // source, so it isn't exercised here", then tested the card's five rendering
  // paths and none of its behaviour.
  //
  // The non-implementation was known, written down, and in the repository. It
  // was recorded as a reason to narrow a test rather than as a defect, which is
  // precisely how it avoided ever being reported. A scoping note reads as
  // considered; a bug report gets fixed.
  //
  // So this asserts the absence, not the presence. Any control offering to
  // save something on the payout screen must be backed by a request, and the
  // cheapest way to state that is to fail if a Save button comes back without
  // one.
  it('offers no save control, because nothing here has anything to save', () => {
    renderWithProviders(<PayoutTab />)
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })
})
