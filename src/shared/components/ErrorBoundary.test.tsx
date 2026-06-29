import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import * as loggerModule from '../utils/logger';

// Suppress React's own console.error output for expected throws during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A component that unconditionally throws on render. */
function ThrowingChild({ message = 'test render error' }: { message?: string }) {
  throw new Error(message);
}

/** A component that renders normally. */
function SafeChild() {
  return <p>Safe content</p>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls logger.error with message and componentStack when a child throws', () => {
    const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error');

    render(
      <ErrorBoundary>
        <ThrowingChild message="boom" />
      </ErrorBoundary>
    );

    expect(loggerErrorSpy).toHaveBeenCalledOnce();
    expect(loggerErrorSpy).toHaveBeenCalledWith('ErrorBoundary caught', {
      message: 'boom',
      componentStack: expect.any(String),
    });
  });

  it('does not log the full error object to prevent PII leakage', () => {
    const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error');

    render(
      <ErrorBoundary>
        <ThrowingChild message="sensitive detail" />
      </ErrorBoundary>
    );

    const [, payload] = loggerErrorSpy.mock.calls[0];
    // Only message and componentStack should be present — no full Error instance
    expect(payload).not.toHaveProperty('stack');
    expect(payload).toHaveProperty('message');
    expect(payload).toHaveProperty('componentStack');
  });

  it('shows a Reload Page button in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
  });

  it('shows a Go to Home button in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
  });

  it('clicking Reload Page triggers window.location.reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload Page' }));

    expect(reloadMock).toHaveBeenCalledOnce();
  });
});
