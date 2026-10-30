import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '../../i18n';
import { SectionTitle } from '../ui/SectionTitle';
import type { QuantStats } from '../../types';

const PIE_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea',
  '#0891b2', '#be123c', '#4d7c0f', '#ea580c', '#1d4ed8',
  '#4338ca', '#b91c1c', '#047857', '#b45309', '#7e22ce'
];

export function OptimalWeightsWidget({ quantStats }: { quantStats: QuantStats }) {
  const { t, f } = useI18n();
  const weights = quantStats.optimization!.optimal.weights;
  const data = quantStats.matrixSymbols
    .map((sym, i) => ({ name: sym, value: weights[i] }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col h-full bg-white border border-ink">
      <div className="flex justify-between items-end mb-2">
        <SectionTitle>{t('weights.title')}</SectionTitle>
      </div>
      <div className="flex-1 bg-white border border-ink p-4 flex flex-col md:flex-row items-center justify-between min-h-[300px]">
        <div className="w-full md:w-1/2 mb-4 md:mb-0">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-ink bg-panel">
                <th className="p-2 border-r border-zinc-200">{t('col.asset')}</th>
                <th className="p-2 text-right">{t('col.weight')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={item.name} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 font-bold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                    {item.name}
                  </td>
                  <td className="p-2 text-right">{f.pct(item.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full md:w-1/2">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => f.pct(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
