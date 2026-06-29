// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoicesTab } from './InvoicesTab';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import { I18nProvider, en } from '../../../../shared/i18n';
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

const INVOICES_TRANSLATED_MESSAGES: Record<string, string> = {
  ...en,
  'invoices.title': 'Localized invoices title',
  'invoices.description': 'Localized invoices description',
  'invoices.table.invoice': 'Localized invoice header',
  'invoices.table.date': 'Localized date header',
  'invoices.table.amount': 'Localized amount header',
  'invoices.table.period': 'Localized period header',
  'invoices.table.status': 'Localized status header',
  'invoices.table.action': 'Localized action header',
  'invoices.empty.title': 'Localized empty title',
  'invoices.empty.description': 'Localized empty description',
  'invoices.actions.downloadInvoice': 'Localized download invoice',
  'invoices.actions.downloading': 'Localized downloading',
  'invoices.status.paid': 'Localized paid status',
  'invoices.status.pending': 'Localized pending status',
  'invoices.status.overdue': 'Localized overdue status',
  'invoices.errors.downloadFailed': 'Localized download failed',
};

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  // jsdom does not implement these; provide stubs so the component can run.
  mockDownloadInvoice.mockReset();
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(
  invoices: Invoice[] = [INVOICE_PAID],
  {
    messages = en,
    theme = 'light',
  }: { messages?: Record<string, string>; theme?: 'light' | 'dark' } = {},
) {
  return renderWithTheme(
    <I18nProvider messages={messages}>
      <InvoicesTab invoices={invoices} />
    </I18nProvider>,
    { theme },
  );
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

  it('renders section copy, table headers, statuses, and actions from the i18n catalog', () => {
    setup([INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE], {
      messages: INVOICES_TRANSLATED_MESSAGES,
    });

    expect(
      screen.getByRole('heading', { name: 'Localized invoices title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Localized invoices description')).toBeInTheDocument();
    expect(screen.getByText('Localized invoice header')).toBeInTheDocument();
    expect(screen.getByText('Localized date header')).toBeInTheDocument();
    expect(screen.getByText('Localized amount header')).toBeInTheDocument();
    expect(screen.getByText('Localized period header')).toBeInTheDocument();
    expect(screen.getByText('Localized status header')).toBeInTheDocument();
    expect(screen.getByText('Localized action header')).toBeInTheDocument();
    expect(screen.getByText('Localized paid status')).toBeInTheDocument();
    expect(screen.getByText('Localized pending status')).toBeInTheDocument();
    expect(screen.getByText('Localized overdue status')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Localized download invoice' }),
    ).toHaveLength(3);
  });

  it('renders empty-state copy from the i18n catalog', () => {
    setup([], { messages: INVOICES_TRANSLATED_MESSAGES });

    expect(screen.getByText('Localized empty title')).toBeInTheDocument();
    expect(screen.getByText('Localized empty description')).toBeInTheDocument();
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

  it('shows the fallback download error from the i18n catalog', async () => {
    mockDownloadInvoice.mockRejectedValue('unexpected string');
    setup([INVOICE_PAID], { messages: INVOICES_TRANSLATED_MESSAGES });
    await userEvent.click(
      screen.getByRole('button', { name: 'Localized download invoice' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Localized download failed');
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
    setup([INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE], { theme: 'dark' });
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
  });

  it('renders the empty state in dark theme without error', () => {
    setup([], { theme: 'dark' });
    expect(screen.getByText('No invoices yet')).toBeInTheDocument();
  });

  it('shows the download error alert in dark theme', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Dark theme network error'));
    setup([INVOICE_PAID], { theme: 'dark' });
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dark theme network error');
  });
});
