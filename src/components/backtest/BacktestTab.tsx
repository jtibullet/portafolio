import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '../../lib/cn';
import { useI18n, type MessageKey } from '../../i18n';
import { CHART } from '../../lib/chartTheme';
import { runJob } from '../../worker/client';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUiState } from '../../hooks/useUiState';
import { DEFAULT_COSTS, type CostModel } from '../../engine/costs';
import type { BacktestResult, BacktestStrategy, RebalanceFrequency, StrategyResult } from '../../engine/backtest';
import { CostSettings } from '../ui/CostSettings';
import { SectionHeader } from '../ui/SectionTitle';
import type { PortfolioParams, PriceRow } from '../../types';

type Strategy = StrategyResult['strategy'];

const LOOKBACKS = [126, 252, 504];
const FREQUENCIES: RebalanceFrequency[] = ['monthly', 'quarterly', 'annual'];
const COLORS: Record<Strategy, string> = {
  maxSharpe: '#2563eb',
  minVariance: '#16a34a',
  riskParity: '#d97706',
  hrp: '#9333ea',
  equalWeight: '#0891b2',
  benchmark: '#9ca3af',
};
/** Points per line on the charts; daily data over 10 years would make the SVG slow */
const CHART_POINTS = 300;
const axisTick = { fontSize: 10, fontFamily: 'monospace', fill: CHART.axis };
const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right whitespace-nowrap";
const td = "p-2 border-r border-zinc-200 text-right whitespace-nowrap";

interface Settings {
  lookbackDays: number;
  frequency: RebalanceFrequency;
}

function useBacktest(historicalData: PriceRow[], symbols: string[], params: PortfolioParams, settings: Settings, costs: CostModel, baseCurrency: 'USD' | 'CLP') {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const { selectedTickers, selectedBenchmark, riskFreeRate, minWeights, maxWeights, covarianceMethod } = params;
  const inputs = useDebouncedValue(
    useMemo(() => ({ selectedTickers, selectedBenchmark, riskFreeRate, minWeights, maxWeights, covarianceMethod, settings, costs, baseCurrency }),
      [selectedTickers, selectedBenchmark, riskFreeRate, minWeights, maxWeights, covarianceMethod, settings, costs, baseCurrency]),
    400,
  );

  useEffect(() => {
    let cancelled = false;
    setRunning(true);
    runJob('backtest', {
      historicalData,
      tickers: inputs.selectedTickers.filter(sym => symbols.includes(sym)),
      benchmark: inputs.selectedBenchmark,
      riskFreeRate: inputs.riskFreeRate,
      minWeights: inputs.minWeights,
      maxWeights: inputs.maxWeights,
      covarianceMethod: inputs.covarianceMethod,
      lookbackDays: inputs.settings.lookbackDays,
      frequency: inputs.settings.frequency,
      costs: inputs.costs,
      baseCurrency: inputs.baseCurrency,
    })
      .then(r => { if (!cancelled) setResult(r); })
      .catch(err => console.error('Backtest failed', err))
      .finally(() => { if (!cancelled) setRunning(false); });
    return () => { cancelled = true; };
  }, [historicalData, symbols, inputs]);

  return { result, running };
}

function useStrategyName() {
  const { t } = useI18n();
  return (s: Strategy, benchmark: string) =>
    s === 'benchmark' ? t('bt.benchmark', { symbol: benchmark })
      : s === 'equalWeight' ? t('bt.equalWeight')
      : t(`objective.${s}` as MessageKey);
}

/** Every k-th row (plus the last), enough for a chart. */
function downsample<T>(rows: T[]) {
  const stride = Math.max(1, Math.ceil(rows.length / CHART_POINTS));
  const out = rows.filter((_, i) => i % stride === 0);
  if ((rows.length - 1) % stride !== 0) out.push(rows[rows.length - 1]);
  return out;
}

