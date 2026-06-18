// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterDropdown } from './FilterDropdown';
import { renderWithTheme } from '../../test/renderWithTheme';

const OPTIONS = ['All Languages', 'TypeScript', 'JavaScript', 'Python'];

function FilterHarness({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('all');
  return (
    <FilterDropdown
      label="Language"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('FilterDropdown accessibility', () => {
  it('exposes listbox aria attributes on the trigger', () => {
    renderWithTheme(<FilterHarness />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a labelled listbox and focuses the search input', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    await waitFor(() => {
      expect(screen.getByLabelText('Search language')).toHaveFocus();
    });
  });

  it('filters options as the user types', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));

    await user.type(screen.getByLabelText('Search language'), 'Script');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['TypeScript', 'JavaScript']);
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));
    await user.type(screen.getByLabelText('Search language'), 'zzz');

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No options found.')).toBeInTheDocument();
  });

  it('marks the selected option with aria-selected', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));

    // Default value 'all' maps to the "All Languages" option.
    expect(screen.getByRole('option', { name: 'All Languages' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('navigates with arrow keys and selects with Enter, returning focus to the trigger', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness onChange={onChange} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const input = screen.getByLabelText('Search language');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // -> All Languages
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // -> TypeScript
    await waitFor(() => expect(screen.getByRole('option', { name: 'TypeScript' })).toHaveFocus());

    fireEvent.keyDown(screen.getByRole('option', { name: 'TypeScript' }), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('TypeScript');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('maps an "All …" option back to the "all" value when selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'All Languages' }));

    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByLabelText('Search language'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('wraps with ArrowUp from the first option to the last', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));

    const input = screen.getByLabelText('Search language');
    // ArrowUp from the initial (-1) state moves to the last option.
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Python' })).toHaveFocus());

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'JavaScript' })).toHaveFocus());
  });

  it('clears the search query with the clear button', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByLabelText('Search language');
    await user.type(input, 'Type');
    expect(input).toHaveValue('Type');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FilterHarness />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
