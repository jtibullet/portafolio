import { Loader2 } from 'lucide-react';
import { Bar, BarChart, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n';
import { buildHistogram } from '../../engine/chartData';
import { CHART } from '../../lib/chartTheme';
import { SectionHeader } from '../ui/SectionTitle';
import { TRADING_DAYS } from '../../constants';
import type { MonteCarloResult } from '../../monteCarlo';

const axisTick = { fontSize: 10, fontFamily: 'monospace' };
const cardClass = "bg-white border border-ink p-4 sm:p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg";

function SummaryCards({ result }: { result: MonteCarloResult }) {
  const { t, f } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.bear')}</span>
        <span className="text-2xl font-serif text-red-600">{f.money(result.percentiles.p5, 'USD', 0)}</span>
      </div>
      <div className={`${cardClass} bg-blue-50`}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.median')}</span>
        <span className="text-3xl font-serif text-ink">{f.money(result.percentiles.p50, 'USD', 0)}</span>
      </div>
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">{t('mc.bull')}</span>
        <span className="text-2xl font-serif text-green-600">{f.money(result.percentiles.p95, 'USD', 0)}</span>
      </div>
    </div>
  );
}

function FanChart({ result, years }: { result: MonteCarloResult; years: number }) {
  const { t, f } = useI18n();
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
            <Tooltip formatter={(val: number) => f.money(val, 'USD', 0)} labelFormatter={(label: number) => t('mc.day', { n: label })} />
            {result.paths.map((path, idx) => (
              <Line
                key={idx}
                data={path.map((value, step) => ({ step, value }))}
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

export function MonteCarloPanel({ result, years, setYears, initialAmount, setInitialAmount }: {
  result: MonteCarloResult | null;
  years: number;
  setYears: (years: number) => void;
  initialAmount: number;
  setInitialAmount: (amount: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row gap-6 p-4 sm:p-6 bg-white border border-ink">
        <div className="flex-1">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">{t('mc.initial')}</label>
          <input
            type="number"
            inputMode="decimal"
            value={initialAmount}
            onChange={(e) => setInitialAmount(Number(e.target.value))}
            className="w-full bg-panel border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-ink"
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('mc.years')}</label>
            <span className="text-sm font-mono">{t('mc.yearsValue', { n: years })}</span>
          </div>
          <input
            type="range"
            min="1" max="10" step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-ink"
          />
        </div>
      </div>

      {!result ? (
        <div className="flex justify-center items-center h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <>
          <SummaryCards result={result} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <FanChart result={result} years={years} />
            <FinalValueHistogram result={result} />
          </div>
        </>
      )}
    </div>
  );
}
