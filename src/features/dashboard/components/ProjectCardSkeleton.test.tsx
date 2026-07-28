// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';
import { renderWithTheme } from '../../../test/renderWithTheme';

describe('ProjectCardSkeleton', () => {
  it('renders dark-mode classes when theme is dark', () => {
    renderWithTheme(<ProjectCardSkeleton />, { theme: 'dark' });

    const container = screen.getByTestId('project-card-skeleton');
    expect(container.className).toContain('bg-white/[0.08]');
    expect(container.className).toContain('border-white/15');
  });

  it('renders light-mode classes when theme is light', () => {
    renderWithTheme(<ProjectCardSkeleton />, { theme: 'light' });

    const container = screen.getByTestId('project-card-skeleton');
    expect(container.className).toContain('bg-white/[0.15]');
    expect(container.className).toContain('border-white/25');
  });

  it('renders the structural sections: icon, title, description, stars, stats grid, tags', () => {
    const { container } = renderWithTheme(<ProjectCardSkeleton />);

    // Icon skeleton (w-11 h-11 rounded-[12px])
    const icon = container.querySelector('.w-11.h-11.rounded-\\[12px\\]');
    expect(icon).toBeInTheDocument();

    // Title skeleton (h-5 w-3/4)
    const title = container.querySelector('.h-5');
    expect(title).toBeInTheDocument();

    // Description line 1 (h-3 w-full)
    const descLine1 = container.querySelector('.h-3.w-full');
    expect(descLine1).toBeInTheDocument();

    // Stars/forks row
    const starsRow = container.querySelector('.space-x-3');
    expect(starsRow).toBeInTheDocument();

    // Stats grid with 3 columns
    const grid = container.querySelector('.grid-cols-3');
    expect(grid).toBeInTheDocument();
    const statValues = grid?.querySelectorAll('.h-6.w-8');
    expect(statValues?.length).toBe(3);

    // Tags row with 3 tag placeholders
    const tags = container.querySelectorAll('.rounded-\\[8px\\]');
    expect(tags.length).toBe(3);
  });
});