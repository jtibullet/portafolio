import { useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState';

export type ThemePreference = 'light' | 'dark' | 'system';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Light/dark theme with a "system" option that follows the OS. Applies the `dark` class on <html>;
 * index.html applies the saved choice before React loads so the page doesn't flash.
 */
export function useTheme() {
  const [preference, setPreference] = usePersistentState<ThemePreference>('theme', 'system');
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);

  useEffect(() => {
    const query = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isDark = preference === 'dark' || (preference === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    // Always print on white paper
    const beforePrint = () => root.classList.remove('dark');
    const afterPrint = () => root.classList.toggle('dark', isDark);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [isDark]);

  return { preference, setPreference, isDark };
}
