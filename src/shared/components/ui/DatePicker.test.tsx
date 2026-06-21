// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import {
  DatePicker,
  formatDatePickerValue,
  parseDatePickerValue,
} from './DatePicker';
import { renderWithTheme } from '../../../test/renderWithTheme';

describe('DatePicker date normalization', () => {
  it('parses YYYY-MM-DD as a local calendar day at noon', () => {
    const parsed = parseDatePickerValue('2026-03-10');

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(10);
    expect(parsed?.getHours()).toBe(12);
  });

  it('round-trips selected local dates without converting through UTC', () => {
    const selected = new Date(2026, 10, 2, 23, 30);

    expect(formatDatePickerValue(selected)).toBe('2026-11-02');
  });

  it('renders the provided date without shifting the displayed day', () => {
    renderWithTheme(
      <DatePicker value="2026-03-10" onChange={vi.fn()} placeholder="Pick a date" />,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Mar 10, 2026');
  });

  it('falls back to the placeholder for invalid dates', () => {
    renderWithTheme(
      <DatePicker value="2026-02-31" onChange={vi.fn()} placeholder="Pick a date" />,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Pick a date');
  });
});
