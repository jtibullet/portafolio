import { Download, FileSpreadsheet, FileJson, Printer } from 'lucide-react';
import { cn } from '../../lib/cn';
import { downloadOptimizationCSV, downloadOptimizationExcel, downloadStrategyJSON } from '../../lib/exports';
import { SectionTitle } from '../ui/SectionTitle';
import type { PortfolioParams, QuantStats } from '../../types';

const exportButtonClass = "flex items-center gap-1 px-2 py-0.5 bg-white border border-[#141414] hover:bg-zinc-100 text-[#141414] text-[10px] uppercase font-bold transition-colors";
const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200";
const td = "p-2 border-r border-zinc-200 text-right cursor-help";

export function CoreMetricsWidget({ quantStats, params }: { quantStats: QuantStats; params: PortfolioParams }) {
  return (
    <div className="flex flex-col h-full bg-white border border-[#141414]">
      <div className="flex justify-between items-end mb-2">
        <SectionTitle>Core Risk & Return Metrics</SectionTitle>
        <div className="flex items-center gap-2 print:hidden">
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Annualized | CAPM Expected</span>
          {quantStats.optimization && (<>
          <button onClick={() => downloadOptimizationCSV(quantStats)} className={exportButtonClass} title="Download CSV">
            <Download size={12} />
            CSV
          </button>
          <button onClick={() => downloadOptimizationExcel(quantStats)} className={exportButtonClass} title="Download Excel (.xlsx)">
            <FileSpreadsheet size={12} />
            Excel
          </button>
          <button onClick={() => downloadStrategyJSON(quantStats, params)} className={exportButtonClass} title="Download Strategy JSON">
            <FileJson size={12} />
            JSON
          </button>
          <button onClick={() => window.print()} className={exportButtonClass} title="Print / Export to PDF">
            <Printer size={12} />
            Print
          </button>
          </>)}
        </div>
      </div>
      <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#141414] bg-[#f9f9f9]">
              <th className={th}>Asset</th>
              <th className={`${th} text-right`}>Ann. Return</th>
              <th className={`${th} text-right`}>Ann. Volatility</th>
              <th className={`${th} text-right`}>Sharpe</th>
              <th className={`${th} text-right`}>Beta (β)</th>
              <th className={`${th} text-right`}>CAPM E(R)</th>
              <th className="p-2 text-[10px] font-serif italic text-right">Alpha (α)</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {quantStats.assetStats.map(stat => (
              <tr key={stat.symbol} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-2 border-r border-zinc-200 font-bold text-[#141414]">{stat.symbol}</td>
                <td className={td} title="Calculated from historical daily log returns, annualized (x252)">{(stat.annReturn * 100).toFixed(2)}%</td>
                <td className={td} title="Calculated from standard deviation of historical daily log returns, annualized (x√252)">{(stat.annVolatility * 100).toFixed(2)}%</td>
                <td className={td} title="Calculated as (Ann. Return - Risk Free Rate) / Ann. Volatility">{stat.sharpeRatio.toFixed(2)}</td>
                <td className={td} title="Calculated as Covariance(Asset, Benchmark) / Variance(Benchmark) over the historical period">{stat.beta.toFixed(3)}</td>
                <td className={td} title="Calculated using Capital Asset Pricing Model: Risk Free Rate + Beta * (Market Return - Risk Free Rate)">{(stat.capmExpectedReturn * 100).toFixed(2)}%</td>
                <td className={cn("p-2 text-right font-bold cursor-help", stat.alpha >= 0 ? "text-green-600" : "text-red-600")} title="Jensen's Alpha: Actual Ann. Return - CAPM Expected Return">
                  {(stat.alpha * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
