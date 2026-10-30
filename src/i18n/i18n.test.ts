import { describe, it, expect } from 'vitest';
import { es } from './es';
import { en } from './en';
import { translate } from './index';
import { createFormatters } from './format';

describe('dictionaries', () => {
  it('have the same keys and no empty strings', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const dict of [es, en]) {
      for (const [key, value] of Object.entries(dict)) expect(value, key).not.toBe('');
    }
  });

  it('use the same placeholders in both languages', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) || []).sort();
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(es[key]));
    }
  });
});

describe('translate', () => {
  it('fills placeholders and leaves unknown ones untouched', () => {
    expect(translate('es', 'params.assets', { max: 7 })).toBe('Activos (máx. 7)');
    expect(translate('en', 'params.assets', { max: 7 })).toBe('Assets (up to 7)');
    expect(translate('en', 'params.assets')).toBe('Assets (up to {max})');
  });
});

describe('formatters', () => {
  const es = createFormatters('es');
  const en = createFormatters('en');

  it('formats numbers with Chilean separators in Spanish', () => {
    expect(es.num(1234567.891, 2)).toBe('1.234.567,89');
    expect(es.num(1234.5, 1)).toBe('1.234,5');
    expect(en.num(1234567.891, 2)).toBe('1,234,567.89');
  });

  it('formats fractions as percentages', () => {
    expect(es.pct(0.12345)).toBe('12,35%');
    expect(en.pct(0.12345)).toBe('12.35%');
    expect(es.signedPct(0.05, 1)).toBe('+5,0%');
    expect(es.signedPct(-0.05, 1)).toBe('-5,0%');
  });

  it('formats money; CLP without decimals', () => {
    expect(es.money(1234567, 'CLP')).toBe('$1.234.567');
    expect(es.money(1234.5, 'USD')).toMatch(/^US\$\s?1\.234,50$/);
    expect(en.money(1234.5, 'USD')).toBe('$1,234.50');
  });
});
