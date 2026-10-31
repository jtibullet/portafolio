import { describe, it, expect } from 'vitest';
import { convertPrices } from './currency';

const rows = [
  { date: '2024-01-02', AAPL: 100, 'SQM-B.SN': 40000 },
  { date: '2024-01-03', AAPL: 110, 'SQM-B.SN': null },
];
const fx = [800, 1000];

describe('convertPrices', () => {
  it('converts USD assets to CLP with the rate of each day', () => {
    const clp = convertPrices(rows, ['AAPL', 'SQM-B.SN'], fx, 'CLP')!;
    expect(clp[0]).toEqual({ date: '2024-01-02', AAPL: 80000, 'SQM-B.SN': 40000 });
    // AAPL +10% in USD and the dollar +25%: +37.5% in CLP
    expect(Number(clp[1].AAPL) / Number(clp[0].AAPL)).toBeCloseTo(1.375, 12);
    expect(clp[1]['SQM-B.SN']).toBeNull();
  });

  it('converts Chilean assets to USD', () => {
    const usd = convertPrices(rows, ['AAPL', 'SQM-B.SN'], fx, 'USD')!;
    expect(usd[0]['SQM-B.SN']).toBe(50);
    expect(usd[0].AAPL).toBe(100);
  });

  it('needs the rate only when some asset is in the other currency', () => {
    expect(convertPrices(rows, ['AAPL'], null, 'USD')).toBe(rows);
    expect(convertPrices(rows, ['AAPL'], null, 'CLP')).toBeNull();
  });
});
