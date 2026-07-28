// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { PRRowSkeleton } from './PRRowSkeleton';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('PRRowSkeleton – theme support', () => {
  it('renders light-mode classes when theme is light', () => {
    const { container } = renderWithTheme(<PRRowSkeleton />, { theme: 'light' });
    const tr = container.querySelector('tr') as HTMLElement;
    expect(tr.className).toContain('bg-white/[0.15]');
    expect(tr.className).toContain('border-white/25');
  });

  it('renders dark-mode classes when theme is dark', () => {
    const { container } = renderWithTheme(<PRRowSkeleton />, { theme: 'dark' });
    const tr = container.querySelector('tr') as HTMLElement;
    expect(tr.className).toContain('bg-white/[0.08]');
    expect(tr.className).toContain('border-white/15');
  });

  it('renders skeleton elements', () => {
    const { container } = renderWithTheme(<PRRowSkeleton />);
    // The skeleton should render structural elements
    expect(container.querySelector('tr')).toBeTruthy();
    // Should render skeleton cells
    expect(screen.getByRole('row')).toBeInTheDocument();
    // Should render the four cell columns
    const cells = container.querySelectorAll('td[role="cell"]');
    expect(cells.length).toBe(4);
  });
});