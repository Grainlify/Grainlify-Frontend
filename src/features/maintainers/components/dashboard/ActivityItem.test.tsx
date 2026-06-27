import { render, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import { ActivityItem } from './ActivityItem';

// Mock theme hook to avoid needing full provider
vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

const baseIssueActivity = {
  id: 1,
  type: 'issue',
  number: 42,
  title: 'A sample issue activity',
  label: 'Open',
  timeAgo: '2 hours ago',
};

const basePRActivity = {
  id: 2,
  type: 'pr',
  number: 101,
  title: 'A sample PR activity',
  label: 'Open',
  timeAgo: '1 hour ago',
};

describe('ActivityItem', () => {
  describe('interactivity', () => {
    it('is non-interactive when no onClick is provided', () => {
      const { container } = render(<ActivityItem activity={baseIssueActivity as any} index={0} />);
      const row = container.firstChild as HTMLElement;

      expect(row).not.toHaveAttribute('role');
      expect(row).not.toHaveAttribute('tabindex');
      expect(row).toHaveClass('cursor-default');
      expect(row).not.toHaveClass('cursor-pointer');
    });

    it('is interactive when onClick is provided', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} onClick={handler} />
      );
      const row = container.firstChild as HTMLElement;

      expect(row).toHaveAttribute('role', 'button');
      expect(row).toHaveAttribute('tabindex', '0');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('click handling', () => {
    it('calls onClick when an issue activity row is clicked', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} onClick={handler} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.click(row);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when a PR activity row is clicked', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={basePRActivity as any} index={0} onClick={handler} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.click(row);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when the row is non-interactive', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.click(row);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('keyboard activation', () => {
    it('activates on Enter key press for interactive rows', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} onClick={handler} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.keyDown(row, { key: 'Enter' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('activates on Space key press for interactive rows', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} onClick={handler} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.keyDown(row, { key: ' ' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not activate on Enter/Space for non-interactive rows', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.keyDown(row, { key: 'Enter' });
      fireEvent.keyDown(row, { key: ' ' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not activate on unrelated keys', () => {
      const handler = vi.fn();
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} onClick={handler} />
      );
      const row = container.firstChild as HTMLElement;

      fireEvent.keyDown(row, { key: 'Tab' });
      fireEvent.keyDown(row, { key: 'Escape' });
      fireEvent.keyDown(row, { key: 'a' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('PR-specific rendering', () => {
    it('renders GitPullRequest icon for PR activities', () => {
      const { container } = render(
        <ActivityItem activity={basePRActivity as any} index={0} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('renders Circle icon for issue activities', () => {
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} />
      );
      const circleDiv = container.querySelector('.rounded-full');
      expect(circleDiv).toBeTruthy();
    });

    it('applies correct color class for merged PRs', () => {
      const mergedPR = { ...basePRActivity, label: 'Merged' };
      const { container } = render(
        <ActivityItem activity={mergedPR as any} index={0} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-[#8b5cf6]');
    });

    it('applies correct color class for open PRs', () => {
      const openPR = { ...basePRActivity, label: 'Open' };
      const { container } = render(
        <ActivityItem activity={openPR as any} index={0} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-[#22c55e]');
    });

    it('applies correct color class for closed PRs in dark mode', () => {
      const closedPR = { ...basePRActivity, label: 'Closed' };
      const { container } = render(
        <ActivityItem activity={closedPR as any} index={0} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-[#b8a898]');
    });
  });

  describe('Review button visibility', () => {
    it('shows Review button when row is clickable', () => {
      const handler = vi.fn();
      const { getByText } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} onClick={handler} />
      );
      expect(getByText('Review')).toBeTruthy();
    });

    it('does not show Review button when row is non-clickable', () => {
      const { queryByText } = render(
        <ActivityItem activity={baseIssueActivity as any} index={0} />
      );
      expect(queryByText('Review')).toBeNull();
    });
  });

  describe('animation delay', () => {
    it('applies correct animation delay based on index', () => {
      const { container } = render(
        <ActivityItem activity={baseIssueActivity as any} index={3} />
      );
      const row = container.firstChild as HTMLElement;
      expect(row.style.animationDelay).toBe('240ms');
    });
  });
});