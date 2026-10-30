import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n, type MessageKey } from '../../i18n';
import { useUiState } from '../../hooks/useUiState';
import { CHART } from '../../lib/chartTheme';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { SectionHeader } from '../ui/SectionTitle';
import type { AlphaSignalResult } from '../../utils/quantMath';
import type { PriceRow } from '../../types';

function SignalTable({ signals }: { signals: AlphaSignalResult[] }) {
  const { t, f } = useI18n();
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('alpha.status')} />
      <div className="overflow-x-auto border border-zinc-200">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 border-r border-zinc-200">{t('col.asset')}</th>
              <th className="p-3 border-r border-zinc-200">{t('alpha.signal')}</th>
              <th className="p-3 text-right whitespace-nowrap">SMA(10) - SMA(30)</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal, i) => (
              <tr key={signal.symbol} className={i > 0 ? "border-t border-zinc-200" : ""}>
                <td className="p-3 border-r border-zinc-200 font-bold">{signal.symbol}</td>
                <td className="p-3 border-r border-zinc-200">
                  <span className={`px-2 py-1 font-bold ${signal.currentSignal === 'Buy' ? 'bg-green-100 text-green-700' : signal.currentSignal === 'Sell' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
                    {t(`alpha.${signal.currentSignal}` as MessageKey)}
                  </span>
                </td>
                <td className="p-3 text-right">{signal.signalValue > 0 ? '+' : ''}{f.num(signal.signalValue, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SignalChart({ signal, historicalData }: { signal: AlphaSignalResult; historicalData: PriceRow[] }) {
  const { t, f } = useI18n();
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
      <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis allowDuplicatedCategory={false} dataKey="date" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke={CHART.axis} minTickGap={30} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke={CHART.axis} orientation="right" width={44} tickFormatter={(v) => f.num(v, 0)} />
        <Tooltip
          contentStyle={{ fontFamily: 'monospace', fontSize: '10px', borderRadius: '0', border: '1px solid var(--color-ink)', padding: '8px' }}
          formatter={(value: any, name: string) => [f.num(Number(value)), name]}
          labelStyle={{ color: 'var(--color-zinc-500)', marginBottom: '4px' }}
        />
        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
        <Bar dataKey={(d) => d.isBuy ? maxPrice : 0} fill="#22c55e" name={t('alpha.buyZone')} isAnimationActive={false} barSize={4} opacity={0.2} />
        <Bar dataKey={(d) => d.isSell ? maxPrice : 0} fill="#ef4444" name={t('alpha.sellZone')} isAnimationActive={false} barSize={4} opacity={0.2} />
        <Line type="monotone" dataKey="price" stroke={CHART.ink} strokeWidth={2} dot={false} name={t('alpha.price')} isAnimationActive={false} />
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
  const { t } = useI18n();
  const symbols = Object.keys(alphaSignals);
  const [chosen, setChosen] = useUiState<string | null>('alpha:ticker', null);
  const selected = chosen && alphaSignals[chosen] ? chosen : symbols[0] ?? null;

  return (
    <CollapsibleSection id="alphaExecution" title={t('alpha.title')} className="mt-2 sm:mt-8 print:hidden">
      <div className="bg-white border border-ink border-t-0 p-3 sm:p-6 flex flex-col gap-8">
        <SignalTable signals={Object.values(alphaSignals)} />

        <div className="flex flex-col">
          <SectionHeader title={t('alpha.chart')}>
            <select
              value={selected || ''}
              onChange={(e) => setChosen(e.target.value)}
              aria-label={t('alpha.select')}
              className="bg-white border border-zinc-300 text-[10px] font-mono px-2 py-1 focus:outline-none focus:border-ink"
            >
              {symbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </SectionHeader>
          <div className="border border-zinc-200 p-2 sm:p-4 bg-zinc-50 h-[400px]">
            {selected ? (
              <SignalChart signal={alphaSignals[selected]} historicalData={historicalData} />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-sm">{t('alpha.select')}</div>
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
