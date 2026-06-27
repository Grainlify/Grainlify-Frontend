import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_QUERY_MAX_LENGTH, SearchPage } from './SearchPage';

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

function renderSearchPage() {
  return render(
    <SearchPage
      onBack={vi.fn()}
      onIssueClick={vi.fn()}
      onProjectClick={vi.fn()}
      onContributorClick={vi.fn()}
    />
  );
}

function searchInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Search issues, projects, contributors...');
}

async function settleDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
}

describe('SearchPage query limits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enforces the maxLength attribute and clamps pasted values in state', () => {
    renderSearchPage();
    const input = searchInput();
    const oversizedQuery = 'x'.repeat(SEARCH_QUERY_MAX_LENGTH + 25);

    fireEvent.change(input, { target: { value: oversizedQuery } });

    expect(input).toHaveAttribute('maxLength', String(SEARCH_QUERY_MAX_LENGTH));
    expect(input.value).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
    expect(input.value).toBe('x'.repeat(SEARCH_QUERY_MAX_LENGTH));
    expect(screen.getByText('Search limit reached.')).toBeInTheDocument();
  });

  it('announces remaining characters as the query approaches the limit', () => {
    renderSearchPage();
    const input = searchInput();

    fireEvent.change(input, { target: { value: 'x'.repeat(SEARCH_QUERY_MAX_LENGTH - 5) } });

    expect(screen.getByText('5 characters remaining.')).toBeInTheDocument();
    expect(screen.getByText('5 characters remaining.')).toHaveAttribute('aria-live', 'polite');
  });

  it('trims leading and trailing whitespace before running the debounced search', async () => {
    renderSearchPage();

    fireEvent.change(searchInput(), { target: { value: '  React  ' } });
    await settleDebounce();

    expect(screen.getByText('Add dark mode support')).toBeInTheDocument();
    expect(screen.getByText(/Search Results/)).toBeInTheDocument();
  });

  it('treats whitespace-only input as an empty search', async () => {
    renderSearchPage();

    fireEvent.change(searchInput(), { target: { value: '     ' } });
    await settleDebounce();

    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    expect(screen.getByText('Search suggestions')).toBeInTheDocument();
  });
});