function SettingsBar({ settings, onChange, costs, onCostsChange, baseCurrency, onCurrencyChange }: {
  settings: Settings;
  onChange: (s: Settings) => void;
  costs: CostModel;
  onCostsChange: (c: CostModel) => void;
  baseCurrency: 'USD' | 'CLP';
  onCurrencyChange: (c: 'USD' | 'CLP') => void;
}) {
  const { t } = useI18n();
  const label = "block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1";
  const toggle = (active: boolean, i: number) => cn(
    "flex-1 px-3 py-2 text-[10px] font-bold uppercase transition-colors whitespace-nowrap",
    active ? "bg-ink text-paper" : "bg-zinc-50 hover:bg-zinc-200 text-ink",
    i > 0 && "border-l border-zinc-300",
  );
  return (
    <div className="bg-white border border-ink p-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className={label}>{t('bt.lookback')}</span>
          <div className="flex border border-zinc-300" role="group" aria-label={t('bt.lookback')}>
            {LOOKBACKS.map((days, i) => (
              <button key={days} aria-pressed={settings.lookbackDays === days} onClick={() => onChange({ ...settings, lookbackDays: days })} className={toggle(settings.lookbackDays === days, i)}>
                {t(`bt.lookback.${days}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>{t('bt.frequency')}</span>
          <div className="flex border border-zinc-300" role="group" aria-label={t('bt.frequency')}>
            {FREQUENCIES.map((freq, i) => (
              <button key={freq} aria-pressed={settings.frequency === freq} onClick={() => onChange({ ...settings, frequency: freq })} className={toggle(settings.frequency === freq, i)}>
                {t(`bt.freq.${freq}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>{t('bt.currency')}</span>
          <div className="flex border border-zinc-300" role="group" aria-label={t('bt.currency')}>
            {(['USD', 'CLP'] as const).map((c, i) => (
              <button key={c} aria-pressed={baseCurrency === c} onClick={() => onCurrencyChange(c)} className={toggle(baseCurrency === c, i)}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <CostSettings costs={costs} onChange={onCostsChange} />
      <p className="text-[10px] font-mono text-zinc-500">{t('bt.note')}</p>
    </div>
  );
}

function EquityChart({ result, selected, benchmark }: { result: Extract<BacktestResult, { ok: true }>; selected: BacktestStrategy; benchmark: string }) {
  const { t, f } = useI18n();
  const name = useStrategyName();
  const data = useMemo(() => downsample(result.dates.map((date, k) => ({
    date,
    ...Object.fromEntries(result.strategies.map(s => [s.strategy, s.values[k]])),
  }))), [result]);
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('bt.equityTitle')} />
      <div className="bg-white border border-ink p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="date" tick={axisTick} stroke={CHART.axis} minTickGap={40} tickFormatter={(d: string) => `${d.slice(5, 7)}/${d.slice(2, 4)}`} />
            <YAxis domain={['auto', 'auto']} tick={axisTick} stroke={CHART.axis} width={40} tickFormatter={(v: number) => f.num(v, 0)} />
            <Tooltip formatter={(v: number, key: string) => [f.num(v, 1), name(key as Strategy, benchmark)]} contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            <Legend formatter={(key: string) => name(key as Strategy, benchmark)} wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            {result.strategies.map(s => (
              <Line
                key={s.strategy}
                dataKey={s.strategy}
                stroke={COLORS[s.strategy]}
                strokeWidth={s.strategy === selected ? 2.5 : 1.2}
                strokeDasharray={s.strategy === 'benchmark' ? '5 5' : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricsTable({ result, selected, benchmark }: { result: Extract<BacktestResult, { ok: true }>; selected: BacktestStrategy; benchmark: string }) {
  const { t, f } = useI18n();
  const name = useStrategyName();
  const cols: { label: string; tip?: string; value: (s: StrategyResult) => string; metric?: (s: StrategyResult) => number; best?: 'min' | 'max' }[] = [
    { label: t('bt.cagr'), value: s => f.pct(s.metrics.cagr), metric: s => s.metrics.cagr, best: 'max' },
    { label: t('bt.vol'), value: s => f.pct(s.metrics.volatility), metric: s => s.metrics.volatility, best: 'min' },
    { label: t('metrics.sharpe'), value: s => f.num(s.metrics.sharpe), metric: s => s.metrics.sharpe, best: 'max' },
    { label: t('metrics.sortino'), value: s => f.num(s.metrics.sortino), metric: s => s.metrics.sortino, best: 'max' },
    { label: t('metrics.maxDrawdown'), value: s => `-${f.pct(s.metrics.maxDrawdown, 1)}`, metric: s => s.metrics.maxDrawdown, best: 'min' },
    { label: t('metrics.calmar'), value: s => f.num(s.metrics.calmar), metric: s => s.metrics.calmar, best: 'max' },
    { label: t('bt.turnover'), tip: t('bt.tip.turnover'), value: s => (s.strategy === 'benchmark' ? '—' : f.pct(s.metrics.annualTurnover, 0)) },
    { label: t('bt.cost'), tip: t('bt.tip.cost'), value: s => (s.strategy === 'benchmark' ? '—' : f.pct(s.metrics.annualCost, 2)) },
    { label: t('bt.final'), value: s => f.num(s.metrics.finalValue, 1), metric: s => s.metrics.finalValue, best: 'max' },
  ];
  const best = cols.map(c => {
    if (!c.metric) return null;
    const values = result.strategies.map(c.metric);
    return result.strategies[values.indexOf(c.best === 'max' ? Math.max(...values) : Math.min(...values))].strategy;
  });
  const fallbacks = result.strategies.filter(s => s.fallbacks > 0);

  return (
    <div className="flex flex-col">
      <SectionHeader title={t('bt.metricsTitle')} />
      <div className="bg-white border border-ink overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-panel">
              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">{t('bt.strategy')}</th>
              {cols.map(c => <th key={c.label} className={th} title={c.tip}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {result.strategies.map(s => (
              <tr key={s.strategy} className={cn("border-b border-zinc-100", s.strategy === selected && "bg-blue-50")}>
                <td className="p-2 border-r border-zinc-200 font-bold whitespace-nowrap">
                  <span className="inline-block w-2 h-2 mr-2 align-middle" style={{ backgroundColor: COLORS[s.strategy] }} />
                  {name(s.strategy, benchmark)}
                  {s.strategy === selected && <span className="ml-2 font-normal text-blue-600">{t('compare.selected')}</span>}
                </td>
                {cols.map((c, k) => (
                  <td key={c.label} className={cn(td, best[k] === s.strategy && "font-bold text-green-600")}>{c.value(s)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fallbacks.map(s => (
        <p key={s.strategy} className="text-[10px] font-mono text-orange-600 mt-1">
          {name(s.strategy, benchmark)}: {t('bt.fallbacks', { n: s.fallbacks })}
        </p>
      ))}
    </div>
  );
}

function DrawdownChart({ result, focus, benchmark }: { result: Extract<BacktestResult, { ok: true }>; focus: BacktestStrategy; benchmark: string }) {
  const { t, f } = useI18n();
  const name = useStrategyName();
  const data = useMemo(() => {
    const series = result.strategies.filter(s => s.strategy === focus || s.strategy === 'benchmark');
    const peaks = series.map(() => 0);
    return downsample(result.dates.map((date, k) => ({
      date,
      ...Object.fromEntries(series.map((s, i) => {
        peaks[i] = Math.max(peaks[i], s.values[k]);
        return [s.strategy, s.values[k] / peaks[i] - 1];
      })),
    })));
  }, [result, focus]);
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('bt.drawdownTitle')} />
      <div className="bg-white border border-ink p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="date" tick={axisTick} stroke={CHART.axis} minTickGap={40} tickFormatter={(d: string) => `${d.slice(5, 7)}/${d.slice(2, 4)}`} />
            <YAxis tick={axisTick} stroke={CHART.axis} width={44} tickFormatter={(v: number) => f.pct(v, 0)} />
            <Tooltip formatter={(v: number, key: string) => [f.pct(v, 1), name(key as Strategy, benchmark)]} contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            <Legend formatter={(key: string) => name(key as Strategy, benchmark)} wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            <Area dataKey="benchmark" stroke={COLORS.benchmark} fill={COLORS.benchmark} fillOpacity={0.15} isAnimationActive={false} />
            <Area dataKey={focus} stroke={COLORS[focus]} fill={COLORS[focus]} fillOpacity={0.3} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WeightsChart({ result, focus }: { result: Extract<BacktestResult, { ok: true }>; focus: BacktestStrategy }) {
  const { t, f } = useI18n();
  const name = useStrategyName();
  const strategy = result.strategies.find(s => s.strategy === focus)!;
  const data = result.rebalanceDates.map((date, k) => ({
    date,
    ...Object.fromEntries(result.tickers.map((sym, i) => [sym, strategy.weights[k][i]])),
  }));
  const color = (i: number) => `hsl(${Math.round((i * 360) / result.tickers.length)}, 60%, 50%)`;
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('bt.weightsTitle', { strategy: name(focus, '') })} />
      <div className="bg-white border border-ink p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }} barCategoryGap={1}>
            <XAxis dataKey="date" tick={axisTick} stroke={CHART.axis} minTickGap={30} tickFormatter={(d: string) => `${d.slice(5, 7)}/${d.slice(2, 4)}`} />
            <YAxis tick={axisTick} stroke={CHART.axis} width={40} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => f.pct(v, 0)} />
            <Tooltip formatter={(v: number, sym: string) => [f.pct(v, 1), sym]} contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} cursor={{ fill: CHART.cursor }} />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            {result.tickers.map((sym, i) => (
              <Bar key={sym} dataKey={sym} stackId="w" fill={color(i)} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function YearlyTable({ result, selected, benchmark }: { result: Extract<BacktestResult, { ok: true }>; selected: BacktestStrategy; benchmark: string }) {
  const { t, f } = useI18n();
  const name = useStrategyName();
  const years = Object.keys(result.strategies[0].yearlyReturns);
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('bt.yearlyTitle')} />
      <div className="bg-white border border-ink overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-panel">
              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">{t('bt.year')}</th>
              {result.strategies.map(s => (
                <th key={s.strategy} className={cn(th, s.strategy === selected && "bg-blue-50")}>{name(s.strategy, benchmark)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {years.map((year, k) => (
              <tr key={year} className="border-b border-zinc-100">
                <td className="p-2 border-r border-zinc-200 font-bold">{year}{k === 0 || k === years.length - 1 ? '*' : ''}</td>
                {result.strategies.map(s => {
                  const r = s.yearlyReturns[year];
                  return <td key={s.strategy} className={cn(td, s.strategy === selected && "bg-blue-50", r >= 0 ? "text-green-600" : "text-red-600")}>{f.signedPct(r, 1)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-mono text-zinc-500 mt-1">{t('bt.partialYears')}</p>
    </div>
  );
}

/** Walk-forward backtest of every portfolio rule, with trading costs. */
export function BacktestTab({ historicalData, symbols, params }: { historicalData: PriceRow[]; symbols: string[]; params: PortfolioParams }) {
  const { t, f } = useI18n();
  const [settings, setSettings] = usePersistentState<Settings>('backtest:settings', { lookbackDays: 252, frequency: 'quarterly' });
  const [costs, setCosts] = usePersistentState<CostModel>('tradeCosts', DEFAULT_COSTS);
  const [baseCurrency, setBaseCurrency] = useUiState<'USD' | 'CLP'>('calc:currency', 'USD');
  const [focus, setFocus] = useState<BacktestStrategy>(params.objective);
  useEffect(() => setFocus(params.objective), [params.objective]);
  const { result, running } = useBacktest(historicalData, symbols, params, settings, costs, baseCurrency);
  const name = useStrategyName();
  const benchmark = params.selectedBenchmark;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <SettingsBar
        settings={settings}
        onChange={setSettings}
        costs={costs}
        onCostsChange={setCosts}
        baseCurrency={baseCurrency}
        onCurrencyChange={setBaseCurrency}
      />

      {running && (
        <div role="status" className="flex items-center gap-3 p-4 bg-white border border-ink text-xs font-mono uppercase tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {t('bt.running')}
        </div>
      )}

      {result?.ok === false && (
        <div role="alert" className="bg-white border border-orange-300 border-l-4 border-l-orange-500 px-4 py-3 text-xs">
          {t('bt.insufficient', { needed: Math.ceil(result.neededDays), available: result.availableDays })}
        </div>
      )}

      {result?.ok && (
        <div className={cn("flex flex-col gap-6 sm:gap-8 transition-opacity", running && "opacity-60")}>
          <p className="text-[11px] font-mono text-zinc-500">
            {t('bt.period', {
              from: result.dates[0],
              to: result.dates[result.dates.length - 1],
              n: result.rebalanceDates.length,
              years: f.num((result.dates.length - 1) / 252, 1),
            })}
          </p>
          <EquityChart result={result} selected={params.objective} benchmark={benchmark} />
          <MetricsTable result={result} selected={params.objective} benchmark={benchmark} />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="bt-focus" className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('bt.focus')}</label>
            <select
              id="bt-focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value as BacktestStrategy)}
              className="bg-white border border-zinc-300 p-1.5 text-xs text-ink focus:outline-none focus:border-ink"
            >
              {result.strategies.filter(s => s.strategy !== 'benchmark').map(s => (
                <option key={s.strategy} value={s.strategy}>{name(s.strategy, benchmark)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            <DrawdownChart result={result} focus={focus} benchmark={benchmark} />
            <WeightsChart result={result} focus={focus} />
          </div>
          <YearlyTable result={result} selected={params.objective} benchmark={benchmark} />
        </div>
      )}
    </div>
  );
}
