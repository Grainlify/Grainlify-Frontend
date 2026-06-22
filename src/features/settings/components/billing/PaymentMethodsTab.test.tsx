// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodsTab, validateWalletAddress } from './PaymentMethodsTab';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import type { PaymentMethod } from '../../types';

function createValidAddress(prefix: 'G' | 'M' | 'C'): string {
  const length = prefix === 'M' ? 69 : 56;
  return prefix + 'A'.repeat(length - 1);
}

const VALID_G = createValidAddress('G');
const VALID_M = createValidAddress('M');
const VALID_C = createValidAddress('C');

function setup(initial: PaymentMethod[] = []) {
  const onAddPaymentMethod = vi.fn();
  const onRemovePaymentMethod = vi.fn();
  const onSetDefault = vi.fn();

  const result = renderWithTheme(
    <PaymentMethodsTab
      paymentMethods={initial}
      onAddPaymentMethod={onAddPaymentMethod}
      onRemovePaymentMethod={onRemovePaymentMethod}
      onSetDefault={onSetDefault}
    />,
  );

  return { onAddPaymentMethod, onRemovePaymentMethod, onSetDefault, ...result };
}

async function openModal() {
  const user = userEvent.setup();
  // The header "Add Wallet" button is the first one in DOM order
  const buttons = screen.getAllByRole('button', { name: /add wallet/i });
  await user.click(buttons[0]);
}

async function typeAddress(address: string) {
  const user = userEvent.setup();
  const input = screen.getByPlaceholderText(/enter your.*wallet address/i);
  await user.type(input, address);
  return input;
}

async function submit() {
  const user = userEvent.setup();
  await user.click(getSubmitButton());
}

function getInput() {
  return screen.getByPlaceholderText(/enter your.*wallet address/i);
}

function getSubmitButton() {
  const buttons = screen.getAllByRole('button', { name: /add wallet/i });
  // The modal submit button is the last "Add Wallet" button in DOM order
  return buttons[buttons.length - 1];
}

describe('validateWalletAddress', () => {
  it('returns null for empty input', () => {
    expect(validateWalletAddress('')).toBeNull();
    expect(validateWalletAddress('   ')).toBeNull();
  });

  it('returns null for a valid G address (56 chars)', () => {
    expect(validateWalletAddress(VALID_G)).toBeNull();
  });

  it('returns null for a valid M address (69 chars)', () => {
    expect(validateWalletAddress(VALID_M)).toBeNull();
  });

  it('returns null for a valid C address (56 chars)', () => {
    expect(validateWalletAddress(VALID_C)).toBeNull();
  });

  it('returns null for a valid address with surrounding whitespace', () => {
    expect(validateWalletAddress(`  ${VALID_G}  `)).toBeNull();
  });

  it('rejects an address with wrong prefix', () => {
    const error = validateWalletAddress('X' + 'A'.repeat(55));
    expect(error).toMatch(/start with G, M, or C/i);
  });

  it('rejects an address that is too short', () => {
    const error = validateWalletAddress('G' + 'A'.repeat(50));
    expect(error).toMatch(/exactly 56 characters/i);
  });

  it('rejects a G address that is too long', () => {
    const error = validateWalletAddress('G' + 'A'.repeat(60));
    expect(error).toMatch(/exactly 56 characters/i);
  });

  it('rejects an M address with wrong length', () => {
    const error = validateWalletAddress('M' + 'A'.repeat(55));
    expect(error).toMatch(/exactly 69 characters/i);
  });

  it('rejects addresses with lowercase characters', () => {
    const error = validateWalletAddress('g' + 'A'.repeat(55));
    expect(error).toMatch(/start with G, M, or C/i);
  });

  it('rejects addresses with special characters', () => {
    const error = validateWalletAddress('G' + 'A'.repeat(54) + '!');
    expect(error).toMatch(/invalid characters/i);
  });

  it('rejects addresses with digits 0 and 1', () => {
    const error = validateWalletAddress('G' + 'A'.repeat(54) + '0');
    expect(error).toMatch(/invalid characters/i);
  });
});

describe('PaymentMethodsTab - wallet address validation', () => {
  it('opens the modal when Add Wallet is clicked', async () => {
    setup();
    await openModal();
    expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
  });

  it('disables the submit button when input is empty', async () => {
    setup();
    await openModal();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('disables the submit button after validation fails', async () => {
    setup();
    await openModal();
    await typeAddress('invalid');
    await submit();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('calls onAddPaymentMethod with a valid address', async () => {
    const { onAddPaymentMethod } = setup();
    await openModal();
    await typeAddress(VALID_G);
    await submit();
    expect(onAddPaymentMethod).toHaveBeenCalledTimes(1);
    expect(onAddPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: VALID_G }),
    );
  });

  it('trims whitespace before validation and uses trimmed address', async () => {
    const { onAddPaymentMethod } = setup();
    await openModal();
    const input = getInput();
    const user = userEvent.setup();
    await user.type(input, `  ${VALID_G}  `);
    await submit();
    expect(onAddPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: VALID_G }),
    );
  });

  it('shows an error and does not call onAddPaymentMethod for invalid addresses', async () => {
    const { onAddPaymentMethod } = setup();
    await openModal();
    await typeAddress('BAD');
    await submit();
    expect(onAddPaymentMethod).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('clears the error when the user starts typing after a failed submission', async () => {
    setup();
    await openModal();
    await typeAddress('BAD');
    await submit();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const input = getInput();
    const user = userEvent.setup();
    await user.type(input, 'X');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('resets the error when the modal is closed via close button', async () => {
    setup();
    await openModal();
    await typeAddress('BAD');
    await submit();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await openModal();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('resets the error when the modal is closed via Cancel button', async () => {
    setup();
    await openModal();
    await typeAddress('BAD');
    await submit();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await openModal();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('PaymentMethodsTab - accessibility', () => {
  it('sets aria-invalid on the input when validation fails', async () => {
    setup();
    await openModal();
    const input = getInput();
    expect(input).not.toHaveAttribute('aria-invalid');

    await typeAddress('BAD');
    await submit();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-describedby pointing to the error message', async () => {
    setup();
    await openModal();
    const input = getInput();
    await typeAddress('BAD');
    await submit();

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBe('wallet-address-error');
    const errorEl = document.getElementById('wallet-address-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent(/start with G, M, or C/i);
  });

  it('renders the error with role="alert"', async () => {
    setup();
    await openModal();
    await typeAddress('BAD');
    await submit();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
