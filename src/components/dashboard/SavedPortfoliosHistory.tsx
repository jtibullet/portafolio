import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import { CHART } from '../../lib/chartTheme';
import { convertPrices } from '../../engine/currency';
import { trackPortfolio, type TrackingResult } from '../../engine/tracking';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { PriceRow, SavedPortfolio } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 whitespace-nowrap";
const axisTick = { fontSize: 9, fontFamily: 'monospace', fill: CHART.axis };

/** SQLite stores the save time in UTC as "YYYY-MM-DD HH:MM:SS". */
const savedDay = (timestamp: string) => timestamp.slice(0, 10);

type TrackingState = { status: 'loading' } | { status: 'error' } | { status: 'tooRecent' } | { status: 'ok'; result: TrackingResult };

/** Prices since the save date, converted to the portfolio's currency, and the buy-and-hold result. */
function useTracking(portfolio: SavedPortfolio, benchmark: string) {
  const [state, setState] = useState<TrackingState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/historical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: portfolio.tickers, benchmark, startDate: savedDay(portfolio.timestamp) }),
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.data)) throw new Error(data.error || 'No data');
        const rows: PriceRow[] = data.data;
        const converted = convertPrices(rows, data.symbols ?? [], Array.isArray(data.fx) ? data.fx : null, portfolio.currency ?? 'USD') ?? rows;
        const result = trackPortfolio(converted, portfolio.tickers, portfolio.weights, benchmark, savedDay(portfolio.timestamp), portfolio.expectedReturn);
        if (!cancelled) setState(result && result.tradingDays > 0 ? { status: 'ok', result } : { status: 'tooRecent' });
      } catch (err) {
        console.error('Tracking failed', err);
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [portfolio, benchmark]);
  return state;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase text-zinc-500 font-bold">{label}</span>
      <span className={cn("text-sm font-mono", tone === 'up' && "text-green-600", tone === 'down' && "text-red-600")}>{value}</span>
    </div>
  );
}

function TrackingPanel({ portfolio, benchmark }: { portfolio: SavedPortfolio; benchmark: string }) {
  const { t, f } = useI18n();
  const state = useTracking(portfolio, benchmark);
  if (state.status === 'loading') return <div className="flex items-center gap-2 text-xs font-mono text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" />{t('track.loading')}</div>;
  if (state.status === 'error') return <div className="text-xs font-mono text-red-600">{t('track.error')}</div>;
  if (state.status === 'tooRecent') return <div className="text-xs font-mono text-zinc-500">{t('track.tooRecent')}</div>;
  const r = state.result;
  const tone = (v: number) => (v >= 0 ? 'up' : 'down');
  const data = r.dates.map((date, k) => ({ date, portfolio: r.values[k], benchmark: r.benchmarkValues?.[k] }));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label={t('track.actual')} value={f.signedPct(r.totalReturn)} tone={tone(r.totalReturn)} />
        <Stat label={t('track.expected')} value={f.signedPct(r.expectedReturn)} />
        <Stat label={t('track.benchmark', { symbol: benchmark })} value={r.benchmarkReturn === null ? '—' : f.signedPct(r.benchmarkReturn)} tone={r.benchmarkReturn === null ? undefined : tone(r.benchmarkReturn)} />
        <Stat label={t('metrics.maxDrawdown')} value={`-${f.pct(r.maxDrawdown, 1)}`} tone="down" />
        <Stat label={t('track.since')} value={t('track.days', { date: r.startDate, n: r.tradingDays })} />
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={axisTick} stroke={CHART.axis} minTickGap={40} tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`} />
            <YAxis domain={['auto', 'auto']} tick={axisTick} stroke={CHART.axis} width={36} tickFormatter={(v: number) => f.num(v, 0)} />
            <Tooltip formatter={(v: number, key: string) => [f.signedPct(v / 100 - 1), key === 'portfolio' ? t('perf.portfolio') : benchmark]} contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            <Line dataKey="portfolio" stroke={CHART.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {r.benchmarkValues && <Line dataKey="benchmark" stroke={CHART.muted} strokeDasharray="5 5" dot={false} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-zinc-500">
        {t('track.note', { currency: portfolio.currency ?? 'USD' })}
        {r.missing.length > 0 && ` ${t('track.missing', { symbols: r.missing.join(', ') })}`}
      </p>
    </div>
  );
}

export function SavedPortfoliosHistory({ savedPortfolios, defaultBenchmark }: { savedPortfolios: SavedPortfolio[]; defaultBenchmark: string }) {
  const { t, f } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const openPortfolio = savedPortfolios.find(p => p.id === open);
  return (
    <CollapsibleSection id="savedPortfolios" title={t('history.title')} className="mt-4">
      <div className="bg-white border border-ink border-t-0 p-4">
        {savedPortfolios.length === 0 ? (
          <div className="text-sm font-mono text-zinc-500 italic">{t('history.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink bg-panel">
                  <th className={th}>{t('history.date')}</th>
                  <th className={th}>{t('history.tickers')}</th>
                  <th className={`${th} text-right`}>{t('history.rf')}</th>
                  <th className={`${th} text-right`}>{t('history.er')}</th>
                  <th className={`${th} text-right`}>{t('history.vol')}</th>
                  <th className={`${th} text-right`}>{t('col.sharpe')}</th>
                  <th className="p-2 text-[10px] font-serif italic text-right">{t('track.title')}</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px]">
                {savedPortfolios.map(p => (
                    <tr key={p.id} className={cn("border-b border-zinc-100 hover:bg-zinc-50", open === p.id && "bg-blue-50")}>
                      <td className="p-2 border-r border-zinc-200 text-zinc-600 whitespace-nowrap">{f.dateTime(p.timestamp.replace(' ', 'T') + 'Z')}</td>
                      <td className="p-2 border-r border-zinc-200 text-ink font-bold max-w-[200px] truncate">{p.tickers.join(', ')}</td>
                      <td className="p-2 border-r border-zinc-200 text-right">{f.pct(p.riskFreeRate)}</td>
                      <td className="p-2 border-r border-zinc-200 text-right">{f.pct(p.expectedReturn)}</td>
                      <td className="p-2 border-r border-zinc-200 text-right">{f.pct(p.volatility)}</td>
                      <td className="p-2 border-r border-zinc-200 text-right text-green-600 font-bold">{f.num(p.sharpeRatio, 3)}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => setOpen(open === p.id ? null : p.id)}
                          aria-expanded={open === p.id}
                          className="px-2 py-0.5 border border-ink text-[10px] uppercase font-bold hover:bg-zinc-100 whitespace-nowrap"
                        >
                          {open === p.id ? t('track.hide') : t('track.show')}
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Below the table rather than in a row, so it stays full width on phones */}
        {openPortfolio && (
          <div className="mt-4 border border-zinc-300 bg-zinc-50 p-3">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold mb-2">
              {t('track.title')} · {f.dateTime(openPortfolio.timestamp.replace(' ', 'T') + 'Z')} · {openPortfolio.tickers.join(', ')}
            </div>
            <TrackingPanel portfolio={openPortfolio} benchmark={openPortfolio.benchmark || defaultBenchmark} />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
