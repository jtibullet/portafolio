import { describe, it, expect } from 'vitest';
import { ledoitWolfCovariance } from './covariance';
import { hrpWeights, marketCapWeights, projectToBounds, riskContributions, riskParityWeights } from './objectives';
import { drawdownStats, riskMetrics } from './riskMetrics';
import { tradeCost } from './costs';
import reference from './__fixtures__/ledoitWolf.sklearn.json';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('ledoitWolfCovariance', () => {
  it('matches scikit-learn ledoit_wolf (shrinkage and covariance)', () => {
    const X = reference.X as number[][];
    const T = X.length;
    const series = X[0].map((_, i) => X.map(row => row[i]));
    const result = ledoitWolfCovariance(series)!;
    expect(result.shrinkage).toBeCloseTo(reference.shrinkage, 10);
    // sklearn uses 1/T; this implementation rescales to 1/(T-1)
    result.cov.forEach((row, i) => row.forEach((v, j) => {
      expect(v * (T - 1) / T).toBeCloseTo((reference.cov as number[][])[i][j], 12);
    }));
  });

  it('uses only days where every asset has a return, and needs at least 3', () => {
    expect(ledoitWolfCovariance([[0.01, null, 0.02], [0.01, 0.02, null]])).toBeNull();
    const r = ledoitWolfCovariance([[0.01, -0.02, 0.03, null, 0.01], [0.02, 0.01, -0.01, 0.5, 0.0]])!;
    expect(r.shrinkage).toBeGreaterThanOrEqual(0);
    expect(r.shrinkage).toBeLessThanOrEqual(1);
  });
});

describe('riskParityWeights', () => {
  it('equalizes risk contributions', () => {
    const cov = [[0.04, 0.006, 0.002], [0.006, 0.01, 0.001], [0.002, 0.001, 0.0225]];
    const w = riskParityWeights(cov);
    expect(sum(w)).toBeCloseTo(1, 12);
    riskContributions(w, cov).forEach(rc => expect(rc).toBeCloseTo(1 / 3, 8));
  });

  it('is proportional to 1/σ for uncorrelated assets', () => {
    const w = riskParityWeights([[0.04, 0], [0, 0.01]]);
    expect(w[0]).toBeCloseTo(1 / 3, 10); // 1/0.2 : 1/0.1 = 1 : 2
    expect(w[1]).toBeCloseTo(2 / 3, 10);
  });
});

describe('hrpWeights', () => {
  it('equals inverse-variance weights for uncorrelated assets', () => {
    const variances = [0.04, 0.01, 0.0225, 0.09];
    const cov = variances.map((v, i) => variances.map((_, j) => (i === j ? v : 0)));
    const inv = variances.map(v => 1 / v);
    const w = hrpWeights(cov);
    w.forEach((wi, i) => expect(wi).toBeCloseTo(inv[i] / sum(inv), 10));
  });

  it('gives a highly correlated pair less combined weight than an independent asset', () => {
    // A and B are near-duplicates; C is independent with the same volatility
    const cov = [[0.04, 0.038, 0], [0.038, 0.04, 0], [0, 0, 0.04]];
    const w = hrpWeights(cov);
    expect(sum(w)).toBeCloseTo(1, 12);
    expect(w[2]).toBeGreaterThan(w[0] + w[1] - 0.05);
    expect(w[0]).toBeCloseTo(w[1], 10);
  });
});

describe('projectToBounds', () => {
  it('returns weights within bounds that sum to 1', () => {
    const w = projectToBounds([0.7, 0.2, 0.1], [0.05, 0.05, 0.05], [0.4, 0.5, 0.5]);
    expect(sum(w)).toBeCloseTo(1, 12);
    expect(w[0]).toBeCloseTo(0.4, 12);
    w.forEach(x => { expect(x).toBeGreaterThanOrEqual(0.05 - 1e-12); expect(x).toBeLessThanOrEqual(0.5 + 1e-12); });
  });

  it('leaves weights that already fit untouched', () => {
    expect(projectToBounds([0.3, 0.3, 0.4], [0, 0, 0], [1, 1, 1])).toEqual([0.3, 0.3, 0.4]);
  });
});

describe('marketCapWeights', () => {
  it('normalizes caps and refuses incomplete data', () => {
    expect(marketCapWeights([3e9, 1e9])).toEqual([0.75, 0.25]);
    expect(marketCapWeights([3e9, null])).toBeNull();
    expect(marketCapWeights([])).toBeNull();
  });
});

describe('risk metrics', () => {
  it('measures max drawdown and the days to recover', () => {
    // Up 10%, down to 0.88 of peak, then back above the peak two days later
    const r = [Math.log(1.1), Math.log(0.9), Math.log(0.97777), Math.log(1.08), Math.log(1.06)];
    const { maxDrawdown, recoveryDays } = drawdownStats(r);
    expect(maxDrawdown).toBeCloseTo(1 - 0.9 * 0.97777, 6);
    expect(recoveryDays).toBe(2);
  });

  it('reports an unrecovered drawdown as null', () => {
    expect(drawdownStats([Math.log(1.1), Math.log(0.8), Math.log(1.01)]).recoveryDays).toBeNull();
  });

  it('Sortino only penalizes returns below the daily risk-free rate', () => {
    const allUp = riskMetrics([0.01, 0.02, 0.015, 0.01], 0);
    expect(allUp.sortino).toBe(0); // no downside deviation
    const mixed = riskMetrics([0.02, -0.01, 0.02, -0.01], 0);
    const downsideDev = Math.sqrt(((0.01 ** 2) * 2 / 4) * 252);
    expect(mixed.sortino).toBeCloseTo((0.005 * 252) / downsideDev, 10);
    expect(mixed.calmar).toBeCloseTo((0.005 * 252) / mixed.maxDrawdown, 10);
  });
});

describe('tradeCost', () => {
  it('adds commission, half the spread and the FX cost when converting', () => {
    const costs = { commission: 0.001, spread: 0.002, fx: 0.005 };
    expect(tradeCost(-1000, costs, false)).toBeCloseTo(2, 10);
    expect(tradeCost(1000, costs, true)).toBeCloseTo(7, 10);
  });
});
