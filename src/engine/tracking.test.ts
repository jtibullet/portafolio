import { describe, it, expect } from 'vitest';
import { trackPortfolio } from './tracking';

const rows = [
  { date: '2025-01-02', A: 10, B: 50, BENCH: 100 },
  { date: '2025-01-03', A: 11, B: 50, BENCH: 101 },
  { date: '2025-01-06', A: 12, B: null, BENCH: 99 },
  { date: '2025-01-07', A: 12, B: 40, BENCH: 102 },
];

describe('trackPortfolio', () => {
  it('buys the weights on the first trading day on or after the saved date and holds them', () => {
    const r = trackPortfolio(rows, ['A', 'B'], [0.5, 0.5], 'BENCH', '2025-01-03', 0.1)!;
    expect(r.startDate).toBe('2025-01-03');
    expect(r.values[0]).toBe(100);
    // 50 in A at 11 and 50 in B at 50; B's missing price on Jan 6 holds the last one
    expect(r.values[1]).toBeCloseTo(50 * 12 / 11 + 50, 10);
    expect(r.values[2]).toBeCloseTo(50 * 12 / 11 + 40, 10);
    expect(r.totalReturn).toBeCloseTo(r.values[2] / 100 - 1, 12);
    expect(r.benchmarkReturn).toBeCloseTo(102 / 101 - 1, 12);
    expect(r.tradingDays).toBe(2);
    expect(r.expectedReturn).toBeCloseTo(Math.exp(0.1 * 2 / 252) - 1, 12);
    expect(r.maxDrawdown).toBeCloseTo(1 - r.values[2] / r.values[1], 10);
  });

  it('spreads the weight of a ticker with no prices over the rest', () => {
    const r = trackPortfolio(rows, ['A', 'GONE'], [0.6, 0.4], null, '2025-01-02', 0)!;
    expect(r.missing).toEqual(['GONE']);
    expect(r.values.at(-1)).toBeCloseTo(120, 10);
    expect(r.benchmarkValues).toBeNull();
  });

  it('returns null when nothing traded since the saved date', () => {
    expect(trackPortfolio(rows, ['A'], [1], null, '2025-02-01', 0)).toBeNull();
  });
});
