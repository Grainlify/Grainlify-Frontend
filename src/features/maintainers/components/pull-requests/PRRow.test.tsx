// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { PRRow } from './PRRow';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import { PullRequest } from '../../types';

const mockPR: PullRequest = {
  id: 1,
  number: 123,
  title: 'Test PR',
  status: 'open',
  statusDetail: 'opened 2 days ago',
  author: {
    name: 'test-author',
    avatar: '',
    badges: [],
  },
  repo: 'test-repo',
  org: 'test-org',
  indicators: ['check', 'x', 'trophy', 'eye', 'code'],
  url: 'https://github.com/test-org/test-repo/pull/123',
};

describe('PRRow Accessibility', () => {
  it('renders indicators with correct aria-labels and roles', () => {
    renderWithTheme(<PRRow pr={mockPR} />);

    expect(screen.getByLabelText('CI Checks Passed')).toHaveAttribute('role', 'img');
    expect(screen.getByLabelText('CI Checks Failed')).toHaveAttribute('role', 'img');
    expect(screen.getByLabelText('Top Contributor')).toHaveAttribute('role', 'img');
    expect(screen.getByLabelText('Under Review')).toHaveAttribute('role', 'img');
    expect(screen.getByLabelText('Code Quality')).toHaveAttribute('role', 'img');
  });

  it('marks decorative icons as aria-hidden', () => {
    const { container } = renderWithTheme(<PRRow pr={mockPR} />);

    // GitPullRequest icon
    const prIcon = container.querySelector('svg.lucide-git-pull-request');
    expect(prIcon).toHaveAttribute('aria-hidden', 'true');

    // Icons inside indicators
    const indicatorIcons = container.querySelectorAll('.w-7.h-7.rounded-full.border svg');
    indicatorIcons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('has button semantics and is focusable', () => {
    renderWithTheme(<PRRow pr={mockPR} />);
    const rows = screen.getAllByRole('button');
    const row = rows.find((r) => r.tagName === 'TR');
    expect(row).toHaveAttribute('tabIndex', '0');
  });

  it('handles click events', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithTheme(<PRRow pr={mockPR} />);

    const rows = screen.getAllByRole('button');
    const row = rows.find((r) => r.tagName === 'TR');
    fireEvent.click(row!);

    expect(windowOpenSpy).toHaveBeenCalledWith(mockPR.url, '_blank', 'noopener,noreferrer');
    windowOpenSpy.mockRestore();
  });

  it('handles keyboard events (Enter and Space)', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithTheme(<PRRow pr={mockPR} />);

    const rows = screen.getAllByRole('button');
    const row = rows.find((r) => r.tagName === 'TR');

    // Enter key
    fireEvent.keyDown(row!, { key: 'Enter' });
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);

    // Space key
    fireEvent.keyDown(row!, { key: ' ' });
    expect(windowOpenSpy).toHaveBeenCalledTimes(2);

    windowOpenSpy.mockRestore();
  });
});

describe('PRRow Merge Action', () => {
  it('renders a merge button for open PRs when onMerge is provided', () => {
    renderWithTheme(<PRRow pr={mockPR} onMerge={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Merge PR #123/i })).toBeInTheDocument();
  });

  it('does not render a merge button when onMerge is not provided', () => {
    renderWithTheme(<PRRow pr={mockPR} />);
    expect(screen.queryByRole('button', { name: /Merge PR #123/i })).not.toBeInTheDocument();
  });

  it('does not render a merge button for merged PRs', () => {
    const mergedPR: PullRequest = { ...mockPR, status: 'merged' };
    renderWithTheme(<PRRow pr={mergedPR} onMerge={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Merge PR #123/i })).not.toBeInTheDocument();
  });

  it('does not render a merge button for closed PRs', () => {
    const closedPR: PullRequest = { ...mockPR, status: 'closed' };
    renderWithTheme(<PRRow pr={closedPR} onMerge={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Merge PR #123/i })).not.toBeInTheDocument();
  });

  it('calls onMerge when the merge button is clicked', () => {
    const onMerge = vi.fn();
    renderWithTheme(<PRRow pr={mockPR} onMerge={onMerge} />);

    const mergeButton = screen.getByRole('button', { name: /Merge PR #123/i });
    fireEvent.click(mergeButton);

    expect(onMerge).toHaveBeenCalledTimes(1);
    expect(onMerge).toHaveBeenCalledWith(mockPR);
  });

  it('disables the merge button and shows a spinner when isProcessing is true', () => {
    renderWithTheme(<PRRow pr={mockPR} onMerge={vi.fn()} isProcessing={true} />);

    const mergeButton = screen.getByRole('button', { name: /Merge PR #123/i });
    expect(mergeButton).toBeDisabled();
    expect(mergeButton).toHaveAttribute('aria-busy', 'true');

    // Should show the spinner (Loader2 with animate-spin)
    const spinner = mergeButton.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not call onMerge when isProcessing is true', () => {
    const onMerge = vi.fn();
    renderWithTheme(<PRRow pr={mockPR} onMerge={onMerge} isProcessing={true} />);

    const mergeButton = screen.getByRole('button', { name: /Merge PR #123/i });
    fireEvent.click(mergeButton);

    expect(onMerge).not.toHaveBeenCalled();
  });

  it('does not open the PR URL when clicking the row while isProcessing is true', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithTheme(<PRRow pr={mockPR} onMerge={vi.fn()} isProcessing={true} />);

    // The row has role="button", target it specifically
    const rows = screen.getAllByRole('button');
    const row = rows.find((r) => r.tagName === 'TR');
    expect(row).toBeDefined();
    fireEvent.click(row!);

    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it('stops propagation when clicking the merge button to avoid row click', () => {
    const onMerge = vi.fn();
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithTheme(<PRRow pr={mockPR} onMerge={onMerge} />);

    const mergeButton = screen.getByRole('button', { name: /Merge PR #123/i });
    fireEvent.click(mergeButton);

    // The row click handler should NOT have fired
    expect(windowOpenSpy).not.toHaveBeenCalled();
    // But the merge handler should have fired
    expect(onMerge).toHaveBeenCalledTimes(1);

    windowOpenSpy.mockRestore();
  });
});