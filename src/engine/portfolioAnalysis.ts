/**
 * Portfolio analysis pipeline: statistics, risk matrices, expected returns and portfolio construction.
 * Pure functions with no React dependencies, so they can be unit-tested and moved to a worker later.
 */
import {
  calculateLogReturns, mean, stdDev, covariance, correlation, calculateBeta, calculateCAPM,
  calculateJensensAlpha, calculateARIMA111, calculateAlphaSignal, calculateBlackLittermanPosterior,
  type ARIMA_Forecast, type AlphaSignalResult,
} from '../utils/quantMath';
import { ConstraintError, minimumVariance, portfolioStats, roundWeights, solvePortfolio, type Objective, type OptimizationResult } from '../optimization';
import { ledoitWolfCovariance } from './covariance';
import { hrpWeights, projectToBounds, riskParityWeights } from './objectives';
import { riskMetrics } from './riskMetrics';
import { DEFAULT_MAX_WEIGHT, defaultMinWeight, FRONTIER_CHART_SAMPLES, TRADING_DAYS } from '../constants';
import type { AssetStat, CovarianceMethod, OptimizationFailure, PriceRow, QuantStats, WeightBounds } from '../types';

export type SeriesBySymbol = Record<string, (number | null)[]>;

export function buildSeries(historicalData: PriceRow[], symbols: string[]) {
  const pricesBySymbol: SeriesBySymbol = {};
  const returnsBySymbol: SeriesBySymbol = {};
  for (const sym of symbols) {
    pricesBySymbol[sym] = historicalData.map(row => row[sym] === null ? null : Number(row[sym]));
    returnsBySymbol[sym] = calculateLogReturns(pricesBySymbol[sym]);
  }
  return { pricesBySymbol, returnsBySymbol };
}

export function computeAssetStats(
  tickers: string[],
  returnsBySymbol: SeriesBySymbol,
  benchReturns: (number | null)[],
  benchAnnReturn: number,
  riskFreeRate: number,
): AssetStat[] {
  const assetStats: AssetStat[] = [];
  for (const sym of tickers) {
    const r = returnsBySymbol[sym];
    if (!r) continue;

    const annReturn = mean(r) * TRADING_DAYS;
    const annVolatility = stdDev(r, true) * Math.sqrt(TRADING_DAYS);
    const beta = calculateBeta(r, benchReturns);
    const capmReturn = calculateCAPM(riskFreeRate, beta, benchAnnReturn);
    const alpha = calculateJensensAlpha(annReturn, capmReturn);
    const sharpeRatio = annVolatility === 0 ? 0 : (annReturn - riskFreeRate) / annVolatility;
    const { sortino, maxDrawdown, recoveryDays } = riskMetrics(r, riskFreeRate);

    assetStats.push({ symbol: sym, annReturn, annVolatility, beta, capmExpectedReturn: capmReturn, alpha, sharpeRatio, sortino, maxDrawdown, recoveryDays });
  }
  return assetStats;
}

/** Annualized covariance and correlation matrices (pairwise deletion of missing returns). */
export function computeRiskMatrices(symbols: string[], returnsBySymbol: SeriesBySymbol) {
  const covMatrix: number[][] = [];
  const corMatrix: number[][] = [];
  for (let i = 0; i < symbols.length; i++) {
    covMatrix[i] = [];
    corMatrix[i] = [];
    for (let j = 0; j < symbols.length; j++) {
      const r1 = returnsBySymbol[symbols[i]];
      const r2 = returnsBySymbol[symbols[j]];
      covMatrix[i][j] = covariance(r1, r2, true) * TRADING_DAYS;
      corMatrix[i][j] = correlation(r1, r2);
    }
  }
  return { covMatrix, corMatrix };
}

/**
 * Replaces historical expected returns with ARIMA(1,1,1) forecasts, then stabilizes them with a
 * Black-Litterman posterior (equal-weight prior, absolute views on every asset).
 */
