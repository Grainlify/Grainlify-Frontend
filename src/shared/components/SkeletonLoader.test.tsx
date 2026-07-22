// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { SkeletonLoader } from './SkeletonLoader';
import { renderWithTheme } from '../../test/renderWithTheme';

function makeMql(matches: boolean) {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

function mockMatchMedia(matches: boolean) {
  const mql = makeMql(matches);
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return mql;
}

describe('SkeletonLoader', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  // --- reduced-motion (required by issue #96) ---

  it('renders animate-shimmer when prefers-reduced-motion is not active', () => {
    const { container } = renderWithTheme(<SkeletonLoader />);
    expect(container.querySelector('.absolute.inset-0')).toHaveClass('animate-shimmer');
  });

  it('omits animate-shimmer when prefers-reduced-motion: reduce is active', () => {
    mockMatchMedia(true);
    const { container } = renderWithTheme(<SkeletonLoader />);
    expect(container.querySelector('.absolute.inset-0')).not.toHaveClass('animate-shimmer');
  });

  it('removes animate-shimmer when OS preference changes to reduce at runtime', async () => {
    const mql = mockMatchMedia(false);
    const { container } = renderWithTheme(<SkeletonLoader />);

    expect(container.querySelector('.absolute.inset-0')).toHaveClass('animate-shimmer');

    const [, handler] = (mql.addEventListener as ReturnType<typeof vi.fn>).mock.calls[0];
    await act(async () => {
      handler({ matches: true } as MediaQueryListEvent);
    });

    expect(container.querySelector('.absolute.inset-0')).not.toHaveClass('animate-shimmer');
  });

  // --- variants ---

  it('applies rounded-full for circle variant', () => {
    const { container } = renderWithTheme(<SkeletonLoader variant="circle" />);
    expect(container.firstElementChild).toHaveClass('rounded-full');
  });

  it('applies rounded-[100px] for text variant', () => {
    const { container } = renderWithTheme(<SkeletonLoader variant="text" />);
    expect(container.firstElementChild).toHaveClass('rounded-[100px]');
  });

  it('applies rounded-[12px] for the default variant', () => {
    const { container } = renderWithTheme(<SkeletonLoader />);
    expect(container.firstElementChild).toHaveClass('rounded-[12px]');
  });

  // --- theme ---

  it('uses dark background in dark mode', () => {
    const { container } = renderWithTheme(<SkeletonLoader />, { theme: 'dark' });
    expect(container.firstElementChild).toHaveClass('bg-white/[0.08]');
  });

  it('uses light background in light mode', () => {
    const { container } = renderWithTheme(<SkeletonLoader />);
    expect(container.firstElementChild).toHaveClass('bg-white/[0.12]');
  });

  // --- style props ---

  it('applies custom width and height via inline style', () => {
    const { container } = renderWithTheme(<SkeletonLoader width="200px" height="50px" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('50px');
  });

  it('forwards className to the container element', () => {
    const { container } = renderWithTheme(<SkeletonLoader className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});
