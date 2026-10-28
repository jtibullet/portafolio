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

  it('is repeatable across runs (seeded)', async () => {
    const a = await runMonteCarlo(100, 0.05, 0.15, 1, 200, 2);
    const b = await runMonteCarlo(100, 0.05, 0.15, 1, 200, 2);
    expect(a.percentiles).toEqual(b.percentiles);
  });
});
