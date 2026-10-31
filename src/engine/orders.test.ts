import { describe, it, expect } from 'vitest';
import { brokerFor, convert, DEFAULT_BROKERS, outOfBand, planOrder } from './orders';

const whole = { fractional: false, minOrder: 0 };
const fractional = { fractional: true, minOrder: 1 };

describe('planOrder', () => {
  it('assigns Chilean stocks to Zesty and the rest to Racional', () => {
    expect(brokerFor('SQM-B.SN')).toBe('zesty');
    expect(brokerFor('AAPL')).toBe('racional');
    expect(DEFAULT_BROKERS.zesty.fractional).toBe(false);
  });

  it('rounds whole shares toward zero for buys and sells', () => {
    expect(planOrder(1050, 100, whole, 'AAPL', 'USD', null)).toMatchObject({ status: 'ok', shares: 10, amount: 1000 });
    expect(planOrder(-1050, 100, whole, 'AAPL', 'USD', null)).toMatchObject({ status: 'ok', shares: -10, amount: -1000 });
  });

  it('keeps four decimals for fractional shares', () => {
    const o = planOrder(100, 300, fractional, 'AAPL', 'USD', null);
    expect(o.shares).toBe(0.3333);
    expect(o.amount).toBeCloseTo(99.99, 10);
  });

  it('converts the amount to the asset currency and back', () => {
    // 1.000.000 CLP at 1.000 CLP/USD = 1.000 USD = 5 shares of 200 USD
    const o = planOrder(1_000_000, 200, whole, 'MSFT', 'CLP', 1000);
    expect(o).toMatchObject({ status: 'ok', shares: 5, amount: 1_000_000 });
    // 100 USD at 950 CLP/USD = 95.000 CLP = 9 shares of 10.000 CLP
    expect(planOrder(100, 10_000, whole, 'SQM-B.SN', 'USD', 950)).toMatchObject({ shares: 9 });
    expect(convert(950, 'CLP', 'USD', 950)).toBe(1);
  });

  it('flags orders below one share or the broker minimum, and missing prices or rates', () => {
    expect(planOrder(50, 100, whole, 'AAPL', 'USD', null).status).toBe('belowMinimum');
    expect(planOrder(0.5, 100, fractional, 'AAPL', 'USD', null).status).toBe('belowMinimum');
    expect(planOrder(0, 100, whole, 'AAPL', 'USD', null).status).toBe('none');
    expect(planOrder(500, null, whole, 'AAPL', 'USD', null).status).toBe('noPrice');
    expect(planOrder(500, 100, whole, 'AAPL', 'CLP', null).status).toBe('noRate');
  });
});

describe('outOfBand', () => {
  it('flags weights further than the band from target', () => {
    expect(outOfBand([0.5, 0.3, 0.2], [0.4, 0.33, 0.27], 0.05)).toEqual([true, false, true]);
  });
});
