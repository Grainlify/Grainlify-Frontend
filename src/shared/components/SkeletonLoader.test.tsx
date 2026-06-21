// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { SkeletonLoader } from './SkeletonLoader';
import { renderWithTheme } from '../../test/renderWithTheme';

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('SkeletonLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the shimmer layer for the default loading state', () => {
    mockReducedMotion(false);
    renderWithTheme(<SkeletonLoader />);

    expect(screen.getByTestId('skeleton-shimmer')).toHaveClass('animate-shimmer');
  });

  it('renders a static shimmer layer when reduced motion is preferred', () => {
    mockReducedMotion(true);
    renderWithTheme(<SkeletonLoader />);

    expect(screen.getByTestId('skeleton-shimmer')).not.toHaveClass('animate-shimmer');
    expect(screen.getByTestId('skeleton-shimmer')).toHaveClass('translate-x-0');
  });

  it('keeps the shimmer layer in dark theme', () => {
    mockReducedMotion(false);
    renderWithTheme(<SkeletonLoader />, { theme: 'dark' });

    expect(screen.getByTestId('skeleton-shimmer')).toHaveClass('via-white/[0.15]');
  });
});
