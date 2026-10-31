import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from './monteCarlo';

describe('runMonteCarlo', () => {
  it('is deterministic with zero volatility: S0 * exp(mu * T)', async () => {
    const r = await runMonteCarlo(100, 0.08, 0, 2, 50, 5);
    expect(r.percentiles.p50).toBeCloseTo(100 * Math.exp(0.08 * 2), 6);
    expect(r.percentiles.p5).toBeCloseTo(r.percentiles.p95, 6);
  });

  it('median matches the log-drift GBM median and percentiles are ordered', async () => {
    const r = await runMonteCarlo(100, 0.08, 0.2, 5, 4000, 10);
    expect(r.percentiles.p50 / (100 * Math.exp(0.08 * 5))).toBeGreaterThan(0.95);
    expect(r.percentiles.p50 / (100 * Math.exp(0.08 * 5))).toBeLessThan(1.05);
    expect(r.percentiles.p5).toBeLessThan(r.percentiles.p50);
    expect(r.percentiles.p50).toBeLessThan(r.percentiles.p95);
    expect(r.paths).toHaveLength(10);
    expect(r.paths[0]).toHaveLength(5 * 252 + 1);
    expect(r.finalValues).toHaveLength(4000);
  });

  it('adds monthly contributions and reports the probability of reaching a goal', async () => {
    const r = await runMonteCarlo(1000, 0, 0, 1, 20, 1, undefined, { monthlyContribution: 100, goal: 2200 });
    // 252 steps = 12 contributions of 100 with no growth
    expect(r.totalContributed).toBe(2200);
    expect(r.percentiles.p50).toBeCloseTo(2200, 8);
    expect(r.goalProbability).toBe(1);
    const higher = await runMonteCarlo(1000, 0, 0, 1, 20, 1, undefined, { monthlyContribution: 100, goal: 2201 });
    expect(higher.goalProbability).toBe(0);
    expect((await runMonteCarlo(1000, 0.05, 0.2, 1, 20, 1)).goalProbability).toBeNull();
  });

  it('is repeatable across runs (seeded)', async () => {
    const a = await runMonteCarlo(100, 0.05, 0.15, 1, 200, 2);
    const b = await runMonteCarlo(100, 0.05, 0.15, 1, 200, 2);
    expect(a.percentiles).toEqual(b.percentiles);
  });
});
