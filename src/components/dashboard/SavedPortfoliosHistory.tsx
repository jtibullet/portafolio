import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { SavedPortfolio } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200";
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export function SavedPortfoliosHistory({ savedPortfolios }: { savedPortfolios: SavedPortfolio[] }) {
  return (
    <CollapsibleSection id="savedPortfolios" title="Saved Portfolios History" className="mt-4">
      <div className="bg-white border border-[#141414] border-t-0 p-4">
        {savedPortfolios.length === 0 ? (
          <div className="text-sm font-mono text-zinc-500 italic">No saved portfolios yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                  <th className={th}>Date/Time</th>
                  <th className={th}>Tickers</th>
                  <th className={`${th} text-right`}>Risk-Free</th>
                  <th className={`${th} text-right`}>E(R)</th>
                  <th className={`${th} text-right`}>Vol (σ)</th>
                  <th className="p-2 text-[10px] font-serif italic text-right">Sharpe</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px]">
                {savedPortfolios.map(p => (
                  <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="p-2 border-r border-zinc-200 text-zinc-600 whitespace-nowrap">{new Date(p.timestamp).toLocaleString()}</td>
                    <td className="p-2 border-r border-zinc-200 text-[#141414] font-bold max-w-[200px] truncate">{p.tickers.join(', ')}</td>
                    <td className="p-2 border-r border-zinc-200 text-right">{pct(p.riskFreeRate)}</td>
                    <td className="p-2 border-r border-zinc-200 text-right">{pct(p.expectedReturn)}</td>
                    <td className="p-2 border-r border-zinc-200 text-right">{pct(p.volatility)}</td>
                    <td className="p-2 text-right text-green-600 font-bold">{p.sharpeRatio.toFixed(3)}</td>
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
