import { useI18n, type MessageKey } from '../../i18n';
import { SectionHeader } from '../ui/SectionTitle';

const SCENARIOS: { label: MessageKey; formula: string; z: number; card: string; text: string }[] = [
  { label: 'scen.crisis', formula: 'μ - 1.645 * σ', z: -1.645, card: 'border-red-200 border-l-red-600', text: 'text-red-600' },
  { label: 'scen.lower', formula: 'μ - 1 * σ', z: -1, card: 'border-orange-200 border-l-orange-500', text: 'text-orange-600' },
  { label: 'scen.upper', formula: 'μ + 1 * σ', z: 1, card: 'border-blue-200 border-l-blue-500', text: 'text-blue-600' },
  { label: 'scen.euphoria', formula: 'μ + 1.645 * σ', z: 1.645, card: 'border-green-200 border-l-green-600', text: 'text-green-600' },
];

/** One-year return ranges from the optimal portfolio's mean and volatility under a normal approximation. */
export function ProbabilisticScenarios({ mu, sigma }: { mu: number; sigma: number }) {
  const { t, f } = useI18n();
  return (
    <div className="flex flex-col mt-2 sm:mt-8">
      <SectionHeader title={t('scen.title')} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {SCENARIOS.map(s => (
          <div key={s.label} className={`bg-white border border-l-4 p-3 sm:p-4 ${s.card}`}>
            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">{t(s.label)}</div>
            <div className="text-[9px] font-mono text-zinc-400 mb-2">{s.formula}</div>
            <div className={`text-lg sm:text-xl font-mono ${s.text}`}>{f.pct(mu + s.z * sigma)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
