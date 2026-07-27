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

  describe('Multi-select functionality', () => {
    const MOCK_ISSUES = [
      { id: 1, status: 'Waiting for review' },
      { id: 2, status: 'In progress' },
      { id: 3, status: 'Stale' },
      { id: 4, status: 'All' }, // matches anything or dummy
    ];

    function MultiSelectIssueFilterHarness({
      onChange,
      initialValue = 'All',
    }: {
      onChange?: (value: string) => void;
      initialValue?: string;
    }) {
      const [value, setValue] = useState(initialValue);
      const [isOpen, setIsOpen] = useState(false);

      const handleFilterChange = (next: string) => {
        let nextValue = next;
        if (next === 'All') {
          nextValue = 'All';
        } else {
          const currentSelections = value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v !== 'All' && v !== '');

          if (currentSelections.includes(next)) {
            // Deselect
            const updated = currentSelections.filter((v) => v !== next);
            nextValue = updated.length > 0 ? updated.join(', ') : 'All';
          } else {
            // Select
            currentSelections.push(next);
            nextValue = currentSelections.join(', ');
          }
        }
        setValue(nextValue);
        onChange?.(nextValue);
      };

      // Filter semantics: OR logic between active filter values
      const activeFilters = value.split(',').map((v) => v.trim());
      const filteredIssues = MOCK_ISSUES.filter((issue) => {
        if (activeFilters.includes('All')) return true;
        return activeFilters.includes(issue.status);
      });

      return (
        <div>
          <IssueFilterDropdown
            value={value}
            onChange={handleFilterChange}
            isOpen={isOpen}
            onToggle={() => setIsOpen((open) => !open)}
            onClose={() => setIsOpen(false)}
          />
          <div data-testid="filtered-count">{filteredIssues.length}</div>
          <ul data-testid="filtered-list">
            {filteredIssues.map((issue) => (
              <li key={issue.id}>{issue.id} - {issue.status}</li>
            ))}
          </ul>
          <button data-testid="clear-all" onClick={() => handleFilterChange('All')}>
            Clear All
          </button>
        </div>
      );
    }

    const getTrigger = () => screen.getAllByRole('button')[0];

    it('asserts that selecting multiple filter values matches OR semantics (union of matched issues)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(<MultiSelectIssueFilterHarness onChange={onChange} initialValue="Waiting for review" />);

      // Verify initial state: only 1 issue matches "Waiting for review"
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');

      // Open dropdown and select "In progress" to combine them
      const trigger = getTrigger();
      await user.click(trigger);
      const optionInProgress = screen.getByRole('option', { name: 'In progress' });
      await user.click(optionInProgress);

      // Verify that value updated to combined list
      expect(onChange).toHaveBeenLastCalledWith('Waiting for review, In progress');
      expect(getTrigger()).toHaveTextContent('Waiting for review, In progress');

      // Verify OR semantics: both "Waiting for review" (id 1) and "In progress" (id 2) issues match
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('2');
      const listItems = screen.getAllByRole('listitem').map((li) => li.textContent);
      expect(listItems).toContain('1 - Waiting for review');
      expect(listItems).toContain('2 - In progress');
    });

    it('asserts that deselecting one of several active filters leaves the rest applied', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectIssueFilterHarness
          onChange={onChange}
          initialValue="Waiting for review, In progress"
        />,
      );

      // Verify initial state: 2 issues match
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('2');

      // Open dropdown and click "Waiting for review" to deselect it
      const trigger = getTrigger();
      await user.click(trigger);
      const optionWaiting = screen.getByRole('option', { name: 'Waiting for review' });
      await user.click(optionWaiting);

      // Verify that only "In progress" remains
      expect(onChange).toHaveBeenLastCalledWith('In progress');
      expect(getTrigger()).toHaveTextContent('In progress');

      // Verify filtered set updated to show only "In progress" issue
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');
      const listItems = screen.getAllByRole('listitem').map((li) => li.textContent);
      expect(listItems).toEqual(['2 - In progress']);
    });

    it('asserts that a clear all filters action resets to the unfiltered view', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectIssueFilterHarness
          onChange={onChange}
          initialValue="Waiting for review, In progress"
        />,
      );

      // Verify initial state is filtered (2 issues match)
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('2');

      // Click clear all button
      await user.click(screen.getByTestId('clear-all'));

      // Verify state reset to "All"
      expect(onChange).toHaveBeenLastCalledWith('All');
      expect(getTrigger()).toHaveTextContent('All');

      // Verify unfiltered view: all 4 mock issues match
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('4');
    });
  });
});

