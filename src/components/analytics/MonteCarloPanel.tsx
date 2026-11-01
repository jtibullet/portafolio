import { useId, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Bar, BarChart, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n';
import { buildHistogram } from '../../engine/chartData';
import { CHART } from '../../lib/chartTheme';
import { SectionHeader } from '../ui/SectionTitle';
import { TRADING_DAYS } from '../../constants';
import type { MonteCarloResult } from '../../monteCarlo';
import type { MonteCarloSettings } from '../../types';

type Currency = 'USD' | 'CLP';

const axisTick = { fontSize: 10, fontFamily: 'monospace' };
const cardClass = "bg-white border border-ink p-4 sm:p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg";

function GoalSummary({ result, settings, currency }: { result: MonteCarloResult; settings: MonteCarloSettings; currency: Currency }) {
  const { t, f } = useI18n();
  const p = result.goalProbability;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.contributed')}</span>
        <span className="text-2xl font-serif text-ink">{f.money(result.totalContributed, currency, 0)}</span>
        <span className="text-[10px] font-mono text-zinc-500 mt-1">
          {t('mc.medianGain', { value: f.money(result.percentiles.p50 - result.totalContributed, currency, 0) })}
        </span>
      </div>
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">
          {p === null ? t('mc.goalProbabilityNone') : t('mc.goalProbability', { goal: f.money(settings.goal, currency, 0) })}
        </span>
        {p === null ? (
          <span className="text-sm text-zinc-500 italic">{t('mc.noGoal')}</span>
        ) : (
          <span className={`text-3xl font-serif ${p >= 0.75 ? 'text-green-600' : p >= 0.5 ? 'text-ink' : 'text-red-600'}`}>{f.pct(p, 0)}</span>
        )}
      </div>
    </div>
  );
}

function SummaryCards({ result, currency }: { result: MonteCarloResult; currency: Currency }) {
  const { t, f } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.bear')}</span>
        <span className="text-2xl font-serif text-red-600">{f.money(result.percentiles.p5, currency, 0)}</span>
      </div>
      <div className={`${cardClass} bg-blue-50`}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.median')}</span>
        <span className="text-3xl font-serif text-ink">{f.money(result.percentiles.p50, currency, 0)}</span>
      </div>
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.bull')}</span>
        <span className="text-2xl font-serif text-green-600">{f.money(result.percentiles.p95, currency, 0)}</span>
      </div>
    </div>
  );
}

/** Points drawn per simulated path: thousands of daily steps per line make the SVG chart very slow */
const POINTS_PER_PATH = 120;

/** Every k-th step of each path (plus the last one), as chart rows. */
function downsamplePaths(paths: number[][]) {
  return paths.map(path => {
    const stride = Math.max(1, Math.ceil(path.length / POINTS_PER_PATH));
    const rows = [];
    for (let step = 0; step < path.length; step += stride) rows.push({ step, value: path[step] });
    if ((path.length - 1) % stride !== 0) rows.push({ step: path.length - 1, value: path[path.length - 1] });
    return rows;
  });
}

function FanChart({ result, years, currency }: { result: MonteCarloResult; years: number; currency: Currency }) {
  const { t, f } = useI18n();
  const lines = useMemo(() => downsamplePaths(result.paths), [result.paths]);
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('mc.cone')}>
        <span className="text-[10px] text-zinc-500 font-mono">{t('mc.paths')}</span>
      </SectionHeader>
      <div className="flex-1 bg-white border border-ink p-2 sm:p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart>
            <XAxis
              allowDuplicatedCategory={false}
              type="number"
              dataKey="step"
              domain={[0, years * TRADING_DAYS]}
              tickFormatter={(val) => t('mc.yearTick', { n: f.num(val / TRADING_DAYS, 1) })}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={['auto', 'auto']} tickFormatter={(val) => f.compact(val)} tick={axisTick} axisLine={false} tickLine={false} width={44} />
            <Tooltip formatter={(val: number) => f.money(val, currency, 0)} labelFormatter={(label: number) => t('mc.day', { n: label })} />
            {lines.map((data, idx) => (
              <Line
                key={idx}
                data={data}
                type="monotone"
                dataKey="value"
                stroke="rgba(59, 130, 246, 0.08)"
                strokeWidth={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FinalValueHistogram({ result }: { result: MonteCarloResult }) {
  const { t, f } = useI18n();
  const bins = buildHistogram(result.finalValues).map(b => ({
    ...b,
    rangeLabel: `${f.compact(b.from, 1)} – ${f.compact(b.to, 1)}`,
  }));
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('mc.dist')}>
        <span className="text-[10px] text-zinc-500 font-mono">{t('mc.sims')}</span>
      </SectionHeader>
      <div className="flex-1 bg-white border border-ink p-2 sm:p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bins}>
            <XAxis allowDuplicatedCategory={false} dataKey="name" tickFormatter={(val) => f.compact(val)} tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(val: number) => [val, t('mc.count')]}
              labelFormatter={(_, payload) => payload[0]?.payload.rangeLabel || ''}
              cursor={{ fill: CHART.cursor }}
            />
            <Bar dataKey="count" fill={CHART.accent} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex-1">
      <label htmlFor={id} className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-panel border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-ink"
      />
      {hint && <p className="text-[10px] font-mono text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

export function MonteCarloPanel({ available, result, settings, onChange, currency }: {
  /** False when there is no optimized portfolio to project */
  available: boolean;
  result: MonteCarloResult | null;
  settings: MonteCarloSettings;
  onChange: (settings: MonteCarloSettings) => void;
  currency: Currency;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<MonteCarloSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4 sm:p-6 bg-white border border-ink">
        <NumberField label={`${t('mc.initial')} (${currency})`} value={settings.initialAmount} onChange={v => set({ initialAmount: v })} />
        <NumberField label={`${t('mc.monthly')} (${currency})`} value={settings.monthlyContribution} onChange={v => set({ monthlyContribution: v })} />
        <NumberField label={`${t('mc.goal')} (${currency})`} value={settings.goal} onChange={v => set({ goal: v })} hint={t('mc.goalHint')} />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('mc.years')}</label>
            <span className="text-sm font-mono">{t('mc.yearsValue', { n: settings.years })}</span>
          </div>
          <input
            type="range"
            min="1" max="30" step="1"
            value={settings.years}
            onChange={(e) => set({ years: Number(e.target.value) })}
            className="w-full accent-ink"
          />
        </div>
      </div>

      {!available ? (
        <div className="text-center text-zinc-500 italic text-sm py-12">{t('mc.unavailable')}</div>
      ) : !result ? (
        <div className="flex justify-center items-center h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <>
          <SummaryCards result={result} currency={currency} />
          <GoalSummary result={result} settings={settings} currency={currency} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <FanChart result={result} years={settings.years} currency={currency} />
            <FinalValueHistogram result={result} />
          </div>
        </>
      )}
    </div>
  );
}
