import { useEffect, useState } from 'react';

/** The value, updated only after it has stopped changing for `delayMs` (e.g. while a slider is dragged). */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
