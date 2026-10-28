import { describe, it, expect } from 'vitest';
import {
  buildSeries, computeRiskMatrices, portfolioDailyReturns, resolveBounds, prepareAnalysis, optimizePreparedAnalysis,
} from './portfolioAnalysis';
import { impliedRiskAversion } from './blackLittermanAnalysis';
import { buildRecommendations } from './recommendations';
import { buildTrailingPerformance, computeSectorWeights, buildHistogram } from './chartData';
import type { AssetMetadata, PriceRow, RecommendationCandidate } from '../types';

/** Deterministic price rows: each symbol follows its own pseudo-random walk. */
function makeRows(symbols: string[], days: number, gaps: Record<string, number[]> = {}): PriceRow[] {
  const prices = Object.fromEntries(symbols.map(s => [s, 100]));
  return Array.from({ length: days }, (_, d) => {
    const row: PriceRow = { date: new Date(Date.UTC(2024, 0, 1 + d)).toISOString().slice(0, 10) };
    symbols.forEach((s, k) => {
      prices[s] *= 1 + 0.01 * Math.sin(d * (k + 1) * 0.7) + 0.0005 * (k + 1);
      row[s] = gaps[s]?.includes(d) ? null : prices[s];
    });
    return row;
  });
}

describe('buildSeries', () => {
  it('keeps missing prices as null and propagates them to both adjacent returns', () => {
    const rows = makeRows(['A'], 5, { A: [2] });
    const { pricesBySymbol, returnsBySymbol } = buildSeries(rows, ['A']);
    expect(pricesBySymbol.A[2]).toBeNull();
    expect(returnsBySymbol.A).toHaveLength(4);
    expect(returnsBySymbol.A[1]).toBeNull();
    expect(returnsBySymbol.A[2]).toBeNull();
  });
});

describe('computeRiskMatrices', () => {
  it('returns a symmetric covariance matrix and a unit-diagonal correlation matrix', () => {
    const syms = ['A', 'B', 'C'];
    const { returnsBySymbol } = buildSeries(makeRows(syms, 60), syms);
    const { covMatrix, corMatrix } = computeRiskMatrices(syms, returnsBySymbol);
    for (let i = 0; i < 3; i++) {
      expect(corMatrix[i][i]).toBeCloseTo(1, 10);
      for (let j = 0; j < 3; j++) expect(covMatrix[i][j]).toBeCloseTo(covMatrix[j][i], 12);
    }
  });
});

describe('portfolioDailyReturns', () => {
  it('weights the returns and is null when any asset is missing that day', () => {
    const r = portfolioDailyReturns(['A', 'B'], { A: [0.01, null], B: [0.03, 0.02] }, [0.5, 0.5]);
    expect(r[0]).toBeCloseTo(0.02, 12);
    expect(r[1]).toBeNull();
  });
});

describe('resolveBounds', () => {
  it('fills unset tickers with the default 5% min and 100% max', () => {
    expect(resolveBounds(['A', 'B'], { A: 0.1 }, { B: 0.4 })).toEqual({ minWeightsArr: [0.1, 0.05], maxWeightsArr: [1, 0.4] });
  });
});

