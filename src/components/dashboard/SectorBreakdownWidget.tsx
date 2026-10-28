import { ChevronDown, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { computeSectorWeights, type SectorWeight } from '../../engine/chartData';
import { useCollapsible } from '../../hooks/useUiState';
import type { AssetMetadata, QuantStats } from '../../types';

function SectorTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data: SectorWeight = payload[0].payload;
  return (
    <div className="bg-white border border-[#141414] p-3 shadow-lg">
      <p className="font-bold text-xs uppercase mb-2 border-b border-zinc-200 pb-1">{label} ({(data.weight * 100).toFixed(2)}%)</p>
      <ul className="text-xs space-y-1">
        {data.assets.map(asset => (
          <li key={asset.symbol} className="flex justify-between gap-4">
            <span className="font-mono">{asset.symbol}</span>
            <span>{(asset.weight * 100).toFixed(2)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectorBreakdownWidget({ quantStats, metadata }: { quantStats: QuantStats; metadata: AssetMetadata[] }) {
  const [open, toggle] = useCollapsible('sectorBreakdown', true);
  const sectorData = computeSectorWeights(quantStats.matrixSymbols, quantStats.optimization!.optimal.weights, metadata);

  return (
    <div className="flex flex-col border border-[#141414] bg-white h-full">
      <button
        onClick={toggle}
        className="flex justify-between items-center p-3 w-full text-left bg-zinc-50 border-b border-[#141414] hover:bg-zinc-100 transition-colors"
      >
        <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5 inline-block">Sector Allocation Breakdown</h3>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="p-4 min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
              <XAxis allowDuplicatedCategory={false} type="number" tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
              <YAxis dataKey="sector" type="category" width={150} tick={{ fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip content={<SectorTooltip />} cursor={{ fill: '#f4f4f5' }} />
              <Bar dataKey="weight" fill="#141414" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
