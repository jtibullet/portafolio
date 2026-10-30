/** Trading costs, all as fractions of the traded amount. */
export interface CostModel {
  /** Broker commission per trade */
  commission: number;
  /** Full bid-ask spread; each trade pays half of it */
  spread: number;
  /** Cost of converting USD↔CLP (spread on the exchange rate), paid when the trade needs a conversion */
  fx: number;
}

export const DEFAULT_COSTS: CostModel = { commission: 0, spread: 0.001, fx: 0.005 };

/** Estimated cost of one trade of `amount` (sign ignored). */
export function tradeCost(amount: number, costs: CostModel, needsConversion: boolean) {
  const rate = costs.commission + costs.spread / 2 + (needsConversion ? costs.fx : 0);
  return Math.abs(amount) * rate;
}