export function arimaExpectedReturns(
  symbols: string[],
  pricesBySymbol: SeriesBySymbol,
  historicalReturns: number[],
  covMatrix: number[][],
) {
  let expectedReturns = [...historicalReturns];
  const forecasts: Record<string, ARIMA_Forecast> = {};

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    try {
      const validPrices = pricesBySymbol[sym].filter(p => p !== null) as number[];
      const forecast = calculateARIMA111(validPrices, TRADING_DAYS);
      forecast.symbol = sym;
      forecasts[sym] = forecast;
      // ARIMA yields a simple 1-year return; convert to log return to match the
      // annualized log returns used everywhere else (a forecast of -100% or worse can't be logged)
      if (forecast.expectedReturn > -1) {
        expectedReturns[i] = Math.log1p(forecast.expectedReturn);
      }
    } catch (e) {
      console.log(`ARIMA forecast failed for ${sym}, falling back to historical mean.`, e);
    }
  }

  try {
    const n = symbols.length;
    const marketWeights = new Array(n).fill(1 / n);
    const P = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
    expectedReturns = calculateBlackLittermanPosterior(covMatrix, marketWeights, [...expectedReturns], P, 2.5, 0.05);
  } catch (err) {
    console.error("Black-Litterman stabilization failed", err);
  }

  return { expectedReturns, forecasts };
}

export function computeAlphaSignals(symbols: string[], pricesBySymbol: SeriesBySymbol) {
  const signals: Record<string, AlphaSignalResult> = {};
  for (const sym of symbols) {
    if (pricesBySymbol[sym]) {
      signals[sym] = calculateAlphaSignal(sym, pricesBySymbol[sym].filter(p => p !== null) as number[]);
    }
  }
  return signals;
}

export function resolveBounds(symbols: string[], minWeights: WeightBounds, maxWeights: WeightBounds) {
  return {
    minWeightsArr: symbols.map(sym => minWeights[sym] !== undefined ? minWeights[sym] : defaultMinWeight(symbols.length)),
    maxWeightsArr: symbols.map(sym => maxWeights[sym] !== undefined ? maxWeights[sym] : DEFAULT_MAX_WEIGHT),
  };
}

/** Daily log return of the weighted portfolio; null on days where any asset is missing. */
export function portfolioDailyReturns(symbols: string[], returnsBySymbol: SeriesBySymbol, weights: number[]) {
  const nDays = returnsBySymbol[symbols[0]].length;
  const result: (number | null)[] = [];
  for (let i = 0; i < nDays; i++) {
    let r = 0;
    let valid = true;
    for (let j = 0; j < symbols.length; j++) {
      const value = returnsBySymbol[symbols[j]][i];
      if (value === null) {
        valid = false;
        break;
      }
      r += weights[j] * value;
    }
    result.push(valid ? r : null);
  }
  return result;
}

export interface AnalysisInput {
  historicalData: PriceRow[];
  symbols: string[];
  selectedTickers: string[];
  selectedBenchmark: string;
  riskFreeRate: number;
  useArimaForecast: boolean;
  minWeights: WeightBounds;
  maxWeights: WeightBounds;
  objective: Objective;
  covarianceMethod: CovarianceMethod;
}

/** Synchronous part of the analysis: everything except the optimizer. Null if the benchmark has no data. */
export function prepareAnalysis(input: AnalysisInput) {
  const { historicalData, symbols, selectedTickers, selectedBenchmark, riskFreeRate, useArimaForecast, covarianceMethod } = input;
  const { pricesBySymbol, returnsBySymbol } = buildSeries(historicalData, symbols);

  const benchReturns = returnsBySymbol[selectedBenchmark];
  if (!benchReturns) return null;

  const benchAnnReturn = mean(benchReturns) * TRADING_DAYS;
  const assetStats = computeAssetStats(selectedTickers, returnsBySymbol, benchReturns, benchAnnReturn, riskFreeRate);
  const matrixSymbols = selectedTickers.filter(sym => returnsBySymbol[sym]);
  const sample = computeRiskMatrices(matrixSymbols, returnsBySymbol);
  const corMatrix = sample.corMatrix;
  // The optimizer uses the shrunk covariance when chosen; the heatmap always shows sample correlations
  const shrunk = covarianceMethod === 'ledoitWolf' ? ledoitWolfCovariance(matrixSymbols.map(sym => returnsBySymbol[sym])) : null;
  const covMatrix = shrunk ? shrunk.cov.map(row => row.map(v => v * TRADING_DAYS)) : sample.covMatrix;

  let expectedReturns = assetStats.map(s => s.annReturn);
  let arimaForecasts: Record<string, ARIMA_Forecast> = {};
  if (useArimaForecast) {
    ({ expectedReturns, forecasts: arimaForecasts } = arimaExpectedReturns(matrixSymbols, pricesBySymbol, expectedReturns, covMatrix));
  }

  return {
    returnsBySymbol,
    benchReturns,
    benchAnnReturn,
    assetStats,
    matrixSymbols,
    covMatrix,
    corMatrix,
    covarianceMethod: (shrunk ? 'ledoitWolf' : 'sample') as CovarianceMethod,
    covarianceShrinkage: shrunk ? shrunk.shrinkage : null,
    expectedReturns,
    arimaForecasts,
    alphaSignals: computeAlphaSignals(matrixSymbols, pricesBySymbol),
    dates: historicalData.map(d => d.date),
  };
}

