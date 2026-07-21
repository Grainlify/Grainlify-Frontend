// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState, act } from 'react';
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

describe('SearchModal submit state', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onSearch with the trimmed query on submit', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, '  react hooks  ');
    await user.click(screen.getByRole('button', { name: 'Submit search' }));
    expect(onSearch).toHaveBeenCalledWith('react hooks');
  });

  it('does not submit when the query is empty', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    await user.click(screen.getByRole('button', { name: 'Submit search' }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('does not submit whitespace-only queries', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: 'Submit search' }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('disables the submit button when the query is empty', () => {
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Submit search' })).toBeDisabled();
  });

  it('disables the submit button for whitespace-only queries', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={vi.fn()} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, '   ');
    expect(screen.getByRole('button', { name: 'Submit search' })).toBeDisabled();
  });

  it('disables the submit button and shows a spinner while pending', async () => {
    let resolveSearch!: () => void;
    const searchPromise = new Promise<void>((resolve) => { resolveSearch = resolve; });
    const onSearch = vi.fn().mockReturnValue(searchPromise);
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, 'react');

    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    const btn = screen.getByRole('button', { name: 'Submit search' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
    expect(btn.querySelector('.lucide-arrow-right')).not.toBeInTheDocument();

    act(() => { resolveSearch(); });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it('re-enables the submit button after the search completes', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, 'react');
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit search' })).not.toBeDisabled();
    });
  });

  it('re-enables the submit button after the search errors', async () => {
    const onSearch = vi.fn().mockRejectedValue(new Error('search failed'));
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, 'react');
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit search' })).not.toBeDisabled();
    });
  });

  it('submits on Enter key press', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');
    expect(onSearch).toHaveBeenCalledWith('react');
  });

  it('does not submit an empty query on Enter', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    await user.keyboard('{Enter}');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('prevents concurrent duplicate submissions', async () => {
    let resolveSearch!: () => void;
    const searchPromise = new Promise<void>((resolve) => { resolveSearch = resolve; });
    const onSearch = vi.fn().mockReturnValue(searchPromise);
    const user = userEvent.setup();
    renderWithTheme(<SearchModal isOpen onClose={() => {}} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search open source projects');
    await user.type(input, 'react');

    await user.click(screen.getByRole('button', { name: 'Submit search' }));
    await user.click(screen.getByRole('button', { name: 'Submit search' }));
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(onSearch).toHaveBeenCalledTimes(1);

    act(() => { resolveSearch(); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit search' })).not.toBeDisabled());
  });

});
