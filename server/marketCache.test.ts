import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { createPriceCache, createTtlCache, mapWithConcurrency, PRICE_TTL_MS } from './marketCache';

const rows = [
  { date: '2024-01-02', adjClose: 10 },
  { date: '2024-06-03', adjClose: 11 },
  { date: '2025-01-02', adjClose: 12 },
];

for (const [label, makeDb] of [['memory', () => null], ['sqlite', () => new Database(':memory:')]] as const) {
  describe(`price cache (${label})`, () => {
    it('serves a fresh series that covers the requested start, filtered to it', () => {
      let t = 0;
      const cache = createPriceCache(makeDb(), () => t);
      cache.set('AAA', '2024-01-01', rows);
      expect(cache.get('AAA', '2024-06-01')).toEqual(rows.slice(1));
      expect(cache.get('AAA', '2024-01-01')).toEqual(rows);
    });

    it('misses when the series starts after the requested date, is stale, or is unknown', () => {
      let t = 0;
      const cache = createPriceCache(makeDb(), () => t);
      cache.set('AAA', '2024-01-01', rows);
      expect(cache.get('AAA', '2023-01-01')).toBeNull();
      expect(cache.get('BBB', '2024-01-01')).toBeNull();
      t = PRICE_TTL_MS + 1;
      expect(cache.get('AAA', '2024-01-01')).toBeNull();
    });

    it('replaces the stored series on refresh', () => {
      const cache = createPriceCache(makeDb(), () => 0);
      cache.set('AAA', '2024-01-01', rows);
      cache.set('AAA', '2024-01-01', [{ date: '2024-01-02', adjClose: 99 }]);
      expect(cache.get('AAA', '2024-01-01')).toEqual([{ date: '2024-01-02', adjClose: 99 }]);
    });
  });
}

describe('createTtlCache', () => {
  it('expires entries after the TTL', () => {
    let t = 0;
    const cache = createTtlCache<number>(1000, () => t);
    cache.set('x', 1);
    t = 999;
    expect(cache.get('x')).toBe(1);
    t = 1000;
    expect(cache.get('x')).toBeUndefined();
  });
});

describe('mapWithConcurrency', () => {
  it('keeps order and never exceeds the limit', async () => {
    let inFlight = 0, peak = 0;
    const result = await mapWithConcurrency([5, 1, 4, 2, 3, 0], 2, async (ms) => {
      peak = Math.max(peak, ++inFlight);
      await new Promise(r => setTimeout(r, ms));
      inFlight--;
      return ms * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30, 0]);
    expect(peak).toBe(2);
  });
});
