/**
 * Walk-forward backtest: on each rebalance date the portfolio is re-estimated from the trailing
 * window of returns only (data up to that day's close), trades are charged the cost model, and the
 * weights then drift with prices until the next rebalance. No future data reaches any decision.
 */
import { maximumSharpe, minimumVariance, validateBounds, type Objective } from '../optimization';
import { mean } from '../utils/quantMath';
import { ledoitWolfCovariance } from './covariance';
import { hrpWeights, projectToBounds, riskParityWeights } from './objectives';
import { riskMetrics, type RiskMetrics } from './riskMetrics';
import type { CostModel } from './costs';
import { DEFAULT_MAX_WEIGHT, defaultMinWeight, TRADING_DAYS } from '../constants';
import type { CovarianceMethod, PriceRow, WeightBounds } from '../types';

export type RebalanceFrequency = 'monthly' | 'quarterly' | 'annual';
export type BacktestStrategy = Objective | 'equalWeight';
export const BACKTEST_STRATEGIES: BacktestStrategy[] = ['maxSharpe', 'minVariance', 'riskParity', 'hrp', 'equalWeight'];

/** An asset joins a rebalance only if it has a price that day and returns on this share of the window. */
const MIN_HISTORY_SHARE = 0.8;

export interface BacktestInput {
  historicalData: PriceRow[];
  tickers: string[];
  benchmark: string;
  riskFreeRate: number;
  minWeights: WeightBounds;
  maxWeights: WeightBounds;
  covarianceMethod: CovarianceMethod;
  /** Trading days of history used to estimate each rebalance */
  lookbackDays: number;
  frequency: RebalanceFrequency;
  costs: CostModel;
  /** Currency the account is funded in; trading an asset quoted in the other one pays the FX cost */
  baseCurrency: 'USD' | 'CLP';
}

export interface StrategyResult {
  strategy: BacktestStrategy | 'benchmark';
  /** Value of 100 invested at the start, one point per test day (after costs) */
  values: number[];
  metrics: RiskMetrics & {
    cagr: number;
    volatility: number;
    sharpe: number;
    /** One-way turnover per year (0.5 = half the portfolio traded each year) */
    annualTurnover: number;
    /** Costs paid per year, as a share of the portfolio value */
    annualCost: number;
    finalValue: number;
  };
  /** Target weights chosen at each rebalance (aligned with `rebalanceDates`) */
  weights: number[][];
  /** Rebalances that fell back to equal weights because the optimizer had no feasible answer */
  fallbacks: number;
  /** Simple return per calendar year of the test period */
  yearlyReturns: Record<string, number>;
}

export type BacktestResult =
  | { ok: false; reason: 'insufficientData'; availableDays: number; neededDays: number }
  | {
      ok: true;
      dates: string[];
      rebalanceDates: string[];
      tickers: string[];
      strategies: StrategyResult[];
    };

/** Whether a new period starts on `date` relative to `previous` (both ISO yyyy-mm-dd). */
export function isNewPeriod(previous: string, date: string, frequency: RebalanceFrequency) {
  const [y0, m0] = [Number(previous.slice(0, 4)), Number(previous.slice(5, 7))];
  const [y1, m1] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
  if (frequency === 'annual') return y1 !== y0;
  if (frequency === 'quarterly') return y1 !== y0 || Math.floor((m1 - 1) / 3) !== Math.floor((m0 - 1) / 3);
  return y1 !== y0 || m1 !== m0;
}

/** Index of each rebalance: the first test day, then the first trading day of each new period. */
export function rebalanceIndices(dates: string[], start: number, frequency: RebalanceFrequency) {
  const indices = [start];
  for (let t = start + 1; t < dates.length; t++) {
    if (isNewPeriod(dates[t - 1], dates[t], frequency)) indices.push(t);
  }
  return indices;
}

/** Target weights for one strategy from a window's annualized estimates. Null if no answer exists. */
export function strategyWeights(
  strategy: BacktestStrategy,
  mu: number[],
  cov: number[][],
  riskFreeRate: number,
  lb: number[],
  ub: number[],
): number[] | null {
  const n = mu.length;
  if (strategy === 'equalWeight') return new Array(n).fill(1 / n);
  try {
    validateBounds(lb, ub);
    switch (strategy) {
      case 'maxSharpe': return maximumSharpe(mu, cov, riskFreeRate, lb, ub) ?? minimumVariance(cov, lb, ub);
      case 'minVariance': return minimumVariance(cov, lb, ub);
      case 'riskParity': return projectToBounds(riskParityWeights(cov), lb, ub);
      case 'hrp': return projectToBounds(hrpWeights(cov), lb, ub);
    }
  } catch (e) {
    return null;
  }
}