describe('prepareAnalysis + optimizePreparedAnalysis', () => {
  const syms = ['A', 'B', 'C', 'BENCH'];
  const base = {
    historicalData: makeRows(syms, 120),
    symbols: syms,
    selectedTickers: ['A', 'B', 'C'],
    selectedBenchmark: 'BENCH',
    riskFreeRate: 0.02,
    useArimaForecast: false,
    minWeights: {},
    maxWeights: {},
  };

  it('returns null when the benchmark has no data', () => {
    expect(prepareAnalysis({ ...base, selectedBenchmark: 'MISSING' })).toBeNull();
  });

  it('skips selected tickers without data and keeps the matrices aligned with assetStats', () => {
    const prepared = prepareAnalysis({ ...base, selectedTickers: ['A', 'NODATA', 'C'] })!;
    expect(prepared.matrixSymbols).toEqual(['A', 'C']);
    expect(prepared.assetStats.map(s => s.symbol)).toEqual(['A', 'C']);
    expect(prepared.covMatrix).toHaveLength(2);
  });

  it('produces ARIMA forecasts only when enabled', () => {
    expect(Object.keys(prepareAnalysis(base)!.arimaForecasts)).toHaveLength(0);
    expect(Object.keys(prepareAnalysis({ ...base, useArimaForecast: true })!.arimaForecasts)).toEqual(['A', 'B', 'C']);
  });

  it('optimizes a fully invested portfolio and reports infeasible bounds as an error', async () => {
    const prepared = prepareAnalysis(base)!;
    const ok = await optimizePreparedAnalysis(prepared, 0.02, {}, {});
    expect(ok.optimizationError).toBeNull();
    expect(ok.quantStats.optimization!.optimal.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(ok.quantStats.portDailyReturns).toHaveLength(119);

    const bad = await optimizePreparedAnalysis(prepared, 0.02, {}, { A: 0.1, B: 0.1, C: 0.1 });
    expect(bad.optimizationError).toMatch(/below 100%/);
    expect(bad.quantStats.optimization).toBeNull();
  });
});

describe('impliedRiskAversion', () => {
  it('falls back to 2.5 when the benchmark underperformed the risk-free rate', () => {
    const rows = makeRows(['BENCH'], 60);
    expect(impliedRiskAversion(rows, 'BENCH', -0.1, 0.04)).toBe(2.5);
    expect(impliedRiskAversion(rows, 'BENCH', 0.5, 0.04)).toBeGreaterThan(0);
  });
});

describe('buildRecommendations', () => {
  const dates = Array.from({ length: 80 }, (_, i) => `2024-01-${String(i + 1).padStart(3, '0')}`);
  const portReturns = dates.slice(1).map((_, i) => 0.01 * Math.sin(i));
  const candidate = (symbol: string, drawdown: number, momentum20D: number, wiggle: (i: number) => number): RecommendationCandidate => {
    let p = 100;
    const pricesByDate = Object.fromEntries(dates.map((d, i) => [d, (p *= 1 + wiggle(i))]));
    return { symbol, currentPrice: p, sixMonthHigh: p, drawdown, momentum20D, pricesByDate };
  };

  it('splits low-correlation candidates into growth and dip and excludes held tickers', () => {
    const uncorrelated = (i: number) => 0.01 * Math.cos(i * 3.1);
    const correlated = (i: number) => 0.01 * Math.sin(i - 1);
    const result = buildRecommendations([
      candidate('GROW', -0.01, 0.05, uncorrelated),
      candidate('DIP', -0.3, 0.05, uncorrelated),
      candidate('HELD', -0.01, 0.05, uncorrelated),
      candidate('TWIN', -0.01, 0.05, correlated),
      candidate('FALLING', -0.3, -0.05, uncorrelated),
    ], dates, portReturns, 0.02, ['HELD']);
    expect(result.growth.map(c => c.symbol)).toEqual(['GROW']);
    expect(result.dip.map(c => c.symbol)).toEqual(['DIP']);
  });

  it('ignores candidates with fewer than 50 overlapping days', () => {
    const short = candidate('SHORT', -0.01, 0.05, i => 0.01 * Math.cos(i * 3.1));
    short.pricesByDate = Object.fromEntries(Object.entries(short.pricesByDate).slice(0, 20));
    expect(buildRecommendations([short], dates, portReturns, 0.02, []).growth).toEqual([]);
  });
});

describe('chart data', () => {
  it('trailing performance compounds log returns from 100', () => {
    const r = buildTrailingPerformance([Math.log(1.1), Math.log(1.1)], [0, null], ['d0', 'd1', 'd2'], 252);
    expect(r.data).toHaveLength(3);
    expect(r.portTotalRet).toBeCloseTo(21, 10);
    expect(r.benchTotalRet).toBeCloseTo(0, 10);
    expect(r.outperformance).toBeCloseTo(21, 10);
  });

  it('sector weights sum by sector and default to "Variado"', () => {
    const meta = [{ symbol: 'A', sector: 'Tech' }, { symbol: 'B', sector: 'Tech' }] as AssetMetadata[];
    const sectors = computeSectorWeights(['A', 'B', 'C'], [0.2, 0.3, 0.5], meta);
    expect(sectors.map(s => [s.sector, s.weight])).toEqual([['Tech', 0.5], ['Variado', 0.5]]);
    expect(sectors[0].assets.map(a => a.symbol)).toEqual(['B', 'A']);
  });

  it('histogram counts every value exactly once', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i * i);
    const bins = buildHistogram(values, 40);
    expect(bins).toHaveLength(40);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(1000);
    expect(buildHistogram([5, 5, 5], 4).reduce((s, b) => s + b.count, 0)).toBe(3);
  });
});
