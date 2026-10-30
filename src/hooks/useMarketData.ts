import { useState } from 'react';
import { calculateLogReturns } from '../utils/quantMath';
import type { MessageKey } from '../i18n';
import type { PriceRow } from '../types';

export interface MarketDataState {
  historicalData: PriceRow[];
  symbols: string[];
  pricesBySymbol: Record<string, (number | null)[]>;
  returnsBySymbol: Record<string, (number | null)[]>;
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

      const pricesBySymbol: Record<string, (number | null)[]> = {};
      const returnsBySymbol: Record<string, (number | null)[]> = {};
      for (const sym of symbols) {
        // Missing prices stay null so statistics can use pairwise deletion
        pricesBySymbol[sym] = historicalData.map(row => row[sym] === null || row[sym] === undefined ? null : Number(row[sym]));
        returnsBySymbol[sym] = calculateLogReturns(pricesBySymbol[sym]);
      }

      setData({ historicalData, symbols, pricesBySymbol, returnsBySymbol });
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
