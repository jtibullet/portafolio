/**
 * Turns the calculator's target trades into broker orders: share counts at the current price,
 * rounded the way each broker allows, skipping orders below its minimum.
 */
export type BrokerId = 'zesty' | 'racional';
export type Currency = 'USD' | 'CLP';

export interface BrokerRules {
  /** Whether fractions of a share can be bought */
  fractional: boolean;
  /** Smallest order accepted, in the asset's currency */
  minOrder: number;
}

/**
 * Starting rules, editable in the calculator: Chilean stocks trade in whole shares on the Santiago
 * exchange; Racional allows fractional US shares. Check both against your broker's current terms.
 */
export const DEFAULT_BROKERS: Record<BrokerId, BrokerRules> = {
  zesty: { fractional: false, minOrder: 0 },
  racional: { fractional: true, minOrder: 1 },
};

/** Chilean (.SN) stocks go through Zesty in CLP; everything else through Racional in USD. */
export function brokerFor(symbol: string): BrokerId {
  return symbol.endsWith('.SN') ? 'zesty' : 'racional';
}

export function assetCurrency(symbol: string): Currency {
  return symbol.endsWith('.SN') ? 'CLP' : 'USD';
}

/** Converts between USD and CLP with `rate` CLP per USD. */
export function convert(amount: number, from: Currency, to: Currency, rate: number) {
  if (from === to) return amount;
  return from === 'USD' ? amount * rate : amount / rate;
}

/** Decimals kept for fractional shares */
const FRACTION_DECIMALS = 4;

export type OrderStatus = 'ok' | 'none' | 'belowMinimum' | 'noPrice' | 'noRate';

export interface PlannedOrder {
  status: OrderStatus;
  /** Signed: positive buys, negative sells */
  shares: number;
  /** Value of the rounded order in the calculator's currency (signed) */
  amount: number;
  /** Price in the asset's currency */
  price: number | null;
}

/**
 * Order for a trade of `tradeAmount` (signed, in `amountCurrency`). Rounds toward zero so a buy
 * never spends more than planned and a sell never exceeds the position.
 */
export function planOrder(
  tradeAmount: number,
  price: number | null | undefined,
  rules: BrokerRules,
  symbol: string,
  amountCurrency: Currency,
  rate: number | null,
): PlannedOrder {
  const none = { shares: 0, amount: 0, price: price ?? null };
  if (!price || !(price > 0)) return { status: 'noPrice', ...none };
  const currency = assetCurrency(symbol);
  if (currency !== amountCurrency && !(rate && rate > 0)) return { status: 'noRate', ...none };

  const local = convert(tradeAmount, amountCurrency, currency, rate ?? 1);
  const raw = local / price;
  const factor = rules.fractional ? 10 ** FRACTION_DECIMALS : 1;
  const shares = Math.trunc(raw * factor + (raw > 0 ? 1e-9 : -1e-9)) / factor;
  // A trade smaller than one share (or one fraction step) can't be placed
  if (shares === 0) return { status: tradeAmount === 0 ? 'none' : 'belowMinimum', ...none };
  const value = shares * price;
  if (Math.abs(value) < rules.minOrder) return { status: 'belowMinimum', ...none };
  return { status: 'ok', shares, amount: convert(value, currency, amountCurrency, rate ?? 1), price };
}

/** Assets whose current weight is more than `band` (absolute) away from the target. */
export function outOfBand(current: number[], target: number[], band: number) {
  return current.map((w, i) => Math.abs(w - target[i]) > band);
}
