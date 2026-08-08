import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { PaymentMethodsTab } from './PaymentMethodsTab'
import type { PaymentMethod } from '../../types'

function makeMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 1,
    ecosystem: 'stellar',
    cryptoType: 'usdc',
    walletAddress: 'GABC...WXYZ',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('PaymentMethodsTab', () => {
  it('shows the empty state when there are no payment methods', () => {
    renderWithProviders(
      <PaymentMethodsTab
        paymentMethods={[]}
        onAddPaymentMethod={vi.fn()}
        onRemovePaymentMethod={vi.fn()}
        onSetDefault={vi.fn()}
      />,
    )

    expect(screen.getByText('No payment methods added yet')).toBeInTheDocument()
  })

  it('lists existing payment methods with their token label', () => {
    renderWithProviders(
      <PaymentMethodsTab
        paymentMethods={[makeMethod({ cryptoType: 'usdt' })]}
        onAddPaymentMethod={vi.fn()}
        onRemovePaymentMethod={vi.fn()}
        onSetDefault={vi.fn()}
      />,
    )

    expect(screen.getByText('USDT on Stellar')).toBeInTheDocument()
    expect(screen.getByText('GABC...WXYZ')).toBeInTheDocument()
  })

  it('opens the Add Payment Method modal with a fixed Stellar network and all three tokens selectable', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <PaymentMethodsTab
        paymentMethods={[]}
        onAddPaymentMethod={vi.fn()}
        onRemovePaymentMethod={vi.fn()}
        onSetDefault={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Add Wallet/i }))

    expect(screen.getByText('Add Payment Method')).toBeInTheDocument()
    // Network is a fixed label, not a dropdown - there's nowhere else to redeem today.
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('Stellar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'USDC' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'USDT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'XLM' })).toBeInTheDocument()
  })

  it('submits the new payment method with the selected token and entered address', async () => {
    const onAddPaymentMethod = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <PaymentMethodsTab
        paymentMethods={[]}
        onAddPaymentMethod={onAddPaymentMethod}
        onRemovePaymentMethod={vi.fn()}
        onSetDefault={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Add Wallet/i }))
    await user.click(screen.getByRole('button', { name: 'XLM' }))
    await user.type(screen.getByPlaceholderText('Enter your XLM wallet address'), 'GXYZ...ABC')
    // "Add Wallet" also labels the header button that opened this modal - the
    // modal's own submit button is the second match in DOM order.
    const addWalletButtons = screen.getAllByRole('button', { name: 'Add Wallet' })
    await user.click(addWalletButtons[addWalletButtons.length - 1])

    expect(onAddPaymentMethod).toHaveBeenCalledTimes(1)
    expect(onAddPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ ecosystem: 'stellar', cryptoType: 'xlm', walletAddress: 'GXYZ...ABC' }),
    )
  })

  it('removes a payment method when its delete button is clicked', async () => {
    const onRemovePaymentMethod = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <PaymentMethodsTab
        paymentMethods={[makeMethod({ id: 42 })]}
        onAddPaymentMethod={vi.fn()}
        onRemovePaymentMethod={onRemovePaymentMethod}
        onSetDefault={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove payment method' }))
    expect(onRemovePaymentMethod).toHaveBeenCalledWith(42)
  })
})
