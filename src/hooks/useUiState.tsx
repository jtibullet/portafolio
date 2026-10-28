import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * App-wide store for view state (expanded panels, selected tickers in charts...).
 * Lives above the tabs so the state survives switching tabs, which unmounts the tab content.
 */
type UiStore = {
  values: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
};

const UiStateContext = createContext<UiStore | null>(null);

export function UiStateProvider({ children }: { children: React.ReactNode }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const set = useCallback((key: string, value: unknown) => setValues(prev => ({ ...prev, [key]: value })), []);
  return <UiStateContext.Provider value={{ values, set }}>{children}</UiStateContext.Provider>;
}

export function useUiState<T>(key: string, defaultValue: T) {
  const store = useContext(UiStateContext);
  if (!store) throw new Error('useUiState must be used inside UiStateProvider');
  const value = (key in store.values ? store.values[key] : defaultValue) as T;
  const setValue = useCallback((next: T) => store.set(key, next), [store.set, key]);
  return [value, setValue] as const;
}

/** Expanded/collapsed state of a panel; returns [open, toggle]. */
export function useCollapsible(key: string, defaultOpen = false) {
  const [open, setOpen] = useUiState(`collapse:${key}`, defaultOpen);
  return [open, () => setOpen(!open)] as const;
}
