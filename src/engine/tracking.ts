/**
 * How a saved portfolio has done since the day it was saved: its weights are bought at that day's
 * close and held (no rebalancing), next to the benchmark and to what its expected return implied.
 */
import { drawdownStats } from './riskMetrics';
import { TRADING_DAYS } from '../constants';
import type { PriceRow } from '../types';

export interface TrackingResult {
  startDate: string;
  dates: string[];
  /** Portfolio value, 100 on the start date */
  values: number[];
  /** Benchmark value, 100 on the start date; null without benchmark prices */
  benchmarkValues: number[] | null;
  totalReturn: number;
  benchmarkReturn: number | null;
  /** Return implied by the expected (log) return over the same time */
  expectedReturn: number;
  maxDrawdown: number;
  tradingDays: number;
  /** Tickers without any price since the start; their weight was spread over the rest */
  missing: string[];
}

/** First price at or after `start`, then the last known price on each later row. */
function heldPrices(rows: PriceRow[], sym: string, start: number) {
  let last: number | null = null;
  const out: (number | null)[] = [];
  for (let t = start; t < rows.length; t++) {
    const v = rows[t][sym];
    if (v !== null && v !== undefined && Number(v) > 0) last = Number(v);
    out.push(last);
  }
  const first = out.find(p => p !== null) ?? null;
  return first === null ? null : out.map(p => p ?? first);
}

export function trackPortfolio(
  rows: PriceRow[],
  tickers: string[],
  weights: number[],
  benchmark: string | null,
  savedDate: string,
  expectedLogReturn: number,
): TrackingResult | null {
  const start = rows.findIndex(r => r.date >= savedDate);
  if (start < 0) return null;
  const series = tickers.map(sym => heldPrices(rows, sym, start));
  const missing = tickers.filter((_, i) => !series[i]);
  const total = weights.reduce((s, w, i) => s + (series[i] ? w : 0), 0);
  if (total <= 0) return null;

  const shares = series.map((p, i) => (p ? (100 * weights[i]) / total / p[0]! : 0));
  const dates = rows.slice(start).map(r => r.date);
  const values = dates.map((_, k) => series.reduce((s, p, i) => s + (p ? shares[i] * p[k]! : 0), 0));
  const bench = benchmark ? heldPrices(rows, benchmark, start) : null;
  const benchmarkValues = bench ? bench.map(p => (100 * p!) / bench[0]!) : null;
  const tradingDays = dates.length - 1;
  const logReturns = values.map((v, k) => (k === 0 ? null : Math.log(v / values[k - 1])));

  return {
    startDate: dates[0],
    dates,
    values,
    benchmarkValues,
    totalReturn: values[values.length - 1] / 100 - 1,
    benchmarkReturn: benchmarkValues ? benchmarkValues[benchmarkValues.length - 1] / 100 - 1 : null,
    expectedReturn: Math.exp((expectedLogReturn * tradingDays) / TRADING_DAYS) - 1,
    maxDrawdown: drawdownStats(logReturns).maxDrawdown,
    tradingDays,
    missing,
  };
}
