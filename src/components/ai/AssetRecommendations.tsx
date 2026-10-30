import { useI18n } from '../../i18n';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CenteredSpinner } from '../ui/Spinner';
import type { EvaluatedCandidate, Recommendations } from '../../types';

function CandidateTable({ title, candidates, highlight }: {
  title: string;
  candidates: EvaluatedCandidate[];
  /** Which column to color: positive Sharpe for growth picks, the drawdown for dip picks */
  highlight: 'sharpe' | 'drawdown';
}) {
  const { t, f } = useI18n();
  const th = "p-2 font-bold text-right whitespace-nowrap";
  return (
    <div>
      <h4 className="text-sm font-bold font-mono mb-2 flex items-center gap-2 text-ink">{title}</h4>
      <div className="overflow-x-auto border border-zinc-200">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-2 font-bold">{t('col.ticker')}</th>
              <th className={th}>{t('recs.corr')}</th>
              <th className={th}>{t('recs.sharpe')}</th>
              <th className={th}>{t('recs.drawdown')}</th>
              <th className={th}>{t('recs.momentum')}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length > 0 ? candidates.map((c, i) => (
              <tr key={c.symbol} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                <td className="p-2 font-bold">{c.symbol}</td>
                <td className="p-2 text-right cursor-help" title={t('tip.corr')}>{f.num(c.correlation)}</td>
                <td className={`p-2 text-right cursor-help ${highlight === 'sharpe' && c.sharpe > 0 ? 'text-green-600' : ''}`} title={t('tip.recSharpe')}>{f.num(c.sharpe)}</td>
                <td className={`p-2 text-right cursor-help ${highlight === 'drawdown' ? 'text-red-600' : ''}`} title={t('tip.drawdown')}>{f.signedPct(c.drawdown)}</td>
                <td className={`p-2 text-right cursor-help ${c.momentum20D > 0 ? 'text-green-600' : 'text-red-600'}`} title={t('tip.momentum')}>{f.signedPct(c.momentum20D)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-4 text-center text-zinc-500 italic">{t('recs.none')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Low-correlation candidates from the server's universe that are not already in the portfolio. */
export function AssetRecommendations({ recommendations, loading }: { recommendations: Recommendations | null; loading: boolean }) {
  const { t } = useI18n();
  return (
    <CollapsibleSection id="recommendations" title={t('recs.title')} className="mt-2 sm:mt-8 print:hidden">
      <div className="bg-white border border-ink border-t-0 p-4">
        {loading ? (
          <CenteredSpinner />
        ) : recommendations ? (
          <div className="flex flex-col gap-6">
            <CandidateTable title={t('recs.growth')} candidates={recommendations.growth} highlight="sharpe" />
            <CandidateTable title={t('recs.dip')} candidates={recommendations.dip} highlight="drawdown" />
          </div>
        ) : (
          <div className="text-center text-zinc-500 italic text-sm">{t('recs.waiting')}</div>
        )}
      </div>
    </CollapsibleSection>
  );
}
