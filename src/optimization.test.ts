import { describe, it, expect } from 'vitest';
import { optimizePortfolio, solvePortfolio, maximumSharpe, minimumVariance } from './optimization';
import { mulberry32 } from './utils/quantMath';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sharpe = (w: number[], mu: number[], cov: number[][], rf: number) => {
  const ret = sum(w.map((wi, i) => wi * mu[i]));
  const variance = sum(w.map((wi, i) => sum(w.map((wj, j) => wi * cov[i][j] * wj))));
  return (ret - rf) / Math.sqrt(variance);
};

/** A random positive-definite covariance matrix (A·Aᵀ + small diagonal). */
function randomProblem(n: number, seed: number) {
  const rand = mulberry32(seed);
  const A = Array.from({ length: n }, () => Array.from({ length: n }, () => (rand() - 0.5) * 0.4));
  const cov = A.map((ri) => A.map(rj => sum(ri.map((v, k) => v * rj[k])))).map((row, i) => row.map((v, j) => v + (i === j ? 0.01 : 0)));
  const mu = Array.from({ length: n }, () => 0.02 + rand() * 0.2);
  return { mu, cov, rand };
}

describe('solvePortfolio', () => {
  const mu = [0.3, 0.05, 0.04];
  const cov = [[0.04, 0, 0], [0, 0.01, 0], [0, 0, 0.01]];

  it('returns fully invested weights within the bounds', () => {
    const { optimal } = solvePortfolio(mu, cov, 0.02, [0.5, 0.5, 0.5], [0.05, 0.05, 0.05]);
    expect(sum(optimal.weights)).toBeCloseTo(1, 10);
    for (const w of optimal.weights) {
      expect(w).toBeGreaterThanOrEqual(0.05 - 1e-4);
      expect(w).toBeLessThanOrEqual(0.5 + 1e-4);
    }
    expect(optimal.method).toBe('maxSharpe');
  });

  it('matches the analytic tangency portfolio for uncorrelated assets', () => {
    // Unconstrained tangency weights are proportional to (mu_i - rf) / sigma_i^2
    const m = [0.1, 0.06], v = [0.04, 0.01], rf = 0.02;
    const raw = m.map((x, i) => (x - rf) / v[i]);
    const tangency = raw.map(x => x / sum(raw));
    const { optimal } = solvePortfolio(m, [[v[0], 0], [0, v[1]]], rf, undefined, [0, 0]);
    expect(optimal.weights[0]).toBeCloseTo(tangency[0], 4);
    expect(optimal.weights[1]).toBeCloseTo(tangency[1], 4);
  });

  it('beats or matches every random portfolio within the same bounds', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { mu: m, cov: c, rand } = randomProblem(8, seed);
      const lb = Array(8).fill(0.02), ub = Array(8).fill(0.4);
      const { optimal, simulated } = solvePortfolio(m, c, 0.02, ub, lb, 5000, rand);
      const bestSampled = Math.max(...simulated.map(p => p.sharpeRatio));
      // Rounding weights to 4 decimals can cost a hair of Sharpe
      expect(optimal.sharpeRatio).toBeGreaterThanOrEqual(bestSampled - 1e-3);
      optimal.weights.forEach(w => {
        expect(w).toBeGreaterThanOrEqual(0.02 - 1e-4);
        expect(w).toBeLessThanOrEqual(0.4 + 1e-4);
      });
    }
  });

  it('handles 30 assets quickly', () => {
    const { mu: m, cov: c } = randomProblem(30, 9);
    const start = performance.now();
    const { optimal, frontier } = solvePortfolio(m, c, 0.02, Array(30).fill(0.2), Array(30).fill(0), 500);
    expect(performance.now() - start).toBeLessThan(2000);
    expect(sum(optimal.weights)).toBeCloseTo(1, 10);
    expect(frontier.length).toBeGreaterThan(20);
  });

  it('respects a set of maxima that sums to exactly 100%', () => {
    const { optimal } = solvePortfolio(mu, cov, 0.02, [0.2, 0.4, 0.4], [0.05, 0.05, 0.05]);
    expect(optimal.weights[0]).toBeCloseTo(0.2, 4);
    expect(optimal.weights[1]).toBeCloseTo(0.4, 4);
    expect(optimal.weights[2]).toBeCloseTo(0.4, 4);
  });

  it('falls back to minimum variance when nothing beats the risk-free rate', () => {
    const { optimal } = solvePortfolio([0.01, 0.02], [[0.04, 0], [0, 0.01]], 0.05, undefined, [0, 0]);
    expect(optimal.method).toBe('minVariance');
    // Minimum variance for uncorrelated assets: weights proportional to 1/variance
    expect(optimal.weights[0]).toBeCloseTo(0.2, 4);
    expect(optimal.weights[1]).toBeCloseTo(0.8, 4);
  });

  it('rejects infeasible bounds', async () => {
    await expect(optimizePortfolio(mu, cov, 0.02, 100, undefined, [0.2, 0.3, 0.3])).rejects.toThrow(/below 100%/);
    await expect(optimizePortfolio(mu, cov, 0.02, 100, undefined, undefined, [0.5, 0.5, 0.5])).rejects.toThrow(/exceed 100%/);
    await expect(optimizePortfolio(mu, cov, 0.02, 100, undefined, [0.1, 1, 1], [0.2, 0, 0])).rejects.toThrow(/exceeds maximum/);
  });

  it('builds an efficient frontier sorted by volatility whose return rises with risk', () => {
    const { frontier, optimal } = solvePortfolio(mu, cov, 0.02, undefined, [0, 0, 0]);
    expect(frontier.length).toBeGreaterThan(10);
    for (let i = 1; i < frontier.length; i++) {
      expect(frontier[i].volatility).toBeGreaterThanOrEqual(frontier[i - 1].volatility);
      expect(frontier[i].expectedReturn).toBeGreaterThanOrEqual(frontier[i - 1].expectedReturn - 1e-9);
    }
    // The optimal portfolio lies on the frontier
    expect(frontier.some(p => Math.abs(p.volatility - optimal.volatility) < 1e-9)).toBe(true);
  });
});

describe('QP building blocks', () => {
  it('minimumVariance hits the requested target return', () => {
    const m = [0.1, 0.05, 0.08];
    const c = [[0.04, 0.01, 0], [0.01, 0.02, 0.005], [0, 0.005, 0.03]];
    const w = minimumVariance(c, [0, 0, 0], [1, 1, 1], { mu: m, value: 0.08 });
    expect(sum(w)).toBeCloseTo(1, 8);
    expect(sum(w.map((wi, i) => wi * m[i]))).toBeCloseTo(0.08, 8);
  });

  it('maximumSharpe is not improved by small feasible perturbations', () => {
    const { mu: m, cov: c } = randomProblem(5, 11);
    const w = maximumSharpe(m, c, 0.02, Array(5).fill(0), Array(5).fill(1))!;
    const best = sharpe(w, m, c, 0.02);
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (i === j || w[j] < 0.01) continue;
        const moved = [...w];
        moved[i] += 0.01;
        moved[j] -= 0.01;
        expect(sharpe(moved, m, c, 0.02)).toBeLessThanOrEqual(best + 1e-9);
      }
    }
  });
});
