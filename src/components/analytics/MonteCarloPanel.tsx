import { Loader2 } from 'lucide-react';
import { Bar, BarChart, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildHistogram } from '../../engine/chartData';
import { SectionHeader } from '../ui/SectionTitle';
import { TRADING_DAYS } from '../../constants';
import type { MonteCarloResult } from '../../monteCarlo';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 });
const axisTick = { fontSize: 10, fontFamily: 'monospace' };
const cardClass = "bg-white border border-[#141414] p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg";

function SummaryCards({ result }: { result: MonteCarloResult }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Bear Market (5th Pct)</span>
        <span className="text-2xl font-serif text-red-600">{usd.format(result.percentiles.p5)}</span>
      </div>
      <div className={`${cardClass} bg-blue-50/30`}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Median Expected (50th Pct)</span>
        <span className="text-3xl font-serif text-[#141414]">{usd.format(result.percentiles.p50)}</span>
      </div>
      <div className={cardClass}>
        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Bull Market (95th Pct)</span>
        <span className="text-2xl font-serif text-green-600">{usd.format(result.percentiles.p95)}</span>
      </div>
    </div>
  );
}

function FanChart({ result, years }: { result: MonteCarloResult; years: number }) {
  return (
    <div className="flex flex-col">
      <SectionHeader title="Cone of Uncertainty">
        <span className="text-[10px] text-zinc-500 font-mono">Random 100 Paths</span>
      </SectionHeader>
      <div className="flex-1 bg-white border border-[#141414] p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart>
            <XAxis
              allowDuplicatedCategory={false}
              type="number"
              dataKey="step"
              domain={[0, years * TRADING_DAYS]}
              tickFormatter={(val) => `Y${(val / TRADING_DAYS).toFixed(1)}`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={['auto', 'auto']} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: number) => usd.format(val)} labelFormatter={(label: number) => `Day ${label}`} />
            {result.paths.map((path, idx) => (
              <Line
                key={idx}
                data={path.map((value, step) => ({ step, value }))}
                type="monotone"
                dataKey="value"
                stroke="rgba(37, 99, 235, 0.05)"
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
  const bins = buildHistogram(result.finalValues);
  return (
    <div className="flex flex-col">
      <SectionHeader title="Final Value Distribution">
        <span className="text-[10px] text-zinc-500 font-mono">10,000 Simulations</span>
      </SectionHeader>
      <div className="flex-1 bg-white border border-[#141414] p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bins}>
            <XAxis allowDuplicatedCategory={false} dataKey="name" tickFormatter={(val) => compact.format(val)} tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(val: number) => [val, 'Count']} labelFormatter={(_, payload) => payload[0]?.payload.rangeLabel || ''} />
            <Bar dataKey="count" fill="#3b82f6" opacity={0.8} />
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
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row gap-6 p-6 bg-white border border-[#141414]">
        <div className="flex-1">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Initial Investment Amount</label>
          <input
            type="number"
            value={initialAmount}
            onChange={(e) => setInitialAmount(Number(e.target.value))}
            className="w-full bg-[#f9f9f9] border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-[#141414]"
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Years to Forecast</label>
            <span className="text-sm font-mono">{years} Years</span>
          </div>
          <input
            type="range"
            min="1" max="10" step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-[#141414]"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FanChart result={result} years={years} />
            <FinalValueHistogram result={result} />
          </div>
        </>
      )}
    </div>
  );
}