export type PreparedAnalysis = NonNullable<ReturnType<typeof prepareAnalysis>>;

function describe(weights: number[], mu: number[], cov: number[][], riskFreeRate: number, method: Objective): OptimizationResult {
  const rounded = roundWeights(weights);
  const stats = portfolioStats(rounded, mu, cov);
  return { weights: rounded, ...stats, sharpeRatio: stats.volatility > 0 ? (stats.expectedReturn - riskFreeRate) / stats.volatility : 0, method };
}

/**
 * The portfolio each objective produces within the weight bounds. Max Sharpe and minimum variance
 * are exact QPs; risk parity and HRP ignore expected returns and are moved into the bounds afterwards.
 */
export function objectivePortfolios(
  expectedReturns: number[],
  cov: number[][],
  riskFreeRate: number,
  lb: number[],
  ub: number[],
  maxSharpe: OptimizationResult,
): Record<Objective, OptimizationResult> {
  return {
    maxSharpe,
    minVariance: describe(minimumVariance(cov, lb, ub), expectedReturns, cov, riskFreeRate, 'minVariance'),
    riskParity: describe(projectToBounds(riskParityWeights(cov), lb, ub), expectedReturns, cov, riskFreeRate, 'riskParity'),
    hrp: describe(projectToBounds(hrpWeights(cov), lb, ub), expectedReturns, cov, riskFreeRate, 'hrp'),
  };
}

/** Builds the portfolio for the chosen objective (plus the alternatives) and its CAPM and risk metrics. */
export async function optimizePreparedAnalysis(
  prepared: PreparedAnalysis,
  riskFreeRate: number,
  minWeights: WeightBounds,
  maxWeights: WeightBounds,
  objective: Objective = 'maxSharpe',
): Promise<{ quantStats: QuantStats; optimizationError: OptimizationFailure | null }> {
  const { assetStats, matrixSymbols, covMatrix, corMatrix, expectedReturns, returnsBySymbol, benchAnnReturn } = prepared;
  let optimization = null;
  let alternatives: Partial<Record<Objective, OptimizationResult>> = {};
  let portBeta = 0;
  let portCAPM = 0;
  let portAlpha = 0;
  let portDailyReturns: (number | null)[] = [];
  let portfolioRisk = null;
  let optimizationError: OptimizationFailure | null = null;

  try {
    const { minWeightsArr, maxWeightsArr } = resolveBounds(matrixSymbols, minWeights, maxWeights);
    const sharpe = solvePortfolio(expectedReturns, covMatrix, riskFreeRate, maxWeightsArr, minWeightsArr, FRONTIER_CHART_SAMPLES);
    alternatives = objectivePortfolios(expectedReturns, covMatrix, riskFreeRate, minWeightsArr, maxWeightsArr, sharpe.optimal);
    optimization = { ...sharpe, optimal: alternatives[objective]! };

    const weights = optimization.optimal.weights;
    portBeta = assetStats.reduce((sum, stat, i) => sum + stat.beta * weights[i], 0);
    portCAPM = calculateCAPM(riskFreeRate, portBeta, benchAnnReturn);
    portAlpha = calculateJensensAlpha(optimization.optimal.expectedReturn, portCAPM);
    portDailyReturns = portfolioDailyReturns(matrixSymbols, returnsBySymbol, weights);
    portfolioRisk = riskMetrics(portDailyReturns, riskFreeRate);
  } catch (e) {
    console.log("Could not optimize portfolio", e);
    if (e instanceof ConstraintError) {
      const { sum, min, max, assetIndex } = e.details;
      optimizationError = { code: e.code, sum, min, max, symbol: assetIndex !== undefined ? matrixSymbols[assetIndex] : undefined };
    } else {
      optimizationError = { code: 'generic' };
    }
  }

  return {
    optimizationError,
    quantStats: {
      assetStats,
      matrixSymbols,
      covarianceMatrix: covMatrix,
      correlationMatrix: corMatrix,
      optimization,
      objective,
      alternatives,
      covarianceMethod: prepared.covarianceMethod,
      covarianceShrinkage: prepared.covarianceShrinkage,
      portfolioRisk,
      portBeta,
      portCAPM,
      portAlpha,
      benchAnnReturn,
      portDailyReturns,
      benchDailyReturns: prepared.benchReturns,
      dates: prepared.dates,
    },
  };
}
