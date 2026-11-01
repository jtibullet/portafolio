import { describe, it, expect } from 'vitest';
import { isNewPeriod, rebalanceIndices, runBacktest, type BacktestInput } from './backtest';
import type { PriceRow } from '../types';

/** Weekday dates starting 2020-01-01. */
function businessDays(count: number) {
  const dates: string[] = [];
  for (let d = new Date(Date.UTC(2020, 0, 1)); dates.length < count; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Deterministic random-walk prices per symbol. */
function walk(seed: number, count: number) {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  let p = 100;
  return Array.from({ length: count }, () => (p *= Math.exp(0.0004 + 0.012 * (rand() - 0.5) * 3.4)));
}

function rows(dates: string[], series: Record<string, (number | null)[]>): PriceRow[] {
  return dates.map((date, t) => ({ date, ...Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v[t]])) }));
}

const base = (historicalData: PriceRow[], tickers: string[]): BacktestInput => ({
  historicalData,
  tickers,
  benchmark: 'BENCH',
  riskFreeRate: 0.02,
  minWeights: {},
  maxWeights: {},
  covarianceMethod: 'ledoitWolf',
  lookbackDays: 126,
  frequency: 'monthly',
  costs: { commission: 0, spread: 0, fx: 0 },
  baseCurrency: 'USD',
});

describe('rebalance calendar', () => {
  it('detects new months, quarters and years', () => {
    expect(isNewPeriod('2021-01-29', '2021-02-01', 'monthly')).toBe(true);
    expect(isNewPeriod('2021-02-26', '2021-03-01', 'quarterly')).toBe(false);
    expect(isNewPeriod('2021-03-31', '2021-04-01', 'quarterly')).toBe(true);
    expect(isNewPeriod('2021-06-30', '2021-07-01', 'annual')).toBe(false);
    expect(isNewPeriod('2021-12-31', '2022-01-03', 'annual')).toBe(true);
  });

  it('rebalances on the first test day and then once per period', () => {
    const dates = businessDays(800); // 2020-01-01 .. early 2023
    const start = 200;
    const monthly = rebalanceIndices(dates, start, 'monthly');
    expect(monthly[0]).toBe(start);
    monthly.slice(1).forEach(t => expect(dates[t].slice(5, 7)).not.toBe(dates[t - 1].slice(5, 7)));
    expect(rebalanceIndices(dates, start, 'quarterly').length).toBeLessThan(monthly.length);
    expect(rebalanceIndices(dates, start, 'annual').length).toBe(4); // start + Jan 2021, 2022, 2023
  });
});

