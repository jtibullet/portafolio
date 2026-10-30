import { TRADING_DAYS } from '../constants';

export interface RiskMetrics {
  /** (annual return − rf) / annualized downside deviation below the daily risk-free rate */
  sortino: number;
  /** Largest peak-to-trough fall of the value path, as a positive fraction */
  maxDrawdown: number;
  /** Annual return / max drawdown */
  calmar: number;
  /** Trading days from the max-drawdown trough back to the previous peak; null if not recovered yet */
  recoveryDays: number | null;
}

/** Max drawdown of the value path implied by daily log returns (missing days count as flat). */
export function drawdownStats(logReturns: (number | null)[]) {
  let value = 1;
  let peak = 1;
  let peakAtWorst = 1;
  let maxDrawdown = 0;
  let troughIndex = -1;
  const values: number[] = [];
  logReturns.forEach((r, t) => {
    value *= Math.exp(r ?? 0);
    values.push(value);
    if (value > peak) peak = value;
    const dd = 1 - value / peak;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      troughIndex = t;
      peakAtWorst = peak;
    }
  });

  let recoveryDays: number | null = null;
  if (troughIndex >= 0) {
    for (let t = troughIndex + 1; t < values.length; t++) {
      if (values[t] >= peakAtWorst) {
        recoveryDays = t - troughIndex;
        break;
      }
    }
  } else {
    recoveryDays = 0;
  }
  return { maxDrawdown, recoveryDays };
}

export function riskMetrics(logReturns: (number | null)[], riskFreeRate: number): RiskMetrics {
  const valid = logReturns.filter((r): r is number => r !== null);
  const annReturn = valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length) * TRADING_DAYS : 0;
  const dailyTarget = riskFreeRate / TRADING_DAYS;
  const downsideVar = valid.length ? valid.reduce((s, r) => s + Math.min(0, r - dailyTarget) ** 2, 0) / valid.length : 0;
  const downsideDev = Math.sqrt(downsideVar * TRADING_DAYS);
  const { maxDrawdown, recoveryDays } = drawdownStats(logReturns);
  return {
    sortino: downsideDev > 0 ? (annReturn - riskFreeRate) / downsideDev : 0,
    maxDrawdown,
    calmar: maxDrawdown > 0 ? annReturn / maxDrawdown : 0,
    recoveryDays,
  };
}
