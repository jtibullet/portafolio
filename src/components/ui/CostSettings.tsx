import { useI18n } from '../../i18n';
import type { CostModel } from '../../engine/costs';

/** Commission, spread and FX cost inputs, in percent; saved in the browser. */
export function CostSettings({ costs, onChange }: { costs: CostModel; onChange: (costs: CostModel) => void }) {
  const { t } = useI18n();
  const fields: { key: keyof CostModel; label: string }[] = [
    { key: 'commission', label: t('costs.commission') },
    { key: 'spread', label: t('costs.spread') },
    { key: 'fx', label: t('costs.fx') },
  ];
  return (
    <div className="flex flex-col gap-2 bg-zinc-50 border border-zinc-200 p-3">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('costs.title')}</span>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {fields.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1 text-[10px] font-mono text-zinc-500">
            {label}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={Math.round(costs[key] * 100 * 10000) / 10000}
              onChange={(e) => onChange({ ...costs, [key]: Math.max(0, Number(e.target.value) || 0) / 100 })}
              className="bg-white border border-zinc-300 p-1.5 text-xs text-ink focus:outline-none focus:border-ink"
            />
          </label>
        ))}
      </div>
      <p className="text-[10px] text-zinc-500">{t('costs.note')}</p>
    </div>
  );
}
