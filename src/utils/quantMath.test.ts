import { describe, it, expect } from 'vitest';
import {
  calculateLogReturns, mean, variance, stdDev, covariance, correlation, calculateBeta,
  calculateCAPM, calculateJensensAlpha, calculateARIMA111, calculateAlphaSignal,
  mulberry32, calculateBlackLittermanPosterior,
} from './quantMath';

describe('calculateLogReturns', () => {
  it('computes ln(Pt/Pt-1) and keeps gaps as null', () => {
    const r = calculateLogReturns([100, 110, null, 121]);
    expect(r).toHaveLength(3);
    expect(r[0]).toBeCloseTo(Math.log(1.1), 12);
    expect(r[1]).toBeNull();
    expect(r[2]).toBeNull();
  });

  it('returns null for non-positive prices', () => {
    expect(calculateLogReturns([0, 10, -5, 10])).toEqual([null, null, null]);
  });
});

describe('descriptive statistics', () => {
  it('mean ignores nulls', () => {
    expect(mean([1, null, 3])).toBe(2);
    expect(mean([null, null])).toBe(0);
  });

  it('variance and stdDev use the sample (n-1) estimator by default', () => {
    expect(variance([1, 2, 3, 4])).toBeCloseTo(5 / 3, 12);
    expect(variance([1, 2, 3, 4], false)).toBeCloseTo(1.25, 12);
    expect(stdDev([1, 2, 3, 4])).toBeCloseTo(Math.sqrt(5 / 3), 12);
  });

  it('covariance uses pairwise deletion', () => {
    // The pair at index 1 is dropped because one side is missing
    expect(covariance([1, 100, 2, 3], [2, null, 4, 6])).toBeCloseTo(covariance([1, 2, 3], [2, 4, 6]), 12);
    expect(covariance([1, 2, 3], [2, 4, 6])).toBeCloseTo(2, 12);
  });

  it('correlation is ±1 for linear relations and 0 for a constant series', () => {
    expect(correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 12);
    expect(correlation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 12);
    expect(correlation([1, 2, 3], [5, 5, 5])).toBe(0);
  });
});

describe('CAPM', () => {
  it('beta of an asset that moves 2x the benchmark is 2', () => {
    const bench = [0.01, -0.02, 0.015, 0.003, -0.007];
    expect(calculateBeta(bench.map(b => 2 * b), bench)).toBeCloseTo(2, 10);
  });

  it('CAPM return and Jensen alpha', () => {
    expect(calculateCAPM(0.04, 1.5, 0.1)).toBeCloseTo(0.13, 12);
    expect(calculateJensensAlpha(0.15, 0.13)).toBeCloseTo(0.02, 12);
  });
});

describe('calculateARIMA111', () => {
  it('requires at least 10 prices', () => {
    expect(() => calculateARIMA111([1, 2, 3])).toThrow();
  });

  it('extends an upward linear trend', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + i);
    const f = calculateARIMA111(prices, 10);
    expect(f.forecastedPrices).toHaveLength(10);
    expect(f.forecastedPrices[9]).toBeGreaterThan(prices[prices.length - 1]);
    expect(f.expectedReturn).toBeGreaterThan(0);
  });
});

describe('calculateAlphaSignal', () => {
  it('signals Buy on a rising series and Sell on a falling one', () => {
    const up = Array.from({ length: 60 }, (_, i) => 100 + i);
    const down = Array.from({ length: 60 }, (_, i) => 200 - i);
    expect(calculateAlphaSignal('UP', up).currentSignal).toBe('Buy');
    expect(calculateAlphaSignal('DOWN', down).currentSignal).toBe('Sell');
    expect(calculateAlphaSignal('UP', up).sma30[28]).toBeNull();
  });
});

describe('mulberry32', () => {
  it('is deterministic for a given seed and stays in [0, 1)', () => {
    const a = mulberry32(7), b = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('calculateBlackLittermanPosterior', () => {
  it('returns the prior when the views equal the implied prior', () => {
    const cov = [[0.04, 0.01], [0.01, 0.09]];
    const w = [0.5, 0.5];
    const delta = 2.5;
    const prior = cov.map(row => delta * (row[0] * w[0] + row[1] * w[1]));
    const P = [[1, 0], [0, 1]];
    const posterior = calculateBlackLittermanPosterior(cov, w, prior, P, delta, 0.05);
    expect(posterior[0]).toBeCloseTo(prior[0], 10);
    expect(posterior[1]).toBeCloseTo(prior[1], 10);
  });
});
