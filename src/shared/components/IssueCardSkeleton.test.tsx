// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { IssueCardSkeleton } from './IssueCardSkeleton';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('IssueCardSkeleton – theme support', () => {
  it('renders light-mode classes when theme is light', () => {
    const { container } = renderWithTheme(<IssueCardSkeleton />, { theme: 'light' });
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('bg-white/[0.15]');
    expect(outerDiv.className).toContain('border-white/25');
  });

  it('renders dark-mode classes when theme is dark', () => {
    const { container } = renderWithTheme(<IssueCardSkeleton />, { theme: 'dark' });
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('bg-white/[0.08]');
    expect(outerDiv.className).toContain('border-white/10');
  });

  it('renders skeleton elements', () => {
    const { container } = renderWithTheme(<IssueCardSkeleton />);
    // The skeleton should render structural elements
    expect(container.querySelector('.backdrop-blur-\\[25px\\]')).toBeTruthy();
  });
});