import { SectionHeader } from '../ui/SectionTitle';

const SCENARIOS = [
  { label: 'Crisis (95% Tail)', formula: 'μ - 1.645 * σ', z: -1.645, card: 'border-red-200 border-l-red-600', text: 'text-red-600' },
  { label: 'Lower Expected', formula: 'μ - 1 * σ', z: -1, card: 'border-orange-200 border-l-orange-500', text: 'text-orange-600' },
  { label: 'Upper Expected', formula: 'μ + 1 * σ', z: 1, card: 'border-blue-200 border-l-blue-500', text: 'text-blue-600' },
  { label: 'Euphoria (95% Tail)', formula: 'μ + 1.645 * σ', z: 1.645, card: 'border-green-200 border-l-green-600', text: 'text-green-600' },
];

/** One-year return ranges from the optimal portfolio's mean and volatility under a normal approximation. */
export function ProbabilisticScenarios({ mu, sigma }: { mu: number; sigma: number }) {
  return (
    <div className="flex flex-col mt-8">
      <SectionHeader title="Probabilistic Scenarios (1 Year Horizon)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SCENARIOS.map(s => (
          <div key={s.label} className={`bg-white border border-l-4 p-4 ${s.card}`}>
            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">{s.label}</div>
            <div className="text-[9px] font-mono text-zinc-400 mb-2">{s.formula}</div>
            <div className={`text-xl font-mono ${s.text}`}>{((mu + s.z * sigma) * 100).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
