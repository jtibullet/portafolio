import React from 'react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import { useUiState } from '../../hooks/useUiState';
import { usePersistentState } from '../../hooks/usePersistentState';
import { DEFAULT_COSTS, tradeCost, type CostModel } from '../../engine/costs';
import { CostSettings } from '../ui/CostSettings';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { brokerFor, DEFAULT_BROKERS, outOfBand, planOrder, type BrokerId, type BrokerRules, type PlannedOrder } from '../../engine/orders';
import type { AssetMetadata, QuantStats } from '../../types';

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

const BANDS = [0.03, 0.05, 0.1];
const BROKER_NAMES: Record<BrokerId, string> = { zesty: 'Zesty', racional: 'Racional' };
const labelClass = "block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1";

/** Fractional shares and minimum order per broker; saved in the browser. */
function BrokerSettings({ brokers, onChange }: { brokers: Record<BrokerId, BrokerRules>; onChange: (b: Record<BrokerId, BrokerRules>) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2 bg-zinc-50 border border-zinc-200 p-3">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('broker.title')}</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(BROKER_NAMES) as BrokerId[]).map(id => (
          <div key={id} className="flex flex-col gap-1 text-[10px] font-mono text-zinc-500">
            <span className="font-bold text-ink">{BROKER_NAMES[id]} · {t(`broker.scope.${id}`)}</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={brokers[id].fractional}
                onChange={(e) => onChange({ ...brokers, [id]: { ...brokers[id], fractional: e.target.checked } })}
                className="accent-ink"
              />
              {t('broker.fractional')}
            </label>
            <label className="flex items-center gap-2">
              {t('broker.minOrder', { currency: id === 'zesty' ? 'CLP' : 'USD' })}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={brokers[id].minOrder}
                onChange={(e) => onChange({ ...brokers, [id]: { ...brokers[id], minOrder: Math.max(0, Number(e.target.value) || 0) } })}
                className="w-24 bg-white border border-zinc-300 p-1 text-xs text-ink focus:outline-none focus:border-ink"
              />
            </label>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-500">{t('broker.note')}</p>
    </div>
  );
}

/** "Comprar 12 acc. a US$185,20" for a planned order, or why it can't be placed. */
function OrderCell({ order, symbol }: { order: PlannedOrder; symbol: string }) {
  const { t, f } = useI18n();
  if (order.status === 'none') return <span className="text-zinc-400">—</span>;
  if (order.status !== 'ok') return <span className="text-orange-600">{t(`order.${order.status}`)}</span>;
  const priceCurrency = symbol.endsWith('.SN') ? 'CLP' : 'USD';
  const shares = f.num(Math.abs(order.shares), Number.isInteger(order.shares) ? 0 : 4);
  return (
    <span className={order.shares > 0 ? "text-green-600" : "text-red-600"}>
      {t(order.shares > 0 ? 'order.buy' : 'order.sell', { shares, price: f.money(order.price!, priceCurrency) })}
    </span>
  );
}

/**
 * Splits current holdings plus new capital according to the optimal weights, shows the trades
 * needed, turns them into share orders under each broker's rules and flags out-of-band holdings.
 */
