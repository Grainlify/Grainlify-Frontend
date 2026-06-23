// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoicesTab } from './InvoicesTab';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import type { Invoice } from '../../types';

// ── Hoisted mock factories ────────────────────────────────────────────────────
const { mockDownloadInvoice } = vi.hoisted(() => ({
  mockDownloadInvoice: vi.fn(),
}));

vi.mock('../../../../shared/api/client', () => ({
  downloadInvoice: mockDownloadInvoice,
}));

vi.mock('../../../../shared/utils/logger', () => ({
  logger: { debug: vi.fn() },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const INVOICE_PAID: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2024-001',
  date: '2024-01-15',
  amount: 99.99,
  currency: 'USD',
  status: 'paid',
  description: 'Monthly subscription',
  billingPeriod: 'Jan 2024',
};

const INVOICE_PENDING: Invoice = {
  id: 'inv-2',
  invoiceNumber: 'INV-2024-002',
  date: '2024-02-15',
  amount: 149.99,
  currency: 'USD',
  status: 'pending',
  description: 'Pro plan',
  billingPeriod: 'Feb 2024',
};

const INVOICE_OVERDUE: Invoice = {
  id: 'inv-3',
  invoiceNumber: 'INV-2024-003',
  date: '2024-03-15',
  amount: 49.99,
  currency: 'USD',
  status: 'overdue',
  description: 'Starter plan',
  billingPeriod: 'Mar 2024',
};

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  // jsdom does not implement these; provide stubs so the component can run.
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

function setup(invoices: Invoice[] = [INVOICE_PAID]) {
  return renderWithTheme(<InvoicesTab invoices={invoices} />);
}

// ── Rendering ─────────────────────────────────────────────────────────────────
describe('InvoicesTab — rendering', () => {
  it('shows the empty state when there are no invoices', () => {
    setup([]);
    expect(screen.getByText('No invoices yet')).toBeInTheDocument();
  });

  it('renders a row for each invoice', () => {
    setup([INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE]);
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-002')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-003')).toBeInTheDocument();
  });

  it('renders all three status variants without error', () => {
    setup([INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE]);
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
  });
});

// ── Download success ──────────────────────────────────────────────────────────
describe('InvoicesTab — download success', () => {
  it('calls downloadInvoice with the correct invoice id', async () => {
    mockDownloadInvoice.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    setup();
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    await waitFor(() => expect(mockDownloadInvoice).toHaveBeenCalledWith('inv-1'));
  });

  it('creates an object URL from the returned blob then revokes it', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    mockDownloadInvoice.mockResolvedValue(blob);
    setup();
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  it('downloads without error when invoiceNumber contains only safe characters', async () => {
    mockDownloadInvoice.mockResolvedValue(new Blob());
    setup();
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
  });

  it('clears the row error when a subsequent download succeeds', async () => {
    mockDownloadInvoice
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue(new Blob());

    setup();
    const btn = screen.getByRole('button', { name: /download invoice/i });
    await userEvent.click(btn);
    await screen.findByRole('alert');

    await userEvent.click(btn);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

// ── Download error ────────────────────────────────────────────────────────────
describe('InvoicesTab — download error', () => {
  it('shows the error message in a per-row alert on failure', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Network error'));
    setup();
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error');
  });

  it('shows a fallback message when the thrown value is not an Error instance', async () => {
    mockDownloadInvoice.mockRejectedValue('unexpected string');
    setup();
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Download failed. Please try again.');
  });

  it('isolates the error to the failing row only', async () => {
    mockDownloadInvoice
      .mockRejectedValueOnce(new Error('Row 1 failed'))
      .mockResolvedValue(new Blob());

    setup([INVOICE_PAID, INVOICE_PENDING]);
    const [btn1] = screen.getAllByRole('button', { name: /download invoice/i });
    await userEvent.click(btn1);
    await screen.findByRole('alert');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('does not call createObjectURL or revokeObjectURL on failure', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Server error'));
    setup();
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    await screen.findByRole('alert');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────
describe('InvoicesTab — loading state', () => {
  it('disables the button and updates aria-label while the fetch is in flight', async () => {
    let resolve!: (b: Blob) => void;
    mockDownloadInvoice.mockReturnValue(new Promise<Blob>((res) => { resolve = res; }));

    setup();
    const btn = screen.getByRole('button', { name: /download invoice/i });
    await userEvent.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());
    expect(btn).toHaveAttribute('aria-label', 'Downloading…');

    resolve(new Blob());
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(btn).toHaveAttribute('aria-label', 'Download Invoice');
  });

  it('only disables the row being fetched, leaving other rows enabled', async () => {
    let resolve!: (b: Blob) => void;
    mockDownloadInvoice.mockReturnValue(new Promise<Blob>((res) => { resolve = res; }));

    setup([INVOICE_PAID, INVOICE_PENDING]);
    const [btn1, btn2] = screen.getAllByRole('button', { name: /download invoice/i });
    await userEvent.click(btn1);

    await waitFor(() => expect(btn1).toBeDisabled());
    expect(btn2).not.toBeDisabled();

    resolve(new Blob());
    await waitFor(() => expect(btn1).not.toBeDisabled());
  });
});

// ── Responsive layout ─────────────────────────────────────────────────────────
describe('InvoicesTab — responsive layout', () => {
  it('wraps the invoice table in an overflow-x-auto scroll container', () => {
    const { container } = setup();
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });

  it('sets a minimum width on the inner container to prevent column collapse', () => {
    const { container } = setup();
    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer?.firstElementChild?.className).toMatch(/min-w-/);
  });
});

// ── Dark theme — covers the theme === 'dark' branches in every ternary ────────
describe('InvoicesTab — dark theme', () => {
  it('renders the invoice table in dark theme without error', () => {
    renderWithTheme(
      <InvoicesTab invoices={[INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE]} />,
      { theme: 'dark' },
    );
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
  });

  it('renders the empty state in dark theme without error', () => {
    renderWithTheme(<InvoicesTab invoices={[]} />, { theme: 'dark' });
    expect(screen.getByText('No invoices yet')).toBeInTheDocument();
  });

  it('shows the download error alert in dark theme', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Dark theme network error'));
    renderWithTheme(<InvoicesTab invoices={[INVOICE_PAID]} />, { theme: 'dark' });
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dark theme network error');
  });
});
