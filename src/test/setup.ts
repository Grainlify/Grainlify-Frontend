// Vitest global setup for component tests.
// Registers jest-dom matchers (toBeInTheDocument, toHaveFocus, toHaveAttribute…)
// and clears the DOM/mocks between tests so each test starts from a clean slate.
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // `cleanup` touches the DOM, so it is a no-op for node-environment tests.
  if (typeof document !== 'undefined') {
    cleanup();
  }
  vi.clearAllMocks();
});
