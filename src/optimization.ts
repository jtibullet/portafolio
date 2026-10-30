/**
 * Portfolio Optimization Module
 *
 * Finds the long-only, fully invested portfolio with the highest Sharpe ratio under per-asset
 * weight bounds by solving a quadratic program exactly (Goldfarb-Idnani, via quadprog).
 * The efficient frontier is traced with minimum-variance QPs at increasing target returns.
 */
import { solveQuadratic, QPInfeasibleError } from './qp';

export interface SimulatedPortfolio {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  /**
   * The rule that produced the weights. A max-Sharpe request reports 'minVariance' when no allowed
   * portfolio beats the risk-free rate, so the Sharpe ratio has no meaningful maximum.
   */
  method: Objective;
}

/** Portfolio construction rule chosen by the user. */
export type Objective = 'maxSharpe' | 'minVariance' | 'riskParity' | 'hrp';

export interface FrontierPoint {
  volatility: number;
  expectedReturn: number;
}

/** Weight bounds that no fully invested portfolio can satisfy. `assetIndex` is set for 'minAboveMax'. */
export type ConstraintCode = 'minSum' | 'maxSum' | 'minAboveMax';

export class ConstraintError extends Error {
  constructor(
    message: string,
    public readonly code: ConstraintCode,
    public readonly details: { sum?: number; assetIndex?: number; min?: number; max?: number },
  ) {
    super(message);
    this.name = 'ConstraintError';
  }
}

export interface PortfolioOptimization {
  optimal: OptimizationResult;
  frontier: FrontierPoint[];
  simulated: SimulatedPortfolio[];
}

const FRONTIER_POINTS = 40;
const DEFAULT_MIN_WEIGHT = 0.05;

export function portfolioStats(weights: number[], mu: number[], cov: number[][]) {
  let ret = 0;
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    ret += weights[i] * mu[i];
    for (let j = 0; j < weights.length; j++) variance += weights[i] * cov[i][j] * weights[j];
  }
  return { expectedReturn: ret, volatility: Math.sqrt(Math.max(variance, 0)) };
}

/**
 * Sample covariance with pairwise deletion is not always positive definite, which the QP solver
 * requires. A ridge of 1e-8 x the average variance fixes that without visibly changing results.
 */
function regularize(cov: number[][]) {
  const n = cov.length;
  const avgVar = cov.reduce((s, row, i) => s + row[i], 0) / n || 1;
  return cov.map((row, i) => row.map((v, j) => (i === j ? v + 1e-8 * avgVar : (v + cov[j][i]) / 2)));
}

export function validateBounds(minW: number[], maxW: number[]) {
  const sumMin = minW.reduce((a, b) => a + b, 0);
  if (sumMin > 1 + 1e-9) {
    throw new ConstraintError(`Minimum weight constraints (sum = ${(sumMin * 100).toFixed(1)}%) exceed 100%.`, 'minSum', { sum: sumMin });
  }
  for (let j = 0; j < minW.length; j++) {
    if (minW[j] > maxW[j]) {
      throw new ConstraintError(`Minimum weight (${(minW[j] * 100).toFixed(1)}%) exceeds maximum weight (${(maxW[j] * 100).toFixed(1)}%) for asset ${j + 1}.`, 'minAboveMax', { assetIndex: j, min: minW[j], max: maxW[j] });
    }
  }
  const sumMax = maxW.reduce((a, b) => a + b, 0);
  if (sumMax < 1 - 1e-9) {
    throw new ConstraintError(`Maximum weight constraints (sum = ${(sumMax * 100).toFixed(1)}%) are below 100%; the portfolio cannot be fully invested.`, 'maxSum', { sum: sumMax });
  }
}

/** Box constraints lb ≤ w ≤ ub written as a·w ≥ b rows. */
function boxConstraints(lb: number[], ub: number[]) {
  const n = lb.length;
  const unit = (i: number, sign: number) => Array.from({ length: n }, (_, k) => (k === i ? sign : 0));
  return [
    ...lb.map((l, i) => ({ a: unit(i, 1), b: l })),
    ...ub.map((u, i) => ({ a: unit(i, -1), b: -u })),
  ];
}

/** Minimum-variance weights, optionally at a fixed target return. */
export function minimumVariance(cov: number[][], lb: number[], ub: number[], target?: { mu: number[]; value: number }) {
  const n = cov.length;
  const equalities = [{ a: Array(n).fill(1), b: 1 }];
  if (target) equalities.push({ a: target.mu, b: target.value });
  return solveQuadratic(regularize(cov), Array(n).fill(0), [...equalities, ...boxConstraints(lb, ub)], equalities.length);
}

/**
 * Max-Sharpe weights via the Cornuéjols–Tütüncü transformation: with y = κw, minimize yᵀΣy subject to
 * (μ − rf)ᵀy = 1, Σy = κ, lb·κ ≤ y ≤ ub·κ, κ ≥ 0, then w = y / κ. κ gets a tiny curvature so the
 * quadratic stays strictly convex. Returns null when no allowed portfolio has a positive excess return.
 */
