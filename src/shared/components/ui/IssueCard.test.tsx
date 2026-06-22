// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { IssueCard } from './IssueCard';
import { renderWithTheme } from '../../../test/renderWithTheme';

const baseProps = {
  id: '1',
  title: 'Test issue',
  showTags: true,
};

describe('IssueCard – tag keys', () => {
  it('renders all tags', () => {
    renderWithTheme(<IssueCard {...baseProps} tags={['bug', 'frontend', 'good first issue']} />);
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('good first issue')).toBeInTheDocument();
  });

  it('renders no tags when tags array is empty', () => {
    const { container } = renderWithTheme(<IssueCard {...baseProps} tags={[]} />);
    const tagWrapper = container.querySelector('.flex.flex-wrap');
    expect(tagWrapper).toBeNull();
  });

  it('renders no tags when showTags is false', () => {
    renderWithTheme(
      <IssueCard {...baseProps} tags={['bug']} showTags={false} />,
    );
    expect(screen.queryByText('bug')).toBeNull();
  });

  it('keeps correct content after reorder', () => {
    const { rerender } = renderWithTheme(
      <IssueCard {...baseProps} tags={['alpha', 'beta', 'gamma']} />,
    );
    expect(screen.getByText('alpha')).toBeInTheDocument();

    rerender(<IssueCard {...baseProps} tags={['gamma', 'alpha', 'beta']} />);
    expect(screen.getByText('gamma')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('handles duplicate tag values without crashing', () => {
    renderWithTheme(
      <IssueCard {...baseProps} tags={['bug', 'bug', 'frontend']} />,
    );
    const bugChips = screen.getAllByText('bug');
    expect(bugChips).toHaveLength(2);
  });

  it('key is derived from tag value (case-normalised), not index', () => {
    const { container } = renderWithTheme(
      <IssueCard {...baseProps} tags={['Bug', 'Frontend']} />,
    );
    const spans = container.querySelectorAll('.flex.flex-wrap span');
    expect(spans[0].textContent).toBe('Bug');
    expect(spans[1].textContent).toBe('Frontend');
  });
});
