import { ChevronDown, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n';
import { computeSectorWeights, type SectorWeight } from '../../engine/chartData';
import { useCollapsible } from '../../hooks/useUiState';
import { CHART } from '../../lib/chartTheme';
import type { AssetMetadata, QuantStats } from '../../types';

function SectorTooltip({ active, payload, label }: any) {
  const { f } = useI18n();
  if (!active || !payload || !payload.length) return null;
  const data: SectorWeight = payload[0].payload;
  return (
    <div className="bg-white border border-ink p-3 shadow-lg">
      <p className="font-bold text-xs uppercase mb-2 border-b border-zinc-200 pb-1">{label} ({f.pct(data.weight)})</p>
      <ul className="text-xs space-y-1">
        {data.assets.map(asset => (
          <li key={asset.symbol} className="flex justify-between gap-4">
            <span className="font-mono">{asset.symbol}</span>
            <span>{f.pct(asset.weight)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectorBreakdownWidget({ quantStats, metadata }: { quantStats: QuantStats; metadata: AssetMetadata[] }) {
  const { t, f, sector } = useI18n();
  const [open, toggle] = useCollapsible('sectorBreakdown', true);
  const sectorData = computeSectorWeights(quantStats.matrixSymbols, quantStats.optimization!.optimal.weights, metadata)
    .map(s => ({ ...s, sector: sector(s.sector) }));

  return (
    <div className="flex flex-col border border-ink bg-white h-full">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex justify-between items-center p-3 w-full text-left bg-zinc-50 border-b border-ink hover:bg-zinc-100 transition-colors"
      >
        <h3 className="text-xs font-mono uppercase bg-ink text-paper px-2 py-0.5 inline-block">{t('sector.title')}</h3>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="p-2 sm:p-4 min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorData} layout="vertical" margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
              <XAxis allowDuplicatedCategory={false} type="number" tickFormatter={(val) => f.pct(val, 0)} />
              <YAxis dataKey="sector" type="category" width={120} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip content={<SectorTooltip />} cursor={{ fill: CHART.cursor }} />
              <Bar dataKey="weight" fill={CHART.ink} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
