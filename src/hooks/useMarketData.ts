import { useState } from 'react';
import type { MessageKey } from '../i18n';
import type { PriceRow } from '../types';

export interface MarketDataState {
  historicalData: PriceRow[];
  symbols: string[];
  /** CLP per USD on each row's date; null when the rate history could not be loaded */
  fx: number[] | null;
}

/** A user-facing error, translated when rendered. */
export interface AppError {
  key: MessageKey;
  vars?: Record<string, string | number>;
}

class MarketDataError extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.key);
  }
}

export function useMarketData() {
  const [data, setData] = useState<MarketDataState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const fetchData = async (tickers: string[], benchmark: string, horizonYears: number) => {
    if (tickers.length === 0) {
      setError({ key: 'error.selectAsset' });
      return;
    }

    setError(null);
    setIsLoading(true);
    setData(null);

    try {
      const res = await fetch('/api/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, benchmark, horizonYears })
      });

      const resData = await res.json();
      if (resData.error) throw new MarketDataError({ key: 'error.server', vars: { message: resData.error } });

      // Some tickers failing is a warning: the analysis continues with the ones that loaded
      if (resData.failedSymbols && resData.failedSymbols.length > 0) {
        console.warn(`Failed to fetch data for: ${resData.failedSymbols.join(', ')}`);
        setError({ key: 'error.failedSymbols', vars: { symbols: resData.failedSymbols.join(', ') } });
      }

      const historicalData: PriceRow[] = resData.data;
      const symbols: string[] = resData.symbols;
      if (!historicalData || historicalData.length === 0 || symbols.length === 0) {
        throw new MarketDataError({ key: 'error.noData' });
      }

      setData({ historicalData, symbols, fx: Array.isArray(resData.fx) ? resData.fx : null });
    } catch (err) {
      console.error("useMarketData error:", err);
      // fetch() rejects with a TypeError when the server can't be reached at all
      setError(err instanceof MarketDataError ? err.appError : { key: 'error.network' });
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, fetchData, setError };
}
