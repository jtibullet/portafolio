import { useEffect, useState } from 'react';

/** useState backed by localStorage. Falls back to the default when storage is empty, invalid or blocked. */
export function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
    } catch (e) {}
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }, [key, value]);

  return [value, setValue] as const;
}
