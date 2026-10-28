import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CenteredSpinner } from '../ui/Spinner';
import type { SentimentResult } from '../../types';

function sentimentStyle(score: number) {
  if (score >= 61) return { color: "text-green-600", bg: "bg-green-100", border: "border-green-300", bar: 'bg-green-500', label: "Bullish / Greed" };
  if (score <= 39) return { color: "text-red-600", bg: "bg-red-100", border: "border-red-300", bar: 'bg-red-500', label: "Bearish / Fear" };
  return { color: "text-zinc-500", bg: "bg-zinc-100", border: "border-zinc-300", bar: 'bg-yellow-500', label: "Neutral" };
}

function SentimentCard({ item }: { item: SentimentResult }) {
  const style = sentimentStyle(item.score);
  return (
    <div className={`border ${style.border} p-4 flex flex-col`}>
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-lg font-mono">{item.symbol}</span>
        <div className={`px-2 py-1 text-[10px] uppercase font-bold ${style.bg} ${style.color} border ${style.border}`}>{style.label}</div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
          <span>Score</span>
          <span>{item.score}/100</span>
        </div>
        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden flex">
          <div className={`h-full ${style.bar}`} style={{ width: `${item.score}%` }}></div>
        </div>
      </div>
      <div className="flex-1 mt-2">
        <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">Latest Headlines:</div>
        {item.news && item.news.length > 0 ? (
          <ul className="space-y-3">
            {item.news.map((newsItem, idx) => (
              <li key={idx} className="text-xs">
                <a href={newsItem.link} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#141414] font-medium block truncate">
                  {newsItem.title}
                </a>
                <span className="text-[10px] text-zinc-500">{newsItem.publisher}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-zinc-500 italic">No recent news available.</div>
        )}
      </div>
    </div>
  );
}

export function SentimentPanel({ sentimentData, loading }: { sentimentData: SentimentResult[] | null; loading: boolean }) {
  return (
    <CollapsibleSection id="sentiment" title="📰 AI Market Sentiment Analysis (NLP)" defaultOpen className="mt-8 print:hidden">
      <div className="bg-white border border-[#141414] border-t-0 p-4">
        {loading ? (
          <CenteredSpinner />
        ) : sentimentData && sentimentData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sentimentData.map(item => <SentimentCard key={item.symbol} item={item} />)}
          </div>
        ) : (
          <div className="text-center text-zinc-500 italic text-sm">No sentiment data available.</div>
        )}
      </div>
    </CollapsibleSection>
  );
}