describe('runBacktest', () => {
  const N = 600;
  const dates = businessDays(N);
  const series = { A: walk(1, N), B: walk(2, N), C: walk(3, N), BENCH: walk(4, N) };

  it('never uses data after a rebalance date for that decision', () => {
    const cut = 400;
    const altered = Object.fromEntries(Object.entries(series).map(([k, v]) =>
      [k, v.map((p, t) => (t > cut ? p * (k === 'A' ? 3 : 0.4) * (1 + 0.01 * Math.sin(t)) : p))]));
    const a = runBacktest(base(rows(dates, series), ['A', 'B', 'C']));
    const b = runBacktest(base(rows(dates, altered), ['A', 'B', 'C']));
    if (!a.ok || !b.ok) throw new Error('backtest failed');
    const before = a.rebalanceDates.filter(d => d <= dates[cut]).length;
    expect(before).toBeGreaterThan(5);
    a.strategies.forEach((s, k) => {
      expect(b.strategies[k].weights.slice(0, before)).toEqual(s.weights.slice(0, before));
      const testCut = cut - 126;
      expect(b.strategies[k].values.slice(0, testCut + 1)).toEqual(s.values.slice(0, testCut + 1));
    });
  });

  it('keeps every target weight within the bounds and summing to 1', () => {
    const result = runBacktest({ ...base(rows(dates, series), ['A', 'B', 'C']), minWeights: { A: 0.1, B: 0.1, C: 0.1 }, maxWeights: { A: 0.5, B: 0.5, C: 0.5 } });
    if (!result.ok) throw new Error('backtest failed');
    result.strategies.filter(s => s.strategy !== 'equalWeight' && s.strategy !== 'benchmark').forEach(s => {
      expect(s.fallbacks).toBe(0);
      s.weights.forEach(w => {
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
        w.forEach(x => { expect(x).toBeGreaterThanOrEqual(0.1 - 1e-6); expect(x).toBeLessThanOrEqual(0.5 + 1e-6); });
      });
    });
  });

  it('charges commission and half the spread on the initial purchase only when prices are flat', () => {
    const flat = { A: new Array(N).fill(10), B: new Array(N).fill(20), BENCH: new Array(N).fill(5) };
    const result = runBacktest({ ...base(rows(dates, flat), ['A', 'B']), costs: { commission: 0.001, spread: 0.002, fx: 0.01 } });
    if (!result.ok) throw new Error('backtest failed');
    const equal = result.strategies.find(s => s.strategy === 'equalWeight')!;
    // 0.1% commission + 0.1% half-spread on 100% bought, then nothing drifts so nothing is traded
    expect(equal.values[0]).toBeCloseTo(99.8, 10);
    expect(equal.metrics.finalValue).toBeCloseTo(99.8, 10);
    expect(equal.metrics.annualTurnover).toBe(0);
    expect(result.strategies.find(s => s.strategy === 'benchmark')!.metrics.finalValue).toBeCloseTo(100, 10);
  });

  it('adds the FX cost to assets quoted in the other currency', () => {
    const flat = { 'A.SN': new Array(N).fill(1000), B: new Array(N).fill(20), BENCH: new Array(N).fill(5) };
    const input = { ...base(rows(dates, flat), ['A.SN', 'B']), costs: { commission: 0, spread: 0, fx: 0.01 } };
    const usd = runBacktest(input);
    const clp = runBacktest({ ...input, baseCurrency: 'CLP' });
    if (!usd.ok || !clp.ok) throw new Error('backtest failed');
    // Half the money goes to the asset in the other currency either way: 0.5 × 1%
    expect(usd.strategies.find(s => s.strategy === 'equalWeight')!.values[0]).toBeCloseTo(99.5, 10);
    expect(clp.strategies.find(s => s.strategy === 'equalWeight')!.values[0]).toBeCloseTo(99.5, 10);
  });

  it('lets weights drift between rebalances and tracks the benchmark buy-and-hold', () => {
    const result = runBacktest({ ...base(rows(dates, series), ['A', 'B']), frequency: 'annual' });
    if (!result.ok) throw new Error('backtest failed');
    const start = 126;
    const firstRebalance = result.rebalanceDates[1];
    const end = dates.indexOf(firstRebalance) - 1; // last day before the second rebalance
    const equal = result.strategies.find(s => s.strategy === 'equalWeight')!;
    const expected = 100 * (0.5 * series.A[end] / series.A[start] + 0.5 * series.B[end] / series.B[start]);
    expect(equal.values[end - start]).toBeCloseTo(expected, 8);
    const bench = result.strategies.find(s => s.strategy === 'benchmark')!;
    expect(bench.values.at(-1)).toBeCloseTo(100 * series.BENCH[N - 1] / series.BENCH[start], 8);
  });

  it('leaves out an asset until it has enough history', () => {
    const late = { ...series, C: series.C.map((p, t) => (t < 300 ? null : p)) };
    const result = runBacktest(base(rows(dates, late), ['A', 'B', 'C']));
    if (!result.ok) throw new Error('backtest failed');
    const hrp = result.strategies.find(s => s.strategy === 'hrp')!;
    result.rebalanceDates.forEach((d, k) => {
      const t = dates.indexOf(d);
      if (t < 300 + 0.8 * 126) expect(hrp.weights[k][2]).toBe(0);
    });
    expect(hrp.weights.at(-1)![2]).toBeGreaterThan(0);
  });

  it('with bands, trades only when a weight drifts past the band', () => {
    const trending = { A: dates.map((_, t) => 100 * Math.exp(0.004 * t)), B: new Array(N).fill(50), BENCH: new Array(N).fill(5) };
    const input = { ...base(rows(dates, trending), ['A', 'B']), frequency: 'bands' as const };
    const equal = (r: ReturnType<typeof runBacktest>) => {
      if (!r.ok) throw new Error('backtest failed');
      return r.strategies.find(s => s.strategy === 'equalWeight')!;
    };
    const tight = equal(runBacktest({ ...input, bandWidth: 0.02 }));
    const wide = equal(runBacktest({ ...input, bandWidth: 0.6 }));
    expect(wide.trades).toBe(1);
    expect(tight.trades).toBeGreaterThan(5);
    expect(tight.metrics.annualTurnover).toBeGreaterThan(0);
    const monthly = equal(runBacktest({ ...input, frequency: 'monthly' }));
    expect(monthly.trades).toBe(equal(runBacktest({ ...input, frequency: 'monthly' })).weights.length);
  });

  it('reports insufficient data when the history is shorter than the window plus a quarter', () => {
    const result = runBacktest({ ...base(rows(dates.slice(0, 150), series), ['A', 'B']), lookbackDays: 126 });
    expect(result).toMatchObject({ ok: false, reason: 'insufficientData', availableDays: 150 });
  });
});