export function InvestmentCalculator({ quantStats, metadata, exchangeRate, saving, onSave }: {
  quantStats: QuantStats;
  metadata: AssetMetadata[] | null;
  /** CLP per USD */
  exchangeRate: number | null;
  saving: boolean;
  onSave: () => void;
}) {
  const { t, f } = useI18n();
  const [investmentCapital, setInvestmentCapital] = useUiState('calc:capital', 100000);
  const [currentHoldings, setCurrentHoldings] = useUiState<Record<string, number>>('calc:holdings', {});
  const [currency, setCurrency] = useUiState<'USD' | 'CLP'>('calc:currency', 'USD');
  const [costs, setCosts] = usePersistentState<CostModel>('tradeCosts', DEFAULT_COSTS);
  const [brokers, setBrokers] = usePersistentState<Record<BrokerId, BrokerRules>>('brokers', DEFAULT_BROKERS);
  const [band, setBand] = usePersistentState('calc:band', 0.05);
  // Chilean (.SN) stocks trade in CLP and the rest in USD; paying in the other currency needs a conversion
  const needsConversion = (sym: string) => (currency === 'CLP') !== sym.endsWith('.SN');
  const money = (v: number) => f.money(v, currency);

  const symbols = quantStats.matrixSymbols;
  const weights = quantStats.optimization!.optimal.weights;
  const prices = Object.fromEntries((metadata ?? []).map(m => [m.symbol, m.currentPrice]));
  const totalCurrentHoldings = symbols.reduce((sum, sym) => sum + (currentHoldings[sym] || 0), 0);
  const targetTotal = totalCurrentHoldings + investmentCapital;
  const rows = symbols.map((sym, i) => {
    const current = currentHoldings[sym] || 0;
    const target = weights[i] * targetTotal;
    const trade = target - current;
    const order = planOrder(trade, prices[sym], brokers[brokerFor(sym)], sym, currency, exchangeRate);
    // Costs follow the rounded order when it can be placed, otherwise the planned trade
    const executed = order.status === 'ok' ? order.amount : order.status === 'belowMinimum' ? 0 : trade;
    return { sym, weight: weights[i], current, target, trade, order, cost: tradeCost(executed, costs, needsConversion(sym)), executed };
  });
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  // Cash the rounded orders leave over (buys not fully spent, plus sale proceeds)
  const unspent = rows.reduce((s, r) => s + r.trade - r.executed, 0);
  const hasHoldings = totalCurrentHoldings > 0;
  const flags = hasHoldings ? outOfBand(rows.map(r => r.current / totalCurrentHoldings), weights, band) : rows.map(() => false);
  const flagged = flags.filter(Boolean).length;

  return (
    <CollapsibleSection id="investmentCalculator" title={t('calc.title')}>
      <div className="bg-white border border-ink border-t-0 p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className={labelClass}>{t('calc.capital')}</label>
            <input
              type="number"
              inputMode="decimal"
              value={investmentCapital}
              onChange={(e) => setInvestmentCapital(Number(e.target.value))}
              className="w-full bg-panel border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className={labelClass}>{t('calc.currency')}</label>
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
          <div>
            <label htmlFor="calc-band" className={labelClass}>{t('calc.band')}</label>
            <select
              id="calc-band"
              value={band}
              onChange={(e) => setBand(Number(e.target.value))}
              className="bg-panel border border-zinc-300 p-2 text-xs font-mono focus:outline-none focus:border-ink"
            >
              {BANDS.map(b => <option key={b} value={b}>{t('bt.bandPoints', { n: b * 100 })}</option>)}
            </select>
          </div>
        </div>
        <p className="text-[10px] font-mono text-zinc-500">{t('calc.currencyNote')}</p>
        {hasHoldings && (
          <p className={cn("text-xs font-mono px-3 py-2 border", flagged ? "border-orange-300 bg-orange-50 text-orange-700" : "border-green-300 bg-green-50 text-green-700")}>
            {flagged
              ? t('calc.bandAlert', { n: flagged, band: f.num(band * 100, 0) })
              : t('calc.bandOk', { band: f.num(band * 100, 0) })}
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CostSettings costs={costs} onChange={setCosts} />
          <BrokerSettings brokers={brokers} onChange={setBrokers} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse mt-2">
            <thead>
              <tr className="border-b border-ink bg-panel">
                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">{t('col.ticker')}</th>
                <th className={th}>{t('calc.optimalWeight')}</th>
                <th className={th}>{t('calc.current', { currency })}</th>
                <th className={th}>{t('calc.target', { currency })}</th>
                <th className={th}>{t('calc.trade', { currency })}</th>
                <th className={th}>{t('calc.order')}</th>
                <th className="p-2 text-[10px] font-serif italic text-right whitespace-nowrap">{t('calc.cost', { currency })}</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              {rows.map((row, i) => {
                const currentPct = targetTotal > 0 ? (row.current / targetTotal) * 100 : 0;
                return (
                  <React.Fragment key={row.sym}>
                    <tr className="hover:bg-zinc-50">
                      <td className="p-2 border-r border-zinc-200 font-bold text-ink whitespace-nowrap">
                        {row.sym}
                        <span className="block font-normal text-[9px] text-zinc-500">{BROKER_NAMES[brokerFor(row.sym)]}</span>
                        {flags[i] && <span className="block font-normal text-[9px] text-orange-600">{t('calc.outOfBand')}</span>}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right">{f.pct(row.weight)}</td>
                      <td className="p-2 border-r border-zinc-200 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.current || ''}
                          placeholder="0"
                          onChange={(e) => setCurrentHoldings({ ...currentHoldings, [row.sym]: Number(e.target.value) })}
                          className="w-24 text-right bg-transparent border-b border-zinc-300 focus:outline-none focus:border-ink"
                        />
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right whitespace-nowrap">{money(row.target)}</td>
                      <td className={cn("p-2 border-r border-zinc-200 text-right font-bold whitespace-nowrap", row.trade > 0 ? "text-green-600" : row.trade < 0 ? "text-red-600" : "text-zinc-500")}>
                        {row.trade > 0 ? `${t('calc.buy')} ` : row.trade < 0 ? `${t('calc.sell')} ` : ''}{money(Math.abs(row.trade))}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right whitespace-nowrap"><OrderCell order={row.order} symbol={row.sym} /></td>
                      <td className="p-2 text-right whitespace-nowrap text-zinc-500">{money(row.cost)}</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td colSpan={7} className="px-2 pb-2 pt-0">
                        <RebalanceBar currentPct={currentPct} targetPct={row.weight * 100} trade={row.trade} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!metadata && <p className="text-[10px] font-mono text-zinc-500">{t('calc.pricesLoading')}</p>}

        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mt-4 pt-4 border-t border-zinc-200">
          <div className="text-[10px] uppercase font-mono text-zinc-500 flex flex-col sm:flex-row sm:flex-wrap sm:gap-2">
            <span>{t('calc.totalCurrent', { value: money(totalCurrentHoldings) })}</span>
            <span className="hidden sm:inline">|</span>
            <span>{t('calc.totalTarget', { value: money(targetTotal) })}</span>
            <span className="hidden sm:inline">|</span>
            <span>{t('calc.totalCost', { value: money(totalCost) })}</span>
            <span className="hidden sm:inline">|</span>
            <span>{t('calc.unspent', { value: money(unspent) })}</span>
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
