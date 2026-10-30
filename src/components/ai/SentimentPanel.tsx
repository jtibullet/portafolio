import { useI18n, type MessageKey } from '../../i18n';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CenteredSpinner } from '../ui/Spinner';
import type { SentimentResult } from '../../types';

function sentimentStyle(score: number): { color: string; bg: string; border: string; bar: string; label: MessageKey } {
  if (score >= 61) return { color: "text-green-600", bg: "bg-green-100", border: "border-green-300", bar: 'bg-green-500', label: 'sent.bullish' };
  if (score <= 39) return { color: "text-red-600", bg: "bg-red-100", border: "border-red-300", bar: 'bg-red-500', label: 'sent.bearish' };
  return { color: "text-zinc-500", bg: "bg-zinc-100", border: "border-zinc-300", bar: 'bg-yellow-500', label: 'sent.neutral' };
}

function SentimentCard({ item }: { item: SentimentResult }) {
  const { t } = useI18n();
  const style = sentimentStyle(item.score);
  return (
    <div className={`border ${style.border} p-4 flex flex-col min-w-0`}>
      <div className="flex justify-between items-center mb-4 gap-2">
        <span className="font-bold text-lg font-mono">{item.symbol}</span>
        <div className={`px-2 py-1 text-[10px] uppercase font-bold ${style.bg} ${style.color} border ${style.border}`}>{t(style.label)}</div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
          <span>{t('sent.score')}</span>
          <span>{item.score}/100</span>
        </div>
        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden flex">
          <div className={`h-full ${style.bar}`} style={{ width: `${item.score}%` }}></div>
        </div>
      </div>
      <div className="flex-1 mt-2">
        <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">{t('sent.headlines')}</div>
        {item.news && item.news.length > 0 ? (
          <ul className="space-y-3">
            {item.news.map((newsItem, idx) => (
              <li key={idx} className="text-xs">
                <a href={newsItem.link} target="_blank" rel="noopener noreferrer" className="hover:underline text-ink font-medium block truncate">
                  {newsItem.title}
                </a>
                <span className="text-[10px] text-zinc-500">{newsItem.publisher}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-zinc-500 italic">{t('sent.noNews')}</div>
        )}
      </div>
    </div>
  );
}

export function SentimentPanel({ sentimentData, loading }: { sentimentData: SentimentResult[] | null; loading: boolean }) {
  const { t } = useI18n();
  return (
    <CollapsibleSection id="sentiment" title={t('sent.title')} defaultOpen className="mt-2 sm:mt-8 print:hidden">
      <div className="bg-white border border-ink border-t-0 p-4">
        {loading ? (
          <CenteredSpinner />
        ) : sentimentData && sentimentData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sentimentData.map(item => <SentimentCard key={item.symbol} item={item} />)}
          </div>
        ) : (
          <div className="text-center text-zinc-500 italic text-sm">{t('sent.empty')}</div>
        )}
      </div>
    </CollapsibleSection>
  );
}
