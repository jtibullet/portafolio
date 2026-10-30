import React from 'react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import { useUiState } from '../../hooks/useUiState';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { QuantStats } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right whitespace-nowrap";

/** Bar under each asset: current weight (ink), target marker (blue) and the trade needed (green/red). */
function RebalanceBar({ currentPct, targetPct, trade }: { currentPct: number; targetPct: number; trade: number }) {
  const { t, f } = useI18n();
  return (
    <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden flex relative">
      <div className="h-full bg-ink z-10" style={{ width: `${Math.min(100, currentPct)}%` }} title={t('calc.currentTip', { value: f.pct(currentPct / 100) })}></div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-30" style={{ left: `${Math.min(99.5, targetPct)}%` }} title={t('calc.targetTip', { value: f.pct(targetPct / 100) })}></div>
      {trade > 0 && (
        <div className="absolute top-0 bottom-0 bg-green-400 z-0 opacity-80" style={{ left: `${Math.min(100, currentPct)}%`, width: `${Math.min(100, targetPct - currentPct)}%` }}></div>
      )}
      {trade < 0 && (
        <div className="absolute top-0 bottom-0 bg-red-400 z-20 opacity-80" style={{ left: `${Math.min(100, targetPct)}%`, width: `${Math.min(100, currentPct - targetPct)}%` }}></div>
      )}
    </div>
  );
}

/** Splits current holdings plus new capital according to the optimal weights and shows the trades needed. */
export function InvestmentCalculator({ quantStats, saving, onSave }: {
  quantStats: QuantStats;
  saving: boolean;
  onSave: () => void;
}) {
  const { t, f } = useI18n();
  // Amounts are entered and shown in the selected currency; no conversion is applied
  const [investmentCapital, setInvestmentCapital] = useUiState('calc:capital', 100000);
  const [currentHoldings, setCurrentHoldings] = useUiState<Record<string, number>>('calc:holdings', {});
  const [currency, setCurrency] = useUiState<'USD' | 'CLP'>('calc:currency', 'USD');
  const money = (v: number) => f.money(v, currency);

  const weights = quantStats.optimization!.optimal.weights;
  const totalCurrentHoldings = quantStats.matrixSymbols.reduce((sum, sym) => sum + (currentHoldings[sym] || 0), 0);
  const targetTotal = totalCurrentHoldings + investmentCapital;

  return (
    <CollapsibleSection id="investmentCalculator" title={t('calc.title')}>
      <div className="bg-white border border-ink border-t-0 p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{t('calc.capital')}</label>
            <input
              type="number"
              inputMode="decimal"
              value={investmentCapital}
              onChange={(e) => setInvestmentCapital(Number(e.target.value))}
              className="w-full bg-panel border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{t('calc.currency')}</label>
            <div className="flex border border-zinc-300 w-fit">
              {(['USD', 'CLP'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn("px-4 py-2 text-xs font-bold font-mono transition-colors", currency === c ? "bg-ink text-paper" : "bg-panel text-ink hover:bg-zinc-200")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[10px] font-mono text-zinc-500">{t('calc.currencyNote')}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse mt-2">
            <thead>
              <tr className="border-b border-ink bg-panel">
                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">{t('col.ticker')}</th>
                <th className={th}>{t('calc.optimalWeight')}</th>
                <th className={th}>{t('calc.current', { currency })}</th>
                <th className={th}>{t('calc.target', { currency })}</th>
                <th className="p-2 text-[10px] font-serif italic text-right whitespace-nowrap">{t('calc.trade', { currency })}</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              {quantStats.matrixSymbols.map((sym, i) => {
                const weight = weights[i];
                const current = currentHoldings[sym] || 0;
                const target = weight * targetTotal;
                const trade = target - current;
                const currentPct = targetTotal > 0 ? (current / targetTotal) * 100 : 0;

                return (
                  <React.Fragment key={sym}>
                    <tr className="hover:bg-zinc-50">
                      <td className="p-2 border-r border-zinc-200 font-bold text-ink">{sym}</td>
                      <td className="p-2 border-r border-zinc-200 text-right">{f.pct(weight)}</td>
                      <td className="p-2 border-r border-zinc-200 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={current || ''}
                          placeholder="0"
                          onChange={(e) => setCurrentHoldings({ ...currentHoldings, [sym]: Number(e.target.value) })}
                          className="w-24 text-right bg-transparent border-b border-zinc-300 focus:outline-none focus:border-ink"
                        />
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right whitespace-nowrap">{money(target)}</td>
                      <td className={cn("p-2 text-right font-bold whitespace-nowrap", trade > 0 ? "text-green-600" : trade < 0 ? "text-red-600" : "text-zinc-500")}>
                        {trade > 0 ? `${t('calc.buy')} ` : trade < 0 ? `${t('calc.sell')} ` : ''}{money(Math.abs(trade))}
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td colSpan={5} className="px-2 pb-2 pt-0">
                        <RebalanceBar currentPct={currentPct} targetPct={weight * 100} trade={trade} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mt-4 pt-4 border-t border-zinc-200">
          <div className="text-[10px] uppercase font-mono text-zinc-500 flex flex-col sm:flex-row sm:gap-2">
            <span>{t('calc.totalCurrent', { value: money(totalCurrentHoldings) })}</span>
            <span className="hidden sm:inline">|</span>
            <span>{t('calc.totalTarget', { value: money(targetTotal) })}</span>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-ink hover:bg-zinc-800 text-paper px-6 py-3 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? t('calc.saving') : t('calc.save')}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}
