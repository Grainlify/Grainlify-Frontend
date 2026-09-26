import { configure } from '@testing-library/react';

// Testing Library waits one second by default. Nearly every findBy in this
// suite is waiting on a mocked fetch plus a re-render, which is comfortably
// under a second on a warm dev machine and is not on a cold CI runner. That
// gap made contributorPath.test.tsx fail in CI while passing locally five runs
// out of five -- and it failed on a commit with no source change at all, which
// is what proved it was the clock and not the code.
//
// Raising the ceiling does not slow a passing test down: findBy polls and
// resolves as soon as the element appears. It only changes how long a genuinely
// slow render is given before it is called a failure.
configure({ asyncUtilTimeout: 5000 });

import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
}

// jsdom does not implement matchMedia. useThemeToggleAnimation and any
// prefers-reduced-motion check crash without it.
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
  })
}

// jsdom does not implement IntersectionObserver. motion/react's whileInView
// (used for scroll-reveal animations) crashes without it; the callback never
// needs to fire in tests since assertions read text content, not CSS state.
if (typeof window !== 'undefined' && typeof window.IntersectionObserver !== 'function') {
  class IntersectionObserverMock {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  })
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.clearAllMocks()
})
