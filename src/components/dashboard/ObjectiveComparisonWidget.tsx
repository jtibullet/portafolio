import React from 'react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import { SectionTitle } from '../ui/SectionTitle';
import type { Objective, QuantStats } from '../../types';

const ORDER: Objective[] = ['maxSharpe', 'minVariance', 'riskParity', 'hrp'];

/** Each objective's portfolio side by side: return, risk, Sharpe, concentration and weights. */
export function ObjectiveComparisonWidget({ quantStats }: { quantStats: QuantStats }) {
  const { t, f } = useI18n();
  const objectives = ORDER.filter(o => quantStats.alternatives[o]);
  const portfolio = (o: Objective) => quantStats.alternatives[o]!;
  const effectiveN = (w: number[]) => 1 / w.reduce((s, x) => s + x * x, 0);

  const rows: { label: string; tip?: string; value: (o: Objective) => React.ReactNode; best?: 'min' | 'max'; metric?: (o: Objective) => number }[] = [
    { label: t('metrics.expectedReturn'), value: o => f.pct(portfolio(o).expectedReturn), metric: o => portfolio(o).expectedReturn, best: 'max' },
    { label: t('metrics.volatility'), value: o => f.pct(portfolio(o).volatility), metric: o => portfolio(o).volatility, best: 'min' },
    { label: t('metrics.sharpe'), value: o => f.num(portfolio(o).sharpeRatio, 3), metric: o => portfolio(o).sharpeRatio, best: 'max' },
    { label: t('compare.maxWeight'), value: o => f.pct(Math.max(...portfolio(o).weights), 1) },
    { label: t('compare.effectiveN'), tip: t('tip.effectiveN'), value: o => f.num(effectiveN(portfolio(o).weights), 1), metric: o => effectiveN(portfolio(o).weights), best: 'max' },
  ];
  const bestOf = (row: typeof rows[number]) => {
    if (!row.metric || !row.best) return null;
    const values = objectives.map(row.metric);
    return objectives[values.indexOf(row.best === 'max' ? Math.max(...values) : Math.min(...values))];
  };

  const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right whitespace-nowrap";
  const td = "p-2 border-r border-zinc-200 text-right whitespace-nowrap";

  return (
    <div className="flex flex-col h-full bg-white border border-ink">
      <div className="flex flex-wrap justify-between items-end gap-2 mb-2">
        <SectionTitle>{t('compare.title')}</SectionTitle>
        <span className="text-[10px] font-mono text-zinc-500 px-2">
          {quantStats.covarianceShrinkage === null
            ? t('compare.covSample')
            : t('compare.covShrunk', { value: f.num(quantStats.covarianceShrinkage, 2) })}
        </span>
      </div>
      <div className="overflow-x-auto border border-ink">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-panel">
              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">{t('compare.metric')}</th>
              {objectives.map(o => (
                <th key={o} className={cn(th, o === quantStats.objective && "bg-blue-50")}>
                  {t(`objective.${o}`)}
                  {o === quantStats.objective && <span className="block not-italic font-mono text-blue-600">{t('compare.selected')}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {rows.map(row => {
              const best = bestOf(row);
              return (
                <tr key={row.label} className="border-b border-zinc-100">
                  <td className="p-2 border-r border-zinc-200 font-bold text-ink whitespace-nowrap" title={row.tip}>{row.label}</td>
                  {objectives.map(o => (
                    <td key={o} className={cn(td, o === quantStats.objective && "bg-blue-50", o === best && "font-bold text-green-600")}>{row.value(o)}</td>
                  ))}
                </tr>
              );
            })}
            {quantStats.matrixSymbols.map((sym, i) => (
              <tr key={sym} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-2 border-r border-zinc-200 text-zinc-500">{sym}</td>
                {objectives.map(o => (
                  <td key={o} className={cn(td, o === quantStats.objective && "bg-blue-50")}>{f.pct(portfolio(o).weights[i], 1)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
