// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchModal } from './SearchModal';
import { renderWithTheme } from '../../test/renderWithTheme';

function SearchHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open search</button>
      <SearchModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe('SearchModal accessibility', () => {
  it('exposes role="dialog", aria-modal and a heading label', () => {
    renderWithTheme(<SearchModal isOpen onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(<SearchModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('focuses the search input when opened', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SearchHarness />);
    await user.click(screen.getByText('Open search'));

    await waitFor(() => {
      expect(screen.getByLabelText('Search open source projects')).toHaveFocus();
    });
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderWithTheme(<SearchModal isOpen onClose={onClose} />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Close search' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('updates the query as the user types', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, 'rust');
    expect(input).toHaveValue('rust');
  });

  it('populates the query when a suggestion is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} />);
    const suggestion = 'Find the best GraphQL clients for TypeScript';
    await user.click(screen.getByText(suggestion));

    expect(screen.getByLabelText('Search open source projects')).toHaveValue(suggestion);
  });

  it('returns focus to the trigger after closing', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SearchHarness />);
    const trigger = screen.getByText('Open search');
    await user.click(trigger);
    await waitFor(() =>
      expect(screen.getByLabelText('Search open source projects')).toHaveFocus(),
    );

    await user.click(screen.getByRole('button', { name: 'Close search' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
