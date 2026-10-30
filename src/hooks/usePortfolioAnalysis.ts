import { useEffect, useState } from 'react';
import { prepareAnalysis, optimizePreparedAnalysis } from '../engine/portfolioAnalysis';
import { runBlackLittermanAnalysis } from '../engine/blackLittermanAnalysis';
import { buildRecommendations } from '../engine/recommendations';
import { runMonteCarlo, type MonteCarloResult } from '../monteCarlo';
import type { ARIMA_Forecast, AlphaSignalResult } from '../utils/quantMath';
import type { MarketDataState } from './useMarketData';
import { useI18n } from '../i18n';
import type {
  BlackLittermanStats, InvestorView, OptimizationFailure, PortfolioParams, QuantStats, Recommendations, SavedPortfolio,
} from '../types';

/**
 * Core analysis: statistics, ARIMA forecasts, momentum signals and the Max-Sharpe portfolio.
 * Re-runs whenever the market data or the parameters change; a superseded run's result is dropped.
 */
export function usePortfolioAnalysis(marketData: MarketDataState | null, params: PortfolioParams) {
  const [quantStats, setQuantStats] = useState<QuantStats | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<OptimizationFailure | null>(null);
  const [arimaForecasts, setArimaForecasts] = useState<Record<string, ARIMA_Forecast>>({});
  const [alphaSignals, setAlphaSignals] = useState<Record<string, AlphaSignalResult>>({});
  const { selectedTickers, selectedBenchmark, riskFreeRate, useArimaForecast, minWeights, maxWeights } = params;

  useEffect(() => {
    const historicalData = marketData?.historicalData;
    const symbols = marketData?.symbols || [];
    const prepared = historicalData && historicalData.length > 0 && symbols.length > 0
      ? prepareAnalysis({ historicalData, symbols, selectedTickers, selectedBenchmark, riskFreeRate, useArimaForecast, minWeights, maxWeights })
      : null;

    if (!prepared) {
      setQuantStats(null);
      setOptimizationError(null);
      setIsOptimizing(false);
      return;
    }

    let cancelled = false;
    setIsOptimizing(true);
    setArimaForecasts(prepared.arimaForecasts);
    setAlphaSignals(prepared.alphaSignals);

    optimizePreparedAnalysis(prepared, riskFreeRate, minWeights, maxWeights).then(result => {
      // A newer run superseded this one; drop the stale result
      if (cancelled) return;
      setOptimizationError(result.optimizationError);
      setQuantStats(result.quantStats);
      setIsOptimizing(false);
    });
    return () => { cancelled = true; };
  }, [marketData, riskFreeRate, selectedTickers, selectedBenchmark, useArimaForecast, maxWeights, minWeights]);

  return { quantStats, isOptimizing, optimizationError, arimaForecasts, alphaSignals };
}

/** Black-Litterman views per asset; new assets start with their historical return at 50% confidence. */
export function useInvestorViews(quantStats: QuantStats | null) {
  const [views, setViews] = useState<Record<string, InvestorView>>({});

  useEffect(() => {
    if (!quantStats) return;
    setViews(prev => {
      const next = { ...prev };
      let changed = false;
      quantStats.matrixSymbols.forEach((sym, i) => {
        if (!next[sym]) {
          next[sym] = { view: quantStats.assetStats[i].annReturn, conf: 0.5 };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [quantStats]);

  return [views, setViews] as const;
}

export function useBlackLitterman(
  quantStats: QuantStats | null,
  views: Record<string, InvestorView>,
  marketData: MarketDataState | null,
  params: PortfolioParams,
) {
  const [blStats, setBlStats] = useState<BlackLittermanStats | null>(null);
  const { selectedBenchmark, riskFreeRate, minWeights, maxWeights } = params;
  const historicalData = marketData?.historicalData || null;

  useEffect(() => {
    if (!quantStats || Object.keys(views).length === 0 || !historicalData) return;
    let cancelled = false;
    runBlackLittermanAnalysis({ quantStats, views, historicalData, benchmark: selectedBenchmark, riskFreeRate, minWeights, maxWeights })
      .then(result => { if (!cancelled) setBlStats(result); })
      .catch(err => console.log("BL Error", err));
    return () => { cancelled = true; };
  }, [quantStats, views, riskFreeRate, historicalData, selectedBenchmark, maxWeights, minWeights]);

  return blStats;
}

/** Monte Carlo projection of the optimal portfolio; only computed while its tab is visible. */
export function useMonteCarlo(enabled: boolean, quantStats: QuantStats | null, years: number, initialAmount: number) {
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);

  useEffect(() => {
    const optimal = quantStats?.optimization?.optimal;
    if (!enabled || !optimal) return;
    let cancelled = false;
    setMcResult(null);
    runMonteCarlo(initialAmount, optimal.expectedReturn, optimal.volatility, years)
      .then(result => { if (!cancelled) setMcResult(result); });
    return () => { cancelled = true; };
  }, [enabled, quantStats, years, initialAmount]);

  return mcResult;
}

export function useRecommendations(quantStats: QuantStats | null, riskFreeRate: number, selectedTickers: string[]) {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const portDailyReturns = quantStats?.portDailyReturns;
  const dates = quantStats?.dates;

  useEffect(() => {
    if (!portDailyReturns || portDailyReturns.length === 0 || !dates) return;

    async function fetchRecommendations() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/recommendations");
        const data = await res.json();
        if (data.candidates && data.candidates.length > 0) {
          setRecommendations(buildRecommendations(data.candidates, dates!, portDailyReturns!, riskFreeRate, selectedTickers));
        }
      } catch (e) {
        console.error("Recommendations error", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecommendations();
  }, [portDailyReturns, dates, riskFreeRate, selectedTickers]);

  return { recommendations, isLoading };
}

export function useSavedPortfolios() {
  const { t } = useI18n();
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const res = await fetch('/api/portfolios');
    const data = await res.json();
    if (data.portfolios) setSavedPortfolios(data.portfolios);
  };

  useEffect(() => {
    refresh().catch(err => console.error('Failed to fetch portfolios', err));
  }, []);

  const savePortfolio = async (quantStats: QuantStats, riskFreeRate: number) => {
    if (!quantStats.optimization) return;
    const { optimal } = quantStats.optimization;
    setSaving(true);
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: quantStats.matrixSymbols,
          riskFreeRate,
          expectedReturn: optimal.expectedReturn,
          volatility: optimal.volatility,
          sharpeRatio: optimal.sharpeRatio,
          weights: optimal.weights
        })
      });
      if (res.ok) {
        alert(t('save.ok'));
        await refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ? t('save.failedWith', { error: data.error }) : t('save.failed'));
      }
    } catch (err) {
      console.error('Failed to save portfolio', err);
      alert(t('save.failed'));
    } finally {
      setSaving(false);
    }
  };

  return { savedPortfolios, saving, savePortfolio };
}
