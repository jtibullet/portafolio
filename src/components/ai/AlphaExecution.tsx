import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useUiState } from '../../hooks/useUiState';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { SectionHeader } from '../ui/SectionTitle';
import type { AlphaSignalResult } from '../../utils/quantMath';
import type { PriceRow } from '../../types';

const SERIES_NAMES: Record<string, string> = { price: 'Price', sma10: 'SMA(10)', sma30: 'SMA(30)' };

function SignalTable({ signals }: { signals: AlphaSignalResult[] }) {
  return (
    <div className="flex flex-col">
      <SectionHeader title="Current Signal Status" />
      <div className="overflow-x-auto border border-zinc-200">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 border-r border-zinc-200">Asset</th>
              <th className="p-3 border-r border-zinc-200">Signal</th>
              <th className="p-3 text-right">SMA(10) - SMA(30)</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal, i) => (
              <tr key={signal.symbol} className={i > 0 ? "border-t border-zinc-200" : ""}>
                <td className="p-3 border-r border-zinc-200 font-bold">{signal.symbol}</td>
                <td className="p-3 border-r border-zinc-200">
                  <span className={`px-2 py-1 font-bold ${signal.currentSignal === 'Buy' ? 'bg-green-100 text-green-700' : signal.currentSignal === 'Sell' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
                    {signal.currentSignal}
                  </span>
                </td>
                <td className="p-3 text-right">{signal.signalValue > 0 ? '+' : ''}{signal.signalValue.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SignalChart({ signal, historicalData }: { signal: AlphaSignalResult; historicalData: PriceRow[] }) {
  // The signal series skip missing prices, so pair them with the dates that actually have a price
  const dates = historicalData.filter(row => row[signal.symbol] !== null && row[signal.symbol] !== undefined).map(row => row.date);
  const chartData = signal.historicalPrices.map((price, i) => ({
    date: dates[i],
    price,
    sma10: signal.sma10[i],
    sma30: signal.sma30[i],
    isBuy: signal.signalSeries[i] !== null && signal.signalSeries[i]! > 0,
    isSell: signal.signalSeries[i] !== null && signal.signalSeries[i]! < 0
  }));
  // Buy/sell zones are drawn as full-height bars behind the price lines
  const maxPrice = Math.max(...signal.historicalPrices) * 1.1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis allowDuplicatedCategory={false} dataKey="date" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#71717a" minTickGap={30} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#71717a" orientation="right" />
        <Tooltip
          contentStyle={{ fontFamily: 'monospace', fontSize: '10px', borderRadius: '0', border: '1px solid #141414', padding: '8px' }}
          formatter={(value: any, name: string) => [Number(value).toFixed(2), SERIES_NAMES[name] || name]}
          labelStyle={{ color: '#71717a', marginBottom: '4px' }}
        />
        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
        <Bar dataKey={(d) => d.isBuy ? maxPrice : 0} fill="#dcfce7" name="Buy Zone (SMA10 > SMA30)" isAnimationActive={false} barSize={4} opacity={0.5} />
        <Bar dataKey={(d) => d.isSell ? maxPrice : 0} fill="#fee2e2" name="Sell Zone (SMA10 < SMA30)" isAnimationActive={false} barSize={4} opacity={0.5} />
        <Line type="monotone" dataKey="price" stroke="#141414" strokeWidth={2} dot={false} name="Price" isAnimationActive={false} />
        <Line type="monotone" dataKey="sma10" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="SMA(10)" isAnimationActive={false} />
        <Line type="monotone" dataKey="sma30" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA(30)" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AlphaExecution({ alphaSignals, historicalData }: {
  alphaSignals: Record<string, AlphaSignalResult>;
  historicalData: PriceRow[];
}) {
  const symbols = Object.keys(alphaSignals);
  const [chosen, setChosen] = useUiState<string | null>('alpha:ticker', null);
  const selected = chosen && alphaSignals[chosen] ? chosen : symbols[0] ?? null;

  return (
    <CollapsibleSection id="alphaExecution" title="⚡ Alpha Execution: Momentum Crossover Signal" className="mt-8 print:hidden">
      <div className="bg-white border border-[#141414] border-t-0 p-6 flex flex-col gap-8">
        <SignalTable signals={Object.values(alphaSignals)} />

        <div className="flex flex-col">
          <SectionHeader title="Visual Backtest">
            <select
              value={selected || ''}
              onChange={(e) => setChosen(e.target.value)}
              className="bg-white border border-zinc-300 text-[10px] font-mono px-2 py-1 focus:outline-none focus:border-[#141414]"
            >
              {symbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </SectionHeader>
          <div className="border border-zinc-200 p-4 bg-zinc-50 h-[400px]">
            {selected ? (
              <SignalChart signal={alphaSignals[selected]} historicalData={historicalData} />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-sm">Select an asset</div>
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
