// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueFilterDropdown } from './IssueFilterDropdown';
import { renderWithTheme } from '../../../../test/renderWithTheme';

const OPTIONS = ['All', 'Waiting for review', 'In progress', 'Stale'];

/**
 * Stateful harness wiring the controlled `IssueFilterDropdown` to local
 * state, mirroring how `IssueListSidebar` drives it.
 *
 * @param onChange - optional spy invoked with each selected filter value.
 * @param initialValue - the filter active on first render (defaults to "All").
 */
function IssueFilterHarness({
  onChange,
  initialValue = 'All',
}: {
  onChange?: (value: string) => void;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <IssueFilterDropdown
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

describe('IssueFilterDropdown', () => {
  it('exposes listbox aria attributes on the trigger', () => {
    renderWithTheme(<IssueFilterHarness />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the active filter label on the trigger', () => {
    renderWithTheme(<IssueFilterHarness initialValue="In progress" />);
    expect(screen.getByRole('button')).toHaveTextContent('In progress');
  });

  it('opens a labelled listbox exposing every option', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox', { name: 'Filter issues' })).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(OPTIONS);
  });

  it('marks only the active option with aria-selected', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness initialValue="Stale" />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('option', { name: 'Stale' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
  });

  it('updates the active filter when an option is selected and closes the menu', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Waiting for review' }));

    expect(onChange).toHaveBeenCalledWith('Waiting for review');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('button')).toHaveTextContent('Waiting for review');
  });

  it('reflects the new selection as selected when reopened', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'In progress' }));

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('option', { name: 'In progress' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('resets to the default "All" filter when the All option is chosen', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness onChange={onChange} initialValue="Stale" />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'All' }));

    expect(onChange).toHaveBeenCalledWith('All');
    expect(screen.getByRole('button')).toHaveTextContent('All');
  });

  it('opens with ArrowDown on the closed trigger', async () => {
    renderWithTheme(<IssueFilterHarness />);
    const trigger = screen.getByRole('button');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
  });

  it('moves focus to the active option on open and navigates with arrow keys', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));

    // Focus starts on the selected ("All") option.
    await waitFor(() => expect(screen.getByRole('option', { name: 'All' })).toHaveFocus());

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Waiting for review' })).toHaveFocus(),
    );

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'All' })).toHaveFocus());
  });

  it('wraps focus with ArrowUp from the first option to the last', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Stale' })).toHaveFocus());
  });

  it('jumps to the first and last option with Home and End', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'End' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Stale' })).toHaveFocus());

    fireEvent.keyDown(listbox, { key: 'Home' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'All' })).toHaveFocus());
  });

  it('selects the active option with Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }); // -> Waiting for review
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Waiting for review');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('selects the active option with Space', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));

    fireEvent.keyDown(screen.getByRole('listbox'), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith('All');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('collapses the menu on Tab without trapping focus', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Tab' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('ignores unhandled keys inside the menu', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithTheme(<IssueFilterHarness />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('renders option labels as text only (no markup injection)', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IssueFilterHarness initialValue="<img src=x onerror=alert(1)>" />);
    await user.click(screen.getByRole('button'));

    // The untrusted value is shown verbatim as text on the trigger, never
    // parsed into DOM nodes.
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(trigger.querySelector('img')).toBeNull();
  });
});
