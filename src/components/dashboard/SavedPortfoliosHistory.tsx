import { useI18n } from '../../i18n';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { SavedPortfolio } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 whitespace-nowrap";

export function SavedPortfoliosHistory({ savedPortfolios }: { savedPortfolios: SavedPortfolio[] }) {
  const { t, f } = useI18n();
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
                  <th className="p-2 text-[10px] font-serif italic text-right">{t('col.sharpe')}</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px]">
                {savedPortfolios.map(p => (
                  <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="p-2 border-r border-zinc-200 text-zinc-600 whitespace-nowrap">{f.dateTime(p.timestamp)}</td>
                    <td className="p-2 border-r border-zinc-200 text-ink font-bold max-w-[200px] truncate">{p.tickers.join(', ')}</td>
                    <td className="p-2 border-r border-zinc-200 text-right">{f.pct(p.riskFreeRate)}</td>
                    <td className="p-2 border-r border-zinc-200 text-right">{f.pct(p.expectedReturn)}</td>
                    <td className="p-2 border-r border-zinc-200 text-right">{f.pct(p.volatility)}</td>
                    <td className="p-2 text-right text-green-600 font-bold">{f.num(p.sharpeRatio, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
