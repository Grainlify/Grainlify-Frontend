// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlassDropdown } from './GlassDropdown';
import { renderWithTheme } from '../../test/renderWithTheme';

const OPTIONS = ['Open', 'Merged', 'Closed'] as const;
type Option = (typeof OPTIONS)[number];

function GlassHarness({
  initialValue = 'Open',
  onChange,
}: {
  initialValue?: Option;
  onChange?: (value: Option) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Option>(initialValue);
  return (
    <GlassDropdown<Option>
      value={value}
      options={[...OPTIONS]}
      isOpen={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('GlassDropdown accessibility', () => {
  it('exposes combobox aria attributes on the trigger', () => {
    renderWithTheme(<GlassHarness />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
  });

  it('reflects the open state with aria-expanded and renders a listbox', async () => {
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });

  it('marks the selected option with aria-selected', async () => {
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness initialValue="Merged" />);
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('option', { name: 'Merged' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Open' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('focuses the selected option when opened', async () => {
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness initialValue="Merged" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merged' })).toHaveFocus();
    });
  });

  it('navigates options with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness initialValue="Open" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Open' })).toHaveFocus());

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Merged' })).toHaveFocus());

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Open' })).toHaveFocus());

    // ArrowUp from the first option wraps to the last.
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Closed' })).toHaveFocus());

    // Home / End jump to the ends.
    fireEvent.keyDown(listbox, { key: 'Home' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Open' })).toHaveFocus());
    fireEvent.keyDown(listbox, { key: 'End' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Closed' })).toHaveFocus());
  });

  it('selects the active option with Enter and returns focus to the trigger', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness initialValue="Open" onChange={onChange} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Open' })).toHaveFocus());

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Merged');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('selects an option on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Closed' }));

    expect(onChange).toHaveBeenCalledWith('Closed');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('opens with ArrowDown on the closed trigger', async () => {
    renderWithTheme(<GlassHarness />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
  });

  it('opens with Enter on the closed trigger', async () => {
    renderWithTheme(<GlassHarness />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
  });

  it('collapses the menu when Tab is pressed', async () => {
    const user = userEvent.setup();
    renderWithTheme(<GlassHarness />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Tab' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
