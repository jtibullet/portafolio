export type Lang = 'es' | 'en';

export const LOCALES: Record<Lang, string> = { es: 'es-CL', en: 'en-US' };

/**
 * Locale-aware number formatting. Spanish follows Chilean conventions (1.234.567,89).
 * Grouping is forced so 4-digit numbers are grouped too (CLDR skips them for Spanish).
 */
export function createFormatters(lang: Lang) {
  const locale = LOCALES[lang];
  const cache = new Map<string, Intl.NumberFormat>();
  const nf = (key: string, options: Intl.NumberFormatOptions) => {
    let f = cache.get(key);
    if (!f) {
      f = new Intl.NumberFormat(locale, { useGrouping: 'always', ...options } as Intl.NumberFormatOptions);
      cache.set(key, f);
    }
    return f;
  };

  const num = (value: number, digits = 2) =>
    nf(`n${digits}`, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

  return {
    locale,
    num,
    /** A fraction shown as a percentage: 0.1234 -> "12,34%" */
    pct: (fraction: number, digits = 2) => `${num(fraction * 100, digits)}%`,
    /** Like pct but with an explicit "+" for positive values */
    signedPct: (fraction: number, digits = 2) => `${fraction > 0 ? '+' : ''}${num(fraction * 100, digits)}%`,
    /** Currency amount; CLP has no decimals */
    money: (value: number, currency: 'USD' | 'CLP' = 'USD', digits?: number) => {
      const d = digits ?? (currency === 'CLP' ? 0 : 2);
      return nf(`c${currency}${d}`, { style: 'currency', currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(value);
    },
    /** Short form for axes: 1.2K / 3,4 M */
    compact: (value: number, digits = 0) => nf(`k${digits}`, { notation: 'compact', maximumFractionDigits: digits }).format(value),
    dateTime: (value: string | number | Date) => new Date(value).toLocaleString(locale),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
