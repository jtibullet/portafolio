import { useState } from 'react';
import { DEFAULT_TICKERS, MAX_ASSETS } from '../constants';
import type { PortfolioParams, WeightBounds } from '../types';

/** The user's analysis inputs: assets, benchmark, horizon, risk-free rate, ARIMA toggle and weight bounds. */
export function usePortfolioParams() {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [selectedBenchmark, setSelectedBenchmark] = useState('ACWI');
  const [horizonYears, setHorizonYears] = useState(5);
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);
  const [useArimaForecast, setUseArimaForecast] = useState(false);
  const [minWeights, setMinWeights] = useState<WeightBounds>({});
  const [maxWeights, setMaxWeights] = useState<WeightBounds>({});

  /** Adds a ticker (uppercased); empty or duplicate input is ignored. */
  const addTicker = (ticker: string): 'added' | 'limit' | 'ignored' => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol || selectedTickers.includes(symbol)) return 'ignored';
    if (selectedTickers.length >= MAX_ASSETS) return 'limit';
    setSelectedTickers([...selectedTickers, symbol]);
    return 'added';
  };

  const removeTicker = (ticker: string) => setSelectedTickers(selectedTickers.filter(t => t !== ticker));

  const params: PortfolioParams = {
    selectedTickers, selectedBenchmark, horizonYears, riskFreeRate, useArimaForecast, minWeights, maxWeights,
  };

  return {
    params,
    setSelectedTickers, setSelectedBenchmark, setHorizonYears, setRiskFreeRate, setUseArimaForecast,
    setMinWeights, setMaxWeights, addTicker, removeTicker,
  };
}

export type PortfolioParamsControls = ReturnType<typeof usePortfolioParams>;
