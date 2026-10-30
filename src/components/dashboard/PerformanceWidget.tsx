import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n';
import { buildTrailingPerformance } from '../../engine/chartData';
import { DARK_CHART } from '../../lib/chartTheme';
import { SectionTitle } from '../ui/SectionTitle';
import type { QuantStats } from '../../types';

const axisTick = { fontSize: 9, fontFamily: 'monospace', fill: DARK_CHART.tick };

/** Growth of 100 over the last 12 months: optimal portfolio vs benchmark. */
export function PerformanceWidget({ quantStats }: { quantStats: QuantStats }) {
  const { t, f } = useI18n();
  const { data, outperformance } = buildTrailingPerformance(quantStats.portDailyReturns, quantStats.benchDailyReturns, quantStats.dates);

  return (
    <div className="flex flex-col h-full bg-white border border-ink">
      <div className="flex flex-wrap justify-between items-end gap-2 mb-2">
        <SectionTitle>{t('perf.title')}</SectionTitle>
        <div className="text-[10px] font-mono px-2 py-0.5 border border-ink">
          <span className={outperformance >= 0 ? 'text-green-600' : 'text-red-600'}>
            {t('perf.vsBench', { value: f.signedPct(outperformance / 100) })}
          </span>
        </div>
      </div>
      <div className={`flex-1 ${DARK_CHART.background} border border-ink p-2 sm:p-4 min-h-[300px]`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART.grid} vertical={false} />
            <XAxis
              allowDuplicatedCategory={false}
              dataKey="date"
              tick={axisTick}
              stroke={DARK_CHART.axis}
              minTickGap={30}
              tickFormatter={(val) => {
                if (!val) return '';
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
              }}
            />
            <YAxis domain={['auto', 'auto']} tick={axisTick} stroke={DARK_CHART.axis} width={36} tickFormatter={(val) => f.num(val, 0)} />
            <Tooltip
              contentStyle={DARK_CHART.tooltip}
              formatter={(value: number, name: string) => [f.signedPct((value - 100) / 100), name]}
              labelFormatter={(label) => label}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#ccc' }} />
            <Line type="monotone" dataKey="Portfolio" name={t('perf.portfolio')} stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Benchmark" name={t('perf.benchmark')} stroke="#9ca3af" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
