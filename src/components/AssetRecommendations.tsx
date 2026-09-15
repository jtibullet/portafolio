import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AssetRecommendationsProps {
  recommendations: { growth: any[], dip: any[] } | null;
  isRecommendationsExpanded: boolean;
  setIsRecommendationsExpanded: (expanded: boolean) => void;
  isRecommendationsLoading: boolean;
}

export const AssetRecommendations: React.FC<AssetRecommendationsProps> = ({
  recommendations,
  isRecommendationsExpanded,
  setIsRecommendationsExpanded,
  isRecommendationsLoading
}) => {
  return (
    <div className="flex flex-col mt-8 print:hidden">
      <button 
        onClick={() => setIsRecommendationsExpanded(!isRecommendationsExpanded)}
        className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2">💡 AI Asset Recommendations (Diversification & Buy The Dip)</span>
        <span>{isRecommendationsExpanded ? '[-]' : '[+]'}</span>
      </button>
      {isRecommendationsExpanded && (
        <div className="bg-white border border-[#141414] border-t-0 p-4">
          {isRecommendationsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="animate-spin text-zinc-400" size={32} />
            </div>
          ) : recommendations ? (
            <div className="flex flex-col gap-6">
              <div>
                <h4 className="text-sm font-bold font-mono mb-2 flex items-center gap-2 text-[#141414]">🚀 Top Growth & Diversification Candidates</h4>
                <div className="overflow-x-auto border border-zinc-200">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="p-2 font-bold">Ticker</th>
                        <th className="p-2 font-bold text-right">Corr to Port</th>
                        <th className="p-2 font-bold text-right">Hist. Sharpe</th>
                        <th className="p-2 font-bold text-right">6-Mo Return</th>
                        <th className="p-2 font-bold text-right">1-Yr Exp Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.growth.length > 0 ? recommendations.growth.map((c: any, i: number) => (
                        <tr key={c.symbol} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                          <td className="p-2 font-bold">{c.symbol}</td>
                          <td className="p-2 text-right cursor-help" title="Pearson correlation between this asset's historical returns and the currently optimized portfolio's daily returns">{c.correlation.toFixed(2)}</td>
                          <td className="p-2 text-right text-green-600 cursor-help" title="Calculated as (Ann. Return - Risk Free Rate) / Ann. Volatility based on historical daily log returns">{c.sharpe.toFixed(2)}</td>
                          <td className="p-2 text-right cursor-help" title="Calculated as percentage change in adjusted close price over the trailing 6 months">{(c.sixMonthReturn * 100).toFixed(2)}%</td>
                          <td className="p-2 text-right text-green-600 cursor-help" title="Calculated as (Analyst 1-Year Target Price - Current Price) / Current Price via Yahoo Finance">{(c.expectedGrowth * 100).toFixed(2)}%</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="p-4 text-center text-zinc-500 italic">No candidates met the criteria.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold font-mono mb-2 flex items-center gap-2 text-[#141414]">📉 Buy The Dip: Undervalued Diversifiers</h4>
                <div className="overflow-x-auto border border-zinc-200">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="p-2 font-bold">Ticker</th>
                        <th className="p-2 font-bold text-right">Corr to Port</th>
                        <th className="p-2 font-bold text-right">Hist. Sharpe</th>
                        <th className="p-2 font-bold text-right">6-Mo Return</th>
                        <th className="p-2 font-bold text-right">1-Yr Exp Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.dip.length > 0 ? recommendations.dip.map((c: any, i: number) => (
                        <tr key={c.symbol} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                          <td className="p-2 font-bold">{c.symbol}</td>
                          <td className="p-2 text-right cursor-help" title="Pearson correlation between this asset's historical returns and the currently optimized portfolio's daily returns">{c.correlation.toFixed(2)}</td>
                          <td className="p-2 text-right cursor-help" title="Calculated as (Ann. Return - Risk Free Rate) / Ann. Volatility based on historical daily log returns">{c.sharpe.toFixed(2)}</td>
                          <td className="p-2 text-right text-red-600 cursor-help" title="Calculated as percentage change in adjusted close price over the trailing 6 months">{(c.sixMonthReturn * 100).toFixed(2)}%</td>
                          <td className="p-2 text-right text-green-600 cursor-help" title="Calculated as (Analyst 1-Year Target Price - Current Price) / Current Price via Yahoo Finance">{(c.expectedGrowth * 100).toFixed(2)}%</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="p-4 text-center text-zinc-500 italic">No candidates met the criteria.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-zinc-500 italic text-sm">Waiting for recommendation processing...</div>
          )}
        </div>
      )}
    </div>
  );
};
