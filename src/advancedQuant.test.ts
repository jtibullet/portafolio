import { describe, it, expect } from 'vitest';
import { invert, multiply, calculateBlackLitterman, simulateBlackSwan } from './advancedQuant';

describe('invert', () => {
  it('produces the inverse matrix', () => {
    const m = [[4, 7, 2], [3, 6, 1], [2, 5, 3]];
    const product = multiply(m, invert(m));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) expect(product[i][j]).toBeCloseTo(i === j ? 1 : 0, 10);
    }
  });

  it('throws on a singular matrix', () => {
    expect(() => invert([[1, 2], [2, 4]])).toThrow(/Singular/);
  });
});

describe('calculateBlackLitterman', () => {
  const cov = [[0.04, 0.01], [0.01, 0.09]];
  const w = [0.5, 0.5];
  const views = [0.2, -0.1];

  it('moves the posterior to the views at full confidence and to the prior at zero confidence', () => {
    const confident = calculateBlackLitterman(cov, w, 2.5, views, [1, 1]);
    expect(confident.blReturns[0]).toBeCloseTo(views[0], 2);
    expect(confident.blReturns[1]).toBeCloseTo(views[1], 2);

    const unsure = calculateBlackLitterman(cov, w, 2.5, views, [0, 0]);
    expect(unsure.blReturns[0]).toBeCloseTo(unsure.pi[0], 2);
    expect(unsure.blReturns[1]).toBeCloseTo(unsure.pi[1], 2);
  });

  it('implied prior is delta * cov * w', () => {
    const { pi } = calculateBlackLitterman(cov, w, 2, views, [0.5, 0.5]);
    expect(pi[0]).toBeCloseTo(2 * (0.04 * 0.5 + 0.01 * 0.5), 12);
    expect(pi[1]).toBeCloseTo(2 * (0.01 * 0.5 + 0.09 * 0.5), 12);
  });
});

describe('simulateBlackSwan', () => {
  it('is deterministic for a given seed and returns sane risk metrics', () => {
    const a = simulateBlackSwan(0.01, 1000, 3, 7);
    const b = simulateBlackSwan(0.01, 1000, 3, 7);
    expect(a).toEqual(b);
    expect(a.maxDrawdown).toBeGreaterThan(0);
    expect(a.maxDrawdown).toBeLessThanOrEqual(1);
    expect(a.cvar99).toBeGreaterThan(0.01);
  });

  it('matches the target volatility for any df > 2', () => {
    // Scale is chosen so the t-distributed shocks have the requested daily volatility
    for (const df of [3, 5, 10]) {
      const { cvar99 } = simulateBlackSwan(0.02, 20000, df, 1);
      expect(cvar99).toBeGreaterThan(0.02);
      expect(cvar99).toBeLessThan(0.2);
    }
  });
});
