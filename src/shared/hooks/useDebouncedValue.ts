import { useState, useEffect } from 'react';

/**
 * A custom hook that returns a debounced value.
 * @param value The value to debounce (e.g., input string).
 * @param delay The delay in milliseconds (defaults to 300ms).
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
