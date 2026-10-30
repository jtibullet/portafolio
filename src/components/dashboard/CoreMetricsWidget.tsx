import { Download, FileSpreadsheet, FileJson, Printer } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import { downloadOptimizationCSV, downloadOptimizationExcel, downloadStrategyJSON } from '../../lib/exports';
import { SectionTitle } from '../ui/SectionTitle';
import type { PortfolioParams, QuantStats } from '../../types';

const exportButtonClass = "flex items-center gap-1 px-2 py-0.5 bg-white border border-ink hover:bg-zinc-100 text-ink text-[10px] uppercase font-bold transition-colors";
const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200 whitespace-nowrap";
const td = "p-2 border-r border-zinc-200 text-right cursor-help whitespace-nowrap";

export function CoreMetricsWidget({ quantStats, params }: { quantStats: QuantStats; params: PortfolioParams }) {
  const { t, f } = useI18n();
  return (
    <div className="flex flex-col h-full bg-white border border-ink">
      <div className="flex flex-wrap justify-between items-end gap-2 mb-2">
        <SectionTitle>{t('core.title')}</SectionTitle>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">{t('core.subtitle')}</span>
          {quantStats.optimization && (<>
            <button onClick={() => downloadOptimizationCSV(quantStats)} className={exportButtonClass} title={t('core.downloadCsv')}>
              <Download size={12} />
              CSV
            </button>
            <button onClick={() => downloadOptimizationExcel(quantStats)} className={exportButtonClass} title={t('core.downloadExcel')}>
              <FileSpreadsheet size={12} />
              Excel
            </button>
            <button onClick={() => downloadStrategyJSON(quantStats, params)} className={exportButtonClass} title={t('core.downloadJson')}>
              <FileJson size={12} />
              JSON
            </button>
            <button onClick={() => window.print()} className={exportButtonClass} title={t('core.print')}>
              <Printer size={12} />
              {t('core.printLabel')}
            </button>
          </>)}
        </div>
      </div>
      <div className="bg-white border border-ink overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink bg-panel">
              <th className={th}>{t('col.asset')}</th>
              <th className={`${th} text-right`}>{t('col.annReturn')}</th>
              <th className={`${th} text-right`}>{t('col.annVol')}</th>
              <th className={`${th} text-right`}>{t('col.sharpe')}</th>
              <th className={`${th} text-right`}>{t('col.beta')}</th>
              <th className={`${th} text-right`}>{t('col.capm')}</th>
              <th className={`${th} text-right`}>{t('col.alpha')}</th>
              <th className={`${th} text-right`}>{t('col.sortino')}</th>
              <th className="p-2 text-[10px] font-serif italic text-right whitespace-nowrap">{t('col.maxDrawdown')}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {quantStats.assetStats.map(stat => (
              <tr key={stat.symbol} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-2 border-r border-zinc-200 font-bold text-ink">{stat.symbol}</td>
                <td className={td} title={t('tip.annReturn')}>{f.pct(stat.annReturn)}</td>
                <td className={td} title={t('tip.annVol')}>{f.pct(stat.annVolatility)}</td>
                <td className={td} title={t('tip.sharpe')}>{f.num(stat.sharpeRatio)}</td>
                <td className={td} title={t('tip.beta')}>{f.num(stat.beta, 3)}</td>
                <td className={td} title={t('tip.capm')}>{f.pct(stat.capmExpectedReturn)}</td>
                <td className={cn(td, "font-bold", stat.alpha >= 0 ? "text-green-600" : "text-red-600")} title={t('tip.alpha')}>
                  {f.pct(stat.alpha)}
                </td>
                <td className={td} title={t('tip.sortino')}>{f.num(stat.sortino)}</td>
                <td className="p-2 text-right cursor-help whitespace-nowrap text-red-600" title={t('tip.maxDrawdown')}>-{f.pct(stat.maxDrawdown, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
