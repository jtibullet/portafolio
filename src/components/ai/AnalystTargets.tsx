import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CenteredSpinner } from '../ui/Spinner';
import type { AssetMetadata } from '../../types';

const isValid = (v: number | null | undefined): v is number => v !== null && v !== undefined && !isNaN(v);

export function AnalystTargets({ metadata, loading }: { metadata: AssetMetadata[] | null; loading: boolean }) {
  return (
    <CollapsibleSection id="analystTargets" title="🎯 Analyst Targets & Expected Growth (Current Portfolio)" className="mt-8 print:hidden">
      <div className="bg-white border border-[#141414] border-t-0 p-4">
        {loading ? (
          <CenteredSpinner />
        ) : metadata && metadata.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-200">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="p-2 font-bold">Ticker</th>
                  <th className="p-2 font-bold text-right">Current Price (USD)</th>
                  <th className="p-2 font-bold text-right">1-Year Target Price (USD)</th>
                  <th className="p-2 font-bold text-right">Expected Growth (%)</th>
                </tr>
              </thead>
              <tbody>
                {metadata.map((c, i) => {
                  const growth = c.expectedGrowth;
                  return (
                    <tr key={c.symbol} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                      <td className="p-2 font-bold">{c.symbol}</td>
                      <td className="p-2 text-right cursor-help" title="Sourced from Yahoo Finance 'price.regularMarketPrice'">{isValid(c.currentPrice) ? `$${c.currentPrice.toFixed(2)}` : 'N/A'}</td>
                      <td className="p-2 text-right cursor-help" title="Sourced from Yahoo Finance 'financialData.targetMeanPrice' (average of analyst targets)">{isValid(c.targetMeanPrice) ? `$${c.targetMeanPrice.toFixed(2)}` : 'N/A'}</td>
                      <td className={`p-2 text-right cursor-help ${isValid(growth) && growth > 0 ? 'text-green-600' : isValid(growth) && growth < 0 ? 'text-red-600' : ''}`} title="Calculated as (Target Price - Current Price) / Current Price">
                        {isValid(growth) ? `${growth > 0 ? '+' : ''}${growth.toFixed(2)}%` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-zinc-500 italic text-sm">No analyst target data available.</div>
        )}
      </div>
    </CollapsibleSection>
  );
}