export function maximumSharpe(mu: number[], cov: number[][], riskFreeRate: number, lb: number[], ub: number[]) {
  const n = mu.length;
  const sigma = regularize(cov);
  const avgVar = sigma.reduce((s, row, i) => s + row[i], 0) / n || 1;
  // Variables: y_0..y_{n-1}, κ
  const D = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i < n && j < n ? sigma[i][j] : i === j ? 1e-10 * avgVar : 0)));
  const row = (yCoef: (i: number) => number, kappa: number) => [...Array.from({ length: n }, (_, i) => yCoef(i)), kappa];

  const constraints = [
    { a: row(i => mu[i] - riskFreeRate, 0), b: 1 },
    { a: row(() => 1, -1), b: 0 },
    ...lb.map((l, k) => ({ a: row(i => (i === k ? 1 : 0), -l), b: 0 })),
    ...ub.map((u, k) => ({ a: row(i => (i === k ? -1 : 0), u), b: 0 })),
    { a: row(() => 0, 1), b: 0 },
  ];

  try {
    const solution = solveQuadratic(D, Array(n + 1).fill(0), constraints, 2);
    const kappa = solution[n];
    if (!(kappa > 0)) return null;
    return solution.slice(0, n).map(y => y / kappa);
  } catch (e) {
    if (e instanceof QPInfeasibleError) return null;
    throw e;
  }
}

/** Highest expected return reachable within the bounds: fill the best assets first. */
function maximumReturn(mu: number[], lb: number[], ub: number[]) {
  const w = [...lb];
  let remaining = 1 - lb.reduce((a, b) => a + b, 0);
  for (const i of mu.map((_, i) => i).sort((a, b) => mu[b] - mu[a])) {
    const add = Math.min(ub[i] - lb[i], remaining);
    w[i] += add;
    remaining -= add;
  }
  return w.reduce((s, wi, i) => s + wi * mu[i], 0);
}

/** Upper half of the frontier: minimum variance at evenly spaced returns up to the highest reachable. */
function efficientFrontier(mu: number[], cov: number[][], lb: number[], ub: number[], minVarReturn: number) {
  const maxRet = maximumReturn(mu, lb, ub);
  const points: FrontierPoint[] = [];
  for (let k = 0; k <= FRONTIER_POINTS; k++) {
    const value = minVarReturn + (maxRet - minVarReturn) * (k / FRONTIER_POINTS);
    try {
      const w = minimumVariance(cov, lb, ub, { mu, value });
      points.push(portfolioStats(w, mu, cov));
    } catch (e) {
      // The highest-return point can be numerically just out of reach
      if (!(e instanceof QPInfeasibleError)) throw e;
    }
  }
  return points;
}

/** Random portfolios within the bounds, only to draw the cloud behind the frontier. */
function samplePortfolios(mu: number[], cov: number[][], riskFreeRate: number, lb: number[], ub: number[], count: number, random: () => number) {
  const n = mu.length;
  const remaining = 1 - lb.reduce((a, b) => a + b, 0);
  const samples: SimulatedPortfolio[] = [];
  for (let s = 0; s < count; s++) {
    // Exponential draws normalized to 1 are uniform on the simplex; reject samples above a max
    for (let attempt = 0; attempt < 50; attempt++) {
      const draws = Array.from({ length: n }, () => -Math.log(random() || Number.MIN_VALUE));
      const total = draws.reduce((a, b) => a + b, 0);
      const weights = draws.map((x, i) => lb[i] + (x / total) * remaining);
      if (weights.some((w, i) => w > ub[i] + 1e-12)) continue;
      const stats = portfolioStats(weights, mu, cov);
      samples.push({ weights, ...stats, sharpeRatio: (stats.expectedReturn - riskFreeRate) / stats.volatility });
      break;
    }
  }
  return samples;
}

/** Weights rounded to 4 decimals; the rounding residue goes to the largest weight so they still sum to 1. */
export function roundWeights(weights: number[]) {
  const rounded = weights.map(w => Math.round(Math.max(w, 0) * 10000) / 10000);
  const diff = 1 - rounded.reduce((a, b) => a + b, 0);
  const maxIdx = rounded.indexOf(Math.max(...rounded));
  rounded[maxIdx] = Math.round((rounded[maxIdx] + diff) * 10000) / 10000;
  return rounded;
}

/**
 * Optimal portfolio, efficient frontier and a sample of random portfolios.
 * `numSamples` only controls how many random portfolios are drawn for the chart.
 */
export function solvePortfolio(
  expectedReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number,
  maxWeights?: number[],
  minWeights?: number[],
  numSamples = 2000,
  random: () => number = Math.random,
): PortfolioOptimization {
  const n = expectedReturns.length;
  const lb = minWeights || new Array(n).fill(DEFAULT_MIN_WEIGHT);
  const ub = maxWeights || new Array(n).fill(1);
  validateBounds(lb, ub);

  const minVarWeights = minimumVariance(covMatrix, lb, ub);
  const minVar = portfolioStats(minVarWeights, expectedReturns, covMatrix);

  const sharpeWeights = maximumSharpe(expectedReturns, covMatrix, riskFreeRate, lb, ub);
  const method = sharpeWeights ? 'maxSharpe' : 'minVariance';
  const weights = roundWeights(sharpeWeights ?? minVarWeights);
  const stats = portfolioStats(weights, expectedReturns, covMatrix);

  const frontier = efficientFrontier(expectedReturns, covMatrix, lb, ub, minVar.expectedReturn);
  frontier.push(stats);
  frontier.sort((a, b) => a.volatility - b.volatility);

  return {
    optimal: {
      weights,
      ...stats,
      sharpeRatio: stats.volatility > 0 ? (stats.expectedReturn - riskFreeRate) / stats.volatility : 0,
      method,
    },
    frontier,
    simulated: samplePortfolios(expectedReturns, covMatrix, riskFreeRate, lb, ub, numSamples, random),
  };
}

/** Async wrapper kept for callers that ran the previous sampling optimizer. */
export async function optimizePortfolio(
  expectedReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number,
  numSamples: number = 2000,
  _onProgress?: (progress: number) => void,
  maxWeights?: number[],
  minWeights?: number[]
): Promise<PortfolioOptimization> {
  return solvePortfolio(expectedReturns, covMatrix, riskFreeRate, maxWeights, minWeights, numSamples);
}
