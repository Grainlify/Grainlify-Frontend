// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { IssueCard } from './IssueCard';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import type { Issue } from '../../types';

const baseIssue: Issue = {
  id: '1',
  title: 'Test Issue',
  repo: 'test/repo',
  comments: 5,
  applicants: 2,
  tags: ['bug', 'frontend'],
  user: 'testuser',
  timeAgo: '2 days ago',
  applicationStatus: 'none',
};

describe('IssueCard – avatar fallback', () => {
  it('renders the avatar image when loaded successfully', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    const img = screen.getByAltText('testuser') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('github.com/testuser.png');
  });

  it('shows initials fallback when image fails to load', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    const img = screen.getByAltText('testuser') as HTMLImageElement;
    fireEvent.error(img);
    // After the error, the initials should be visible
    const initials = screen.getByText('TE');
    expect(initials).toBeInTheDocument();
  });

  it('resets to image when issue.user changes after a prior failure', () => {
    const { rerender } = renderWithTheme(
      <IssueCard issue={baseIssue} index={0} onClick={() => {}} />,
    );
    // Trigger image failure
    const img = screen.getByAltText('testuser') as HTMLImageElement;
    fireEvent.error(img);
    expect(screen.getByText('TE')).toBeInTheDocument();

    // Change user
    const updatedIssue = { ...baseIssue, user: 'newuser' };
    rerender(<IssueCard issue={updatedIssue} index={0} onClick={() => {}} />);
    // After user change, should show the image again (reset state)
    const newImg = screen.getByAltText('newuser') as HTMLImageElement;
    expect(newImg).toBeInTheDocument();
    expect(newImg.src).toContain('github.com/newuser.png');
  });

  it('renders correct initials for different usernames', () => {
    const issues = [
      { ...baseIssue, user: 'alice' },
      { ...baseIssue, user: 'bob' },
      { ...baseIssue, user: 'charlie' },
    ];
    issues.forEach((issue) => {
      const { unmount } = renderWithTheme(
        <IssueCard issue={issue} index={0} onClick={() => {}} />,
      );
      const img = screen.getByAltText(issue.user) as HTMLImageElement;
      fireEvent.error(img);
      expect(screen.getByText(issue.user.substring(0, 2).toUpperCase())).toBeInTheDocument();
      unmount();
    });
  });
});

describe('IssueCard – basic rendering', () => {
  it('renders issue title and repo', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(screen.getByText('test/repo')).toBeInTheDocument();
  });

  it('renders comment count', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders applicant count with correct pluralization', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    expect(screen.getByText('2 applicants')).toBeInTheDocument();

    const singleIssue = { ...baseIssue, applicants: 1 };
    const { unmount } = renderWithTheme(
      <IssueCard issue={singleIssue} index={0} onClick={() => {}} />,
    );
    expect(screen.getByText('1 applicant')).toBeInTheDocument();
    unmount();
  });

  it('renders the username and timeAgo', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('2 days ago')).toBeInTheDocument();
  });

  it('renders tags', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('renders issue number', () => {
    renderWithTheme(<IssueCard issue={baseIssue} index={0} onClick={() => {}} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('handles empty tags gracefully', () => {
    const noTags = { ...baseIssue, tags: [] };
    const { container } = renderWithTheme(
      <IssueCard issue={noTags} index={0} onClick={() => {}} />,
    );
    const tagContainers = container.querySelectorAll('.flex.flex-wrap');
    // Should not render a tag section
    expect(tagContainers.length).toBe(0);
  });
});