function priceMatrix(historicalData: PriceRow[], symbols: string[]) {
  return symbols.map(sym => historicalData.map(row => {
    const v = row[sym];
    const p = v === null || v === undefined ? null : Number(v);
    return p !== null && Number.isFinite(p) && p > 0 ? p : null;
  }));
}

/** Log return from the previous day; null on the first day or when either price is missing. */
function logReturns(prices: (number | null)[]) {
  return prices.map((p, t) => (t > 0 && p !== null && prices[t - 1] !== null ? Math.log(p / prices[t - 1]!) : null));
}

/** Annualized mean and covariance of the window's log returns (days t-lookback+1 .. t). */
function estimate(windows: (number | null)[][], method: CovarianceMethod) {
  const mu = windows.map(r => mean(r) * TRADING_DAYS);
  const shrunk = method === 'ledoitWolf' ? ledoitWolfCovariance(windows) : null;
  const cov = shrunk ? shrunk.cov.map(row => row.map(v => v * TRADING_DAYS)) : pairwiseCovariance(windows);
  return { mu, cov };
}

/** Annualized sample covariance using, for each pair, the days on which both have a return. */
function pairwiseCovariance(windows: (number | null)[][]) {
  const n = windows.length;
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const a = windows[i];
      const b = windows[j];
      let count = 0, sa = 0, sb = 0, sab = 0;
      for (let t = 0; t < a.length; t++) {
        const x = a[t];
        const y = b[t];
        if (x === null || y === null) continue;
        count++; sa += x; sb += y; sab += x * y;
      }
      const c = count > 1 ? ((sab - (sa * sb) / count) / (count - 1)) * TRADING_DAYS : 0;
      cov[i][j] = c;
      cov[j][i] = c;
    }
  }
  return cov;
}

