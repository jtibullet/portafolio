import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { es } from './es';
import { en } from './en';
import { createFormatters, type Formatters, type Lang } from './format';

export type { Lang } from './format';
export type MessageKey = keyof typeof es;
type Vars = Record<string, string | number>;

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { es, en };

/** Yahoo Finance sector names (and the server's fallbacks) shown in Spanish. */
const SECTORS_ES: Record<string, string> = {
  'Technology': 'Tecnología',
  'Healthcare': 'Salud',
  'Financial Services': 'Servicios financieros',
  'Consumer Cyclical': 'Consumo cíclico',
  'Consumer Defensive': 'Consumo defensivo',
  'Industrials': 'Industria',
  'Energy': 'Energía',
  'Utilities': 'Servicios básicos',
  'Real Estate': 'Inmobiliario',
  'Basic Materials': 'Materiales básicos',
  'Communication Services': 'Comunicaciones',
};
const SECTORS_EN: Record<string, string> = { 'Variado': 'Mixed', 'ETF / Fondo': 'ETF / Fund' };

export function translate(lang: Lang, key: MessageKey, vars?: Vars) {
  const template = MESSAGES[lang][key] ?? key;
  return vars ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : template;
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  f: Formatters;
  /** Sector name from the metadata, in the current language */
  sector: (name: string) => string;
  /** "1 año" / "5 años" */
  years: (n: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = usePersistentState<Lang>('lang', 'es');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18n>(() => {
    const t = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
    return {
      lang,
      setLang,
      t,
      f: createFormatters(lang),
      sector: (name: string) => (lang === 'es' ? SECTORS_ES[name] : SECTORS_EN[name]) ?? name,
      years: (n: number) => (n === 1 ? t('params.oneYear') : t('params.nYears', { n })),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
