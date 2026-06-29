// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
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
    const row = screen.getByRole('button');
    expect(row).toHaveAttribute('tabIndex', '0');
  });

  it('handles click events', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithTheme(<PRRow pr={mockPR} />);

    const row = screen.getByRole('button');
    fireEvent.click(row);

    expect(windowOpenSpy).toHaveBeenCalledWith(mockPR.url, '_blank', 'noopener,noreferrer');
    windowOpenSpy.mockRestore();
  });

  it('handles keyboard events (Enter and Space)', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithTheme(<PRRow pr={mockPR} />);

    const row = screen.getByRole('button');

    // Enter key
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);

    // Space key
    fireEvent.keyDown(row, { key: ' ' });
    expect(windowOpenSpy).toHaveBeenCalledTimes(2);

    windowOpenSpy.mockRestore();
  });
});
