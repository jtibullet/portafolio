import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useI18n, type MessageKey } from '../../i18n';
import type { TabId } from '../../types';

const TABS: { id: TabId; label: MessageKey }[] = [
  { id: 'dashboard', label: 'tabs.dashboard' },
  { id: 'analytics', label: 'tabs.analytics' },
  { id: 'ai', label: 'tabs.ai' },
  { id: 'validation', label: 'tabs.validation' },
];

function ExchangeRateCard({ exchangeRate, rateLoading }: { exchangeRate: number | null; rateLoading: boolean }) {
  const { t, f } = useI18n();
  return (
    <div className="bg-white border border-ink px-4 py-3 w-full sm:w-auto sm:min-w-[200px] flex sm:block items-center justify-between gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">{t('fx.title')}</div>
        <div className="text-[9px] font-mono text-zinc-400 uppercase hidden sm:block">{t('fx.ticker')}</div>
      </div>
      <span className="text-xl sm:text-2xl font-mono">
        {rateLoading && !exchangeRate ? (
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400 inline" />
        ) : exchangeRate ? f.money(exchangeRate, 'CLP', 2) : '---'}
      </span>
    </div>
  );
}

export function WorkspaceTabs({ activeTab, onChange, exchangeRate, rateLoading }: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  exchangeRate: number | null;
  rateLoading: boolean;
}) {
  const { t } = useI18n();
  return (
    <header className="flex justify-between items-stretch sm:items-end mb-6 flex-col-reverse sm:flex-row gap-4 sm:gap-6 print:hidden">
      <div className="w-full min-w-0">
        <h2 className="text-[10px] font-bold font-mono uppercase text-zinc-500 tracking-wider mb-2">{t('tabs.workspace')}</h2>
        <div className="flex w-full bg-zinc-200 p-1 rounded-sm border border-zinc-300 overflow-x-auto" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex-1 shrink-0 whitespace-nowrap px-3 py-2 text-[10px] sm:text-xs font-mono uppercase font-bold transition-all rounded-sm",
                activeTab === tab.id ? "bg-white text-ink shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>
      <ExchangeRateCard exchangeRate={exchangeRate} rateLoading={rateLoading} />
    </header>
  );
}
