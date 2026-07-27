// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PRFilterDropdown } from './PRFilterDropdown';
import type { PRFilterType } from '../../types';
import { renderWithTheme } from '../../../../test/renderWithTheme';

const OPTIONS: PRFilterType[] = ['All states', 'Open', 'Merged', 'Closed', 'Draft'];

/**
 * Stateful harness wiring the controlled `PRFilterDropdown` to local state,
 * mirroring how `PullRequestsTab` drives it.
 *
 * @param onChange - optional spy invoked with each selected filter value.
 * @param initialValue - the filter active on first render (defaults to "All states").
 */
function PRFilterHarness({
  onChange,
  initialValue = 'All states',
}: {
  onChange?: (value: PRFilterType) => void;
  initialValue?: PRFilterType;
}) {
  const [value, setValue] = useState<PRFilterType>(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <PRFilterDropdown
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      isOpen={isOpen}
      onToggle={() => setIsOpen((open) => !open)}
      onClose={() => setIsOpen(false)}
    />
  );
}

describe('PRFilterDropdown', () => {
  it('exposes listbox aria attributes on the trigger', () => {
    renderWithTheme(<PRFilterHarness />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the active filter label on the trigger', () => {
    renderWithTheme(<PRFilterHarness initialValue="Merged" />);
    expect(screen.getByRole('button')).toHaveTextContent('Merged');
  });

  it('opens a listbox exposing every PR state option', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(OPTIONS);
  });

  it('marks only the active option with aria-selected', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness initialValue="Open" />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('option', { name: 'Open' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Draft' })).toHaveAttribute('aria-selected', 'false');
  });

  it('updates the active filter when an option is selected, closing and restoring focus', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness onChange={onChange} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Draft' }));

    expect(onChange).toHaveBeenCalledWith('Draft');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent('Draft');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('reflects the new selection as selected when reopened', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Closed' }));

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('option', { name: 'Closed' })).toHaveAttribute('aria-selected', 'true');
  });

  it('resets to the default "All states" filter when chosen', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness onChange={onChange} initialValue="Merged" />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'All states' }));

    expect(onChange).toHaveBeenCalledWith('All states');
    expect(screen.getByRole('button')).toHaveTextContent('All states');
  });

  it('opens with ArrowDown on the closed trigger', async () => {
    renderWithTheme(<PRFilterHarness />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
  });

  it('moves focus to the active option on open and navigates with arrow keys', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('option', { name: 'All states' })).toHaveFocus());

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Open' })).toHaveFocus());

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'All states' })).toHaveFocus());
  });

  it('wraps focus with ArrowUp from the first option to the last', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Draft' })).toHaveFocus());
  });

  it('jumps to the first and last option with Home and End', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'End' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Draft' })).toHaveFocus());

    fireEvent.keyDown(listbox, { key: 'Home' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'All states' })).toHaveFocus());
  });

  it('selects the active option with Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }); // -> Open
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Open');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('selects the active option with Space', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));

    fireEvent.keyDown(screen.getByRole('listbox'), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith('All states');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('collapses the menu on Tab without trapping focus', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Tab' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('ignores unhandled keys inside the menu', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<PRFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'x' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithTheme(<PRFilterHarness />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('renders option labels as text only (no markup injection)', () => {
    // PRFilterType is a fixed union, so labels can never carry markup; assert
    // the rendered trigger label is plain text rather than parsed DOM.
    renderWithTheme(<PRFilterHarness initialValue="Open" />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('Open');
    expect(trigger.querySelector('img')).toBeNull();
  });
});
