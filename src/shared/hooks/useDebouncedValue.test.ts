import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates based on specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('second');
  });

  it('should cancel previous timers and only resolve the latest value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(150); });
    
    rerender({ value: 'abc' });
    act(() => { vi.advanceTimersByTime(150); }); 
    expect(result.current).toBe('a'); // 'ab' was cancelled/skipped

    act(() => { vi.advanceTimersByTime(150); }); 
    expect(result.current).toBe('abc'); // The latest one wins
  });
});
