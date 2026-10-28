import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { TabId } from '../../types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Advanced Analytics' },
  { id: 'ai', label: 'AI & Projections' },
  { id: 'validation', label: 'Data Validation' },
];

function ExchangeRateCard({ exchangeRate, rateLoading }: { exchangeRate: number | null; rateLoading: boolean }) {
  return (
    <div className="bg-white border border-[#141414] p-4 min-w-[200px]">
      <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Exchange Rate (USD/CLP)</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-mono">
          {rateLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 inline" />
          ) : exchangeRate ? (
            `$${exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ) : (
            '---'
          )}
        </span>
      </div>
      <div className="text-[9px] font-mono text-zinc-400 uppercase">Ticker: CLP=X</div>
    </div>
  );
}

export function WorkspaceTabs({ activeTab, onChange, exchangeRate, rateLoading }: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  exchangeRate: number | null;
  rateLoading: boolean;
}) {
  return (
    <header className="flex justify-between items-end mb-6 flex-col sm:flex-row gap-6 print:hidden">
      <div className="w-full">
        <h2 className="text-[10px] font-bold font-mono uppercase text-zinc-500 tracking-wider mb-2">Portfolio Environment Workspace</h2>
        <div className="flex w-full bg-zinc-200 p-1 rounded-sm border border-zinc-300">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn("flex-1 py-2 text-xs font-mono uppercase font-bold transition-all rounded-sm", activeTab === tab.id ? "bg-white text-[#141414] shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <ExchangeRateCard exchangeRate={exchangeRate} rateLoading={rateLoading} />
    </header>
  );
}
