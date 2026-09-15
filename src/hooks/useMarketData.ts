import { useState } from 'react';
import { calculateLogReturns } from '../utils/quantMath';

export interface MarketDataState {
  historicalData: any[];
  symbols: string[];
  pricesBySymbol: Record<string, (number | null)[]>;
  returnsBySymbol: Record<string, (number | null)[]>;
}

export function useMarketData() {
  const [data, setData] = useState<MarketDataState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (tickers: string[], benchmark: string, horizonYears: number) => {
    if (tickers.length === 0) {
      setError("Please select at least one asset in the sidebar.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setData(null);

    try {
      const res = await fetch('/api/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers,
          benchmark,
          horizonYears
        })
      });

      const resData = await res.json();
      
      if (resData.error) throw new Error(resData.error);
      
      if (resData.failedSymbols && resData.failedSymbols.length > 0) {
        console.warn(`Failed to fetch data for: ${resData.failedSymbols.join(', ')}`);
        setError(`Failed to fetch data for: ${resData.failedSymbols.join(', ')}`);
      }

      const historicalData = resData.data;
      const symbols = resData.symbols;

      if (!historicalData || historicalData.length === 0 || symbols.length === 0) {
        throw new Error("No data returned from the API.");
      }

      const pricesBySymbol: Record<string, (number | null)[]> = {};
      const returnsBySymbol: Record<string, (number | null)[]> = {};

      for (const sym of symbols) {
        // Ensure missing prices are preserved as null for pairwise deletion
        pricesBySymbol[sym] = historicalData.map((row: any) => row[sym] === null || row[sym] === undefined ? null : Number(row[sym]));
        returnsBySymbol[sym] = calculateLogReturns(pricesBySymbol[sym]);
      }

      setData({
        historicalData,
        symbols,
        pricesBySymbol,
        returnsBySymbol
      });

    } catch (err: any) {
      setError(err.message || "Failed to load historical data. Please check the tickers and try again.");
      console.error("useMarketData error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, fetchData, setError };
}
