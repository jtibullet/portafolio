import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildTrailingPerformance } from '../../engine/chartData';
import { SectionTitle } from '../ui/SectionTitle';
import type { QuantStats } from '../../types';

const axisTick = { fontSize: 9, fontFamily: 'monospace', fill: '#888' };

/** Growth of 100 over the last 12 months: optimal portfolio vs benchmark. */
export function PerformanceWidget({ quantStats }: { quantStats: QuantStats }) {
  const { data, outperformance } = buildTrailingPerformance(quantStats.portDailyReturns, quantStats.benchDailyReturns, quantStats.dates);

  return (
    <div className="flex flex-col h-full bg-white border border-[#141414]">
      <div className="flex justify-between items-end mb-2">
        <SectionTitle>Historical Backtester (12M)</SectionTitle>
        <div className="text-[10px] font-mono px-2 py-0.5 border border-[#141414]">
          <span className={outperformance >= 0 ? 'text-green-600' : 'text-red-600'}>
            {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}% vs Bench
          </span>
        </div>
      </div>
      <div className="flex-1 bg-[#111111] border border-[#141414] p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis
              allowDuplicatedCategory={false}
              dataKey="date"
              tick={axisTick}
              stroke="#444"
              minTickGap={30}
              tickFormatter={(val) => {
                if (!val) return '';
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
              }}
            />
            <YAxis domain={['auto', 'auto']} tick={axisTick} stroke="#444" tickFormatter={(val) => val.toFixed(0)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#eee', fontSize: '10px', fontFamily: 'monospace' }}
              formatter={(value: number, name: string) => [`${(value - 100).toFixed(2)}%`, name]}
              labelFormatter={(label) => label}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#ccc' }} />
            <Line type="monotone" dataKey="Portfolio" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Benchmark" stroke="#9ca3af" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
