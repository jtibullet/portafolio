import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n';
import { CHART } from '../../lib/chartTheme';
import { SectionHeader } from '../ui/SectionTitle';
import type { BlackLittermanStats, InvestorView, QuantStats } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 whitespace-nowrap";

function ViewsTable({ quantStats, blStats, views, setViews }: {
  quantStats: QuantStats;
  blStats: BlackLittermanStats;
  views: Record<string, InvestorView>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, InvestorView>>>;
}) {
  const { t, f } = useI18n();
  const update = (sym: string, patch: Partial<InvestorView>) =>
    setViews(prev => ({ ...prev, [sym]: { ...prev[sym], ...patch } }));

  return (
    <div className="flex flex-col">
      <SectionHeader title={t('bl.title')}>
        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">{t('bl.subtitle')}</span>
      </SectionHeader>
      <p className={`text-[10px] font-mono mb-2 ${blStats.priorSource === 'equal' ? 'text-orange-600' : 'text-zinc-500'}`}>
        {t(blStats.priorSource === 'marketCap' ? 'bl.priorMarketCap' : 'bl.priorEqual')}
      </p>
      <div className="bg-white border border-ink overflow-hidden overflow-x-auto p-2 sm:p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-panel">
              <th className={th}>{t('col.asset')}</th>
              <th className={`${th} text-right`}>{t('bl.prior')}</th>
              <th className={`${th} text-right`}>{t('bl.view')}</th>
              <th className="p-2 text-[10px] font-serif italic text-right min-w-[160px]">{t('bl.confidence')}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {quantStats.matrixSymbols.map((sym, i) => {
              const viewVal = views[sym]?.view ?? 0;
              const confVal = views[sym]?.conf ?? 0.5;
              return (
                <tr key={`bl-${sym}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 font-bold text-ink">{sym}</td>
                  <td className="p-2 border-r border-zinc-200 text-right text-zinc-500">{f.pct(blStats.pi[i])}</td>
                  <td className="p-2 border-r border-zinc-200 text-right whitespace-nowrap">
                    {/* The input uses a dot decimal regardless of language: number inputs require it */}
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={(viewVal * 100).toFixed(2)}
                      onChange={(e) => update(sym, { view: Number(e.target.value) / 100 })}
                      className="w-20 text-right border border-zinc-300 bg-white px-1 py-0.5 focus:outline-none focus:border-ink"
                    />%
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={confVal}
                        onChange={(e) => update(sym, { conf: Number(e.target.value) })}
                        className="flex-1 accent-ink"
                      />
                      <span className="w-10 text-right text-[9px]">{f.pct(confVal, 0)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeightComparisonChart({ quantStats, blStats }: { quantStats: QuantStats; blStats: BlackLittermanStats }) {
  const { t, f } = useI18n();
  const data = quantStats.matrixSymbols.map((sym, i) => ({
    name: sym,
    markowitz: quantStats.optimization!.optimal.weights[i],
    blackLitterman: blStats.optimization.optimal.weights[i]
  }));

  return (
    <div className="flex flex-col xl:col-span-2">
      <SectionHeader title={t('bl.compareTitle')} />
      <div className="flex-1 bg-white border border-ink p-2 sm:p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis allowDuplicatedCategory={false} dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis tickFormatter={(val) => f.pct(val, 0)} tick={{ fontSize: 10, fontFamily: 'monospace' }} width={40} />
            <Tooltip formatter={(value: number) => f.pct(value)} cursor={{ fill: CHART.cursor }} />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
            <Bar dataKey="markowitz" name={t('bl.markowitz')} fill={CHART.muted} />
            <Bar dataKey="blackLitterman" name={t('bl.bl')} fill={CHART.ink} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StressTest({ blStats }: { blStats: BlackLittermanStats }) {
  const { t, f } = useI18n();
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('stress.title')}>
        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">{t('stress.subtitle')}</span>
      </SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-red-200 border-l-4 border-l-red-600 p-4 sm:p-6 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">{t('stress.mdd')}</div>
          <div className="text-3xl font-mono text-red-600">{f.pct(blStats.stress.maxDrawdown)}</div>
          <div className="text-[9px] mt-2 text-zinc-400 font-mono">{t('stress.mddDesc')}</div>
        </div>
        <div className="bg-white border border-ink border-l-4 border-l-ink p-4 sm:p-6 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">{t('stress.cvar')}</div>
          <div className="text-3xl font-mono">{f.pct(blStats.stress.cvar99)}</div>
          <div className="text-[9px] mt-2 text-zinc-400 font-mono">{t('stress.cvarDesc')}</div>
        </div>
      </div>
    </div>
  );
}

export function BlackLittermanPanel(props: {
  quantStats: QuantStats;
  blStats: BlackLittermanStats;
  views: Record<string, InvestorView>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, InvestorView>>>;
}) {
  return (
    <>
      <ViewsTable {...props} />
      <WeightComparisonChart quantStats={props.quantStats} blStats={props.blStats} />
      <StressTest blStats={props.blStats} />
    </>
  );
}
