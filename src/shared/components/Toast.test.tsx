// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import Toast from './Toast';

const toasterProps: Record<string, unknown>[] = [];

vi.mock('sonner', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    Toaster: React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
      toasterProps.push(props);

      return (
        <section ref={ref} aria-label="Notifications Alt+T">
          <ol>
            <li data-sonner-toast="" data-type="success">
              <div data-title="">Saved successfully</div>
              <button data-close-button="">x</button>
            </li>
            <li data-sonner-toast="" data-type="info">
              <div data-title="">Copied to clipboard</div>
              <button data-close-button="">x</button>
            </li>
            <li data-sonner-toast="" data-type="error">
              <div data-title="">Save failed</div>
              <button data-close-button="">x</button>
            </li>
          </ol>
        </section>
      );
    }),
  };
});

function renderToast() {
  return render(
    <ThemeProvider>
      <Toast />
    </ThemeProvider>,
  );
}

describe('Toast accessibility', () => {
  it('marks success and info toasts as polite status live regions', async () => {
    renderToast();

    await waitFor(() => {
      expect(screen.getByText('Saved successfully').closest('[data-sonner-toast]')).toHaveAttribute(
        'role',
        'status',
      );
    });

    expect(screen.getByText('Saved successfully').closest('[data-sonner-toast]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByText('Copied to clipboard').closest('[data-sonner-toast]')).toHaveAttribute(
      'role',
      'status',
    );
    expect(screen.getByText('Copied to clipboard').closest('[data-sonner-toast]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('marks error toasts as assertive alert live regions', async () => {
    renderToast();

    const errorToast = screen.getByText('Save failed').closest('[data-sonner-toast]');

    await waitFor(() => {
      expect(errorToast).toHaveAttribute('role', 'alert');
    });

    expect(errorToast).toHaveAttribute('aria-live', 'assertive');
    expect(errorToast).toHaveAttribute('aria-atomic', 'true');
  });

  it('labels dismiss buttons and keeps Sonner auto-dismiss configuration', async () => {
    renderToast();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(3);
    });

    expect(toasterProps.at(-1)).toMatchObject({
      closeButton: true,
      duration: 3000,
      containerAriaLabel: 'Notifications',
      toastOptions: expect.objectContaining({
        closeButtonAriaLabel: 'Dismiss notification',
      }),
    });
  });
});