function summarize(
  strategy: StrategyResult['strategy'],
  values: number[],
  dates: string[],
  riskFreeRate: number,
  turnover: number,
  costPaid: number,
  weights: number[][],
  fallbacks: number,
): StrategyResult {
  const daily = values.map((v, t) => (t === 0 ? null : Math.log(v / values[t - 1])));
  const years = (values.length - 1) / TRADING_DAYS;
  const finalValue = values[values.length - 1];
  const cagr = years > 0 ? (finalValue / values[0]) ** (1 / years) - 1 : 0;
  const valid = daily.filter((r): r is number => r !== null);
  const m = valid.reduce((a, b) => a + b, 0) / Math.max(valid.length, 1);
  const volatility = Math.sqrt(valid.reduce((s, r) => s + (r - m) ** 2, 0) / Math.max(valid.length - 1, 1) * TRADING_DAYS);
  const risk = riskMetrics(daily, riskFreeRate);

  const yearlyReturns: Record<string, number> = {};
  let yearStart = values[0];
  for (let t = 1; t < values.length; t++) {
    const year = dates[t].slice(0, 4);
    if (t === values.length - 1 || dates[t + 1].slice(0, 4) !== year) {
      yearlyReturns[year] = values[t] / yearStart - 1;
      yearStart = values[t];
    }
  }

  return {
    strategy,
    values,
    metrics: {
      ...risk,
      cagr,
      volatility,
      sharpe: volatility > 0 ? (m * TRADING_DAYS - riskFreeRate) / volatility : 0,
      annualTurnover: years > 0 ? turnover / years : 0,
      annualCost: years > 0 ? costPaid / years : 0,
      finalValue,
    },
    weights,
    fallbacks,
    yearlyReturns,
  };
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const { historicalData, tickers, benchmark, riskFreeRate, minWeights, maxWeights, covarianceMethod, lookbackDays, frequency, costs, baseCurrency } = input;
  const dates = historicalData.map(row => row.date);
  const neededDays = lookbackDays + TRADING_DAYS / 4;
  if (dates.length < neededDays || tickers.length === 0) {
    return { ok: false, reason: 'insufficientData', availableDays: dates.length, neededDays };
  }

  const prices = priceMatrix(historicalData, tickers);
  const returns = prices.map(logReturns);
  const [benchPrices] = priceMatrix(historicalData, [benchmark]);
  const start = lookbackDays;
  const rebalances = rebalanceIndices(dates, start, frequency);
  const rebalanceSet = new Set(rebalances);
  const tradeRate = tickers.map(sym =>
    costs.commission + costs.spread / 2 + ((baseCurrency === 'CLP') !== sym.endsWith('.SN') ? costs.fx : 0));

  // Targets for every strategy at every rebalance, estimated once per date from the trailing window
  const targets: Record<BacktestStrategy, number[][]> = { maxSharpe: [], minVariance: [], riskParity: [], hrp: [], equalWeight: [] };
  const fallbacks: Record<BacktestStrategy, number> = { maxSharpe: 0, minVariance: 0, riskParity: 0, hrp: 0, equalWeight: 0 };
  for (const t of rebalances) {
    const windows = returns.map(r => r.slice(t - lookbackDays + 1, t + 1));
    const eligible = tickers.map((_, i) =>
      prices[i][t] !== null && windows[i].filter(v => v !== null).length >= MIN_HISTORY_SHARE * lookbackDays);
    const idx = eligible.flatMap((ok, i) => (ok ? [i] : []));
    for (const strategy of BACKTEST_STRATEGIES) {
      const full = new Array(tickers.length).fill(0);
      if (idx.length > 0) {
        const { mu, cov } = estimate(idx.map(i => windows[i]), covarianceMethod);
        const lb = idx.map(i => minWeights[tickers[i]] ?? defaultMinWeight(idx.length));
        const ub = idx.map(i => maxWeights[tickers[i]] ?? DEFAULT_MAX_WEIGHT);
        let w = idx.length === 1 ? [1] : strategyWeights(strategy, mu, cov, riskFreeRate, lb, ub);
        if (!w || w.some(x => !Number.isFinite(x))) {
          fallbacks[strategy]++;
          w = idx.map(() => 1 / idx.length);
        }
        idx.forEach((i, k) => { full[i] = Math.max(0, w![k]); });
        const total = full.reduce((a, b) => a + b, 0);
        if (total > 0) full.forEach((_, i) => { full[i] /= total; });
      }
      targets[strategy].push(full);
    }
  }

  const testDates = dates.slice(start);
  const strategies: StrategyResult[] = BACKTEST_STRATEGIES.map(strategy => {
    let value = 100;
    let holdings = new Array(tickers.length).fill(0);
    let turnover = 0;
    let costPaid = 0;
    let k = 0;
    const values: number[] = [];
    for (let t = start; t < dates.length; t++) {
      if (t > start) {
        // Prices move first; an asset without a price that day is held flat
        let growth = 0;
        const next = holdings.map((w, i) => {
          const r = returns[i][t];
          const g = w * (r === null ? 1 : Math.exp(r));
          growth += g;
          return g;
        });
        const cash = 1 - holdings.reduce((a, b) => a + b, 0);
        growth += cash;
        value *= growth;
        holdings = growth > 0 ? next.map(g => g / growth) : next;
      }
      if (rebalanceSet.has(t)) {
        // Trades happen at the close, after that day's return is known
        const target = targets[strategy][k++];
        const traded = target.map((w, i) => Math.abs(w - holdings[i]));
        const costShare = traded.reduce((s, d, i) => s + d * tradeRate[i], 0);
        turnover += t === start ? 0 : traded.reduce((a, b) => a + b, 0) / 2;
        costPaid += costShare;
        value *= 1 - costShare;
        holdings = target;
      }
      values.push(value);
    }
    return summarize(strategy, values, testDates, riskFreeRate, turnover, costPaid, targets[strategy], fallbacks[strategy]);
  });

  // Benchmark: buy and hold from the first test day, no costs; missing prices carry the last one
  let last = benchPrices[start];
  for (let t = start; last === null && t < dates.length; t++) last = benchPrices[t];
  if (last !== null) {
    const base = last;
    const benchValues = testDates.map((_, k) => {
      const p = benchPrices[start + k];
      if (p !== null) last = p;
      return (100 * last!) / base;
    });
    strategies.push(summarize('benchmark', benchValues, testDates, riskFreeRate, 0, 0, [], 0));
  }

  return { ok: true, dates: testDates, rebalanceDates: rebalances.map(t => dates[t]), tickers, strategies };
}
