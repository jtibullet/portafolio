import { describe, it, expect } from 'vitest';
import { optimizePortfolio } from './optimization';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('optimizePortfolio', () => {
  const mu = [0.3, 0.05, 0.04];
  const cov = [[0.04, 0, 0], [0, 0.01, 0], [0, 0, 0.01]];

  it('returns fully invested weights within the bounds', async () => {
    const { optimal } = await optimizePortfolio(mu, cov, 0.02, 20000, undefined, [0.5, 0.5, 0.5], [0.05, 0.05, 0.05]);
    expect(sum(optimal.weights)).toBeCloseTo(1, 6);
    for (const w of optimal.weights) {
      expect(w).toBeGreaterThanOrEqual(0.05 - 1e-4);
      expect(w).toBeLessThanOrEqual(0.5 + 1e-4);
    }
  });

  it('approaches the analytic tangency portfolio for two uncorrelated assets', async () => {
    // Unconstrained tangency weights are proportional to (mu_i - rf) / sigma_i^2
    const m = [0.1, 0.06], v = [0.04, 0.01], rf = 0.02;
    const raw = m.map((x, i) => (x - rf) / v[i]);
    const tangency = raw.map(x => x / sum(raw));
    const { optimal } = await optimizePortfolio(m, [[v[0], 0], [0, v[1]]], rf, 20000, undefined, undefined, [0, 0]);
    expect(optimal.weights[0]).toBeCloseTo(tangency[0], 1);
    expect(optimal.weights[1]).toBeCloseTo(tangency[1], 1);
  });

  it('respects a set of maxima that sums to exactly 100%', async () => {
    const { optimal } = await optimizePortfolio(mu, cov, 0.02, 2000, undefined, [0.2, 0.4, 0.4], [0.05, 0.05, 0.05]);
    expect(optimal.weights[0]).toBeCloseTo(0.2, 3);
    expect(optimal.weights[1]).toBeCloseTo(0.4, 3);
    expect(optimal.weights[2]).toBeCloseTo(0.4, 3);
  });

  it('rejects infeasible bounds', async () => {
    await expect(optimizePortfolio(mu, cov, 0.02, 100, undefined, [0.2, 0.3, 0.3])).rejects.toThrow(/below 100%/);
    await expect(optimizePortfolio(mu, cov, 0.02, 100, undefined, undefined, [0.5, 0.5, 0.5])).rejects.toThrow(/exceed 100%/);
    await expect(optimizePortfolio(mu, cov, 0.02, 100, undefined, [0.1, 1, 1], [0.2, 0, 0])).rejects.toThrow(/exceeds maximum/);
  });

  it('builds an efficient frontier sorted by volatility', async () => {
    const { frontier } = await optimizePortfolio(mu, cov, 0.02, 5000);
    expect(frontier.length).toBeGreaterThan(1);
    for (let i = 1; i < frontier.length; i++) {
      expect(frontier[i].volatility).toBeGreaterThanOrEqual(frontier[i - 1].volatility);
    }
  });
});
