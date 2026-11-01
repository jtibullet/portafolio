/**
 * Expresses every price series in one currency, so returns include exchange-rate moves:
 * a US stock seen in CLP gains when the dollar rises, a Chilean stock seen in USD loses.
 */
import { assetCurrency, type Currency } from './orders';
import type { PriceRow } from '../types';

export type { Currency };

/**
 * Converts each symbol's prices to `currency` with `fx` (CLP per USD, one rate per row).
 * Returns the rows unchanged when no symbol needs converting, and null when one does but
 * there is no rate history.
 */
export function convertPrices(rows: PriceRow[], symbols: string[], fx: number[] | null, currency: Currency): PriceRow[] | null {
  const toConvert = symbols.filter(sym => assetCurrency(sym) !== currency);
  if (toConvert.length === 0) return rows;
  if (!fx || fx.length !== rows.length) return null;
  return rows.map((row, t) => {
    const next: PriceRow = { ...row };
    for (const sym of toConvert) {
      const p = row[sym];
      if (p === null || p === undefined) continue;
      next[sym] = currency === 'CLP' ? Number(p) * fx[t] : Number(p) / fx[t];
    }
    return next;
  });
}
