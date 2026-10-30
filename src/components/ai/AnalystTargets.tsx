import { useI18n } from '../../i18n';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CenteredSpinner } from '../ui/Spinner';
import type { AssetMetadata } from '../../types';

const isValid = (v: number | null | undefined): v is number => v !== null && v !== undefined && !isNaN(v);

export function AnalystTargets({ metadata, loading }: { metadata: AssetMetadata[] | null; loading: boolean }) {
  const { t, f } = useI18n();
  return (
    <CollapsibleSection id="analystTargets" title={t('analyst.title')} className="mt-2 sm:mt-8 print:hidden">
      <div className="bg-white border border-ink border-t-0 p-4">
        {loading ? (
          <CenteredSpinner />
        ) : metadata && metadata.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-200">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="p-2 font-bold">{t('col.ticker')}</th>
                  <th className="p-2 font-bold text-right whitespace-nowrap">{t('analyst.price')}</th>
                  <th className="p-2 font-bold text-right whitespace-nowrap">{t('analyst.target')}</th>
                  <th className="p-2 font-bold text-right whitespace-nowrap">{t('analyst.growth')}</th>
                </tr>
              </thead>
              <tbody>
                {metadata.map((c, i) => {
                  const growth = c.expectedGrowth;
                  return (
                    <tr key={c.symbol} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                      <td className="p-2 font-bold">{c.symbol}</td>
                      <td className="p-2 text-right cursor-help" title={t('tip.price')}>{isValid(c.currentPrice) ? f.money(c.currentPrice) : t('common.na')}</td>
                      <td className="p-2 text-right cursor-help" title={t('tip.target')}>{isValid(c.targetMeanPrice) ? f.money(c.targetMeanPrice) : t('common.na')}</td>
                      <td className={`p-2 text-right cursor-help ${isValid(growth) && growth > 0 ? 'text-green-600' : isValid(growth) && growth < 0 ? 'text-red-600' : ''}`} title={t('tip.growth')}>
                        {/* expectedGrowth from the server is already in percent */}
                        {isValid(growth) ? f.signedPct(growth / 100) : t('common.na')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-zinc-500 italic text-sm">{t('analyst.empty')}</div>
        )}
      </div>
    </CollapsibleSection>
  );
}
