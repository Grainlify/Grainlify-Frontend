// Vitest global setup for component tests.
// Registers jest-dom matchers (toBeInTheDocument, toHaveFocus, toHaveAttribute…)
// and clears the DOM/mocks between tests so each test starts from a clean slate.
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement matchMedia. Components that read media queries
// (e.g. SkeletonLoader's prefers-reduced-motion check) crash without it, so
// provide a default non-matching stub for any component test that mounts them.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

afterEach(() => {
  // `cleanup` touches the DOM, so it is a no-op for node-environment tests.
  if (typeof document !== 'undefined') {
    cleanup();
  }
  vi.clearAllMocks();
});

