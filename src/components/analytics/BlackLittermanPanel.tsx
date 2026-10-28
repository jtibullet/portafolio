import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SectionHeader } from '../ui/SectionTitle';
import type { BlackLittermanStats, InvestorView, QuantStats } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200";

function ViewsTable({ quantStats, blStats, views, setViews }: {
  quantStats: QuantStats;
  blStats: BlackLittermanStats;
  views: Record<string, InvestorView>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, InvestorView>>>;
}) {
  const update = (sym: string, patch: Partial<InvestorView>) =>
    setViews(prev => ({ ...prev, [sym]: { ...prev[sym], ...patch } }));

  return (
    <div className="flex flex-col">
      <SectionHeader title="Black-Litterman Views">
        <span className="text-[10px] text-zinc-500 font-mono">Idzorek Method | Market Implied Priors</span>
      </SectionHeader>
      <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#141414] bg-[#f9f9f9]">
              <th className={th}>Asset</th>
              <th className={`${th} text-right`}>Market Implied Prior (Π)</th>
              <th className={`${th} text-right`}>User View E(R)</th>
              <th className="p-2 text-[10px] font-serif italic text-right w-[200px]">Confidence Level</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {quantStats.matrixSymbols.map((sym, i) => {
              const viewVal = views[sym]?.view ?? 0;
              const confVal = views[sym]?.conf ?? 0.5;
              return (
                <tr key={`bl-${sym}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 font-bold text-[#141414]">{sym}</td>
                  <td className="p-2 border-r border-zinc-200 text-right text-zinc-500">{(blStats.pi[i] * 100).toFixed(2)}%</td>
                  <td className="p-2 border-r border-zinc-200 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={(viewVal * 100).toFixed(2)}
                      onChange={(e) => update(sym, { view: Number(e.target.value) / 100 })}
                      className="w-20 text-right border border-zinc-300 px-1 py-0.5 focus:outline-none focus:border-[#141414]"
                    />%
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={confVal}
                        onChange={(e) => update(sym, { conf: Number(e.target.value) })}
                        className="flex-1 accent-[#141414]"
                      />
                      <span className="w-10 text-right text-[9px]">{(confVal * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeightComparisonChart({ quantStats, blStats }: { quantStats: QuantStats; blStats: BlackLittermanStats }) {
  const data = quantStats.matrixSymbols.map((sym, i) => ({
    name: sym,
    'Markowitz (Historical)': quantStats.optimization!.optimal.weights[i],
    'Black-Litterman': blStats.optimization.optimal.weights[i]
  }));

  return (
    <div className="flex flex-col xl:col-span-2">
      <SectionHeader title="Weight Allocation Comparison" />
      <div className="flex-1 bg-white border border-[#141414] p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis allowDuplicatedCategory={false} dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
            <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
            <Bar dataKey="Markowitz (Historical)" fill="#9ca3af" />
            <Bar dataKey="Black-Litterman" fill="#141414" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StressTest({ blStats }: { blStats: BlackLittermanStats }) {
  return (
    <div className="flex flex-col">
      <SectionHeader title="Synthetic Data Stress Testing (Black Swan Simulator)">
        <span className="text-[10px] text-zinc-500 font-mono">Fat-Tail T-Distribution (df=3) | 1,000 Days</span>
      </SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-red-200 border-l-4 border-l-red-600 p-6 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">Maximum Drawdown</div>
          <div className="text-3xl font-mono text-red-600">{(blStats.stress.maxDrawdown * 100).toFixed(2)}%</div>
          <div className="text-[9px] mt-2 text-zinc-400 font-mono">Worst-case peak-to-trough drop in synthetic crash</div>
        </div>
        <div className="bg-white border border-[#141414] border-l-4 border-l-[#141414] p-6 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">Conditional VaR (99%)</div>
          <div className="text-3xl font-mono">{(blStats.stress.cvar99 * 100).toFixed(2)}%</div>
          <div className="text-[9px] mt-2 text-zinc-400 font-mono">Average daily loss in the worst 1% of scenarios</div>
        </div>
      </div>
    </div>
  );
}

export function BlackLittermanPanel(props: {
  quantStats: QuantStats;
  blStats: BlackLittermanStats;
  views: Record<string, InvestorView>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, InvestorView>>>;
}) {
  return (
    <>
      <ViewsTable {...props} />
      <WeightComparisonChart quantStats={props.quantStats} blStats={props.blStats} />
      <StressTest blStats={props.blStats} />
    </>
  );
}
