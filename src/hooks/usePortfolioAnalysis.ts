import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildRecommendations } from '../engine/recommendations';
import { runJob } from '../worker/client';
import { useDebouncedValue } from './useDebouncedValue';
import type { MonteCarloResult } from '../monteCarlo';
import type { ARIMA_Forecast, AlphaSignalResult } from '../utils/quantMath';
import type { MarketDataState } from './useMarketData';
import { useI18n } from '../i18n';
import type {
  AssetMetadata, BlackLittermanStats, InvestorView, OptimizationFailure, PortfolioParams, QuantStats, Recommendations, SavedPortfolio,
} from '../types';

/** Wait this long after the last slider/input change before recomputing */
const INPUT_DEBOUNCE_MS = 250;

/**
 * Core analysis: statistics, ARIMA forecasts, momentum signals and the Max-Sharpe portfolio,
 * computed in the analysis worker. Re-runs when the market data or the parameters change;
 * a superseded run's result is dropped.
 */
export function usePortfolioAnalysis(marketData: MarketDataState | null, params: PortfolioParams) {
  const [quantStats, setQuantStats] = useState<QuantStats | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<OptimizationFailure | null>(null);
  const [arimaForecasts, setArimaForecasts] = useState<Record<string, ARIMA_Forecast>>({});
  const [alphaSignals, setAlphaSignals] = useState<Record<string, AlphaSignalResult>>({});
  const { selectedTickers, selectedBenchmark, riskFreeRate, useArimaForecast, minWeights, maxWeights, objective, covarianceMethod } = params;
  const inputs = useDebouncedValue(
    useMemo(() => ({ selectedTickers, selectedBenchmark, riskFreeRate, useArimaForecast, minWeights, maxWeights, objective, covarianceMethod }),
      [selectedTickers, selectedBenchmark, riskFreeRate, useArimaForecast, minWeights, maxWeights, objective, covarianceMethod]),
    INPUT_DEBOUNCE_MS,
  );

  useEffect(() => {
    const historicalData = marketData?.historicalData;
    const symbols = marketData?.symbols || [];
    if (!historicalData || historicalData.length === 0 || symbols.length === 0) {
      setQuantStats(null);
      setOptimizationError(null);
      setIsOptimizing(false);
      return;
    }

    let cancelled = false;
    setIsOptimizing(true);
    runJob('analyze', { historicalData, symbols, ...inputs })
      .then(result => {
        // A newer run superseded this one; drop the stale result
        if (cancelled) return;
        setQuantStats(result?.quantStats ?? null);
        setOptimizationError(result?.optimizationError ?? null);
        setArimaForecasts(result?.arimaForecasts ?? {});
        setAlphaSignals(result?.alphaSignals ?? {});
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Analysis failed', err);
        setOptimizationError({ code: 'generic' });
      })
      .finally(() => { if (!cancelled) setIsOptimizing(false); });
    return () => { cancelled = true; };
  }, [marketData, inputs]);

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
  metadata: AssetMetadata[] | null,
) {
  const [blStats, setBlStats] = useState<BlackLittermanStats | null>(null);
  const { selectedBenchmark, riskFreeRate, minWeights, maxWeights } = params;
  const historicalData = marketData?.historicalData || null;
  const debouncedViews = useDebouncedValue(views, INPUT_DEBOUNCE_MS);
  // Market capitalization (fund assets for ETFs) of each asset, for the implied prior
  const marketCaps = useMemo(
    () => quantStats?.matrixSymbols.map(sym => { const m = metadata?.find(x => x.symbol === sym); return m?.marketCap || m?.totalAssets || null; }) ?? [],
    [quantStats, metadata],
  );

  useEffect(() => {
    if (!quantStats || Object.keys(debouncedViews).length === 0 || !historicalData) return;
    let cancelled = false;
    runJob('blackLitterman', { quantStats, views: debouncedViews, historicalData, benchmark: selectedBenchmark, riskFreeRate, minWeights, maxWeights, marketCaps })
      .then(result => { if (!cancelled) setBlStats(result); })
      .catch(err => console.log("BL Error", err));
    return () => { cancelled = true; };
  }, [quantStats, debouncedViews, riskFreeRate, historicalData, selectedBenchmark, maxWeights, minWeights, marketCaps]);

  return blStats;
}

/** Monte Carlo projection of the optimal portfolio; only computed while its tab is visible. */
export function useMonteCarlo(enabled: boolean, quantStats: QuantStats | null, years: number, initialAmount: number) {
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const debouncedAmount = useDebouncedValue(initialAmount, INPUT_DEBOUNCE_MS);
  const debouncedYears = useDebouncedValue(years, INPUT_DEBOUNCE_MS);

  useEffect(() => {
    const optimal = quantStats?.optimization?.optimal;
    if (!enabled || !optimal) return;
    let cancelled = false;
    setMcResult(null);
    runJob('monteCarlo', { initialAmount: debouncedAmount, expectedReturn: optimal.expectedReturn, volatility: optimal.volatility, years: debouncedYears })
      .then(result => { if (!cancelled) setMcResult(result); })
      .catch(err => console.error('Monte Carlo failed', err));
    return () => { cancelled = true; };
  }, [enabled, quantStats, debouncedYears, debouncedAmount]);

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

  const refresh = useCallback(async () => {
    const res = await fetch('/api/portfolios');
    const data = await res.json();
    if (data.portfolios) setSavedPortfolios(data.portfolios);
  }, []);

  useEffect(() => {
    refresh().catch(err => console.error('Failed to fetch portfolios', err));
  }, [refresh]);

  const savePortfolio = useCallback(async (quantStats: QuantStats, riskFreeRate: number) => {
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
  }, [t, refresh]);

  return { savedPortfolios, saving, savePortfolio };
}
