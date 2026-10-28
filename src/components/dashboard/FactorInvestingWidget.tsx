import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

const SIZE_COLORS = { 'Large Cap': '#1E293B', 'Mid Cap': '#64748B', 'Small Cap': '#CBD5E1', 'Broad Market': '#94A3B8', 'Unclassified': '#F1F5F9' };
const STYLE_COLORS = { 'Value': '#166534', 'Blend': '#22C55E', 'Growth': '#86EFAC', 'Unclassified': '#F0FDF4' };

export function FactorInvestingWidget({ metadata, quantStats }: { metadata: any[], quantStats: any }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!metadata || !quantStats?.optimization) return null;

  const weights = quantStats.optimization.optimal.weights;
  const symbols = quantStats.matrixSymbols;

  const sizeExposure: Record<string, number> = { 'Large Cap': 0, 'Mid Cap': 0, 'Small Cap': 0, 'Unclassified': 0 };
  const styleExposure: Record<string, number> = { 'Value': 0, 'Blend': 0, 'Growth': 0, 'Unclassified': 0 };

  const assetDetails = symbols.map((sym: string, i: number) => {
    const meta = metadata.find(m => m.symbol === sym) || {};
    const weight = weights[i];
    
    // Size Classification
    let size = 'Unclassified';
    const cap = meta.marketCap || meta.totalAssets;
    if (cap) {
      if (cap > 10000000000) size = 'Large Cap';
      else if (cap >= 2000000000) size = 'Mid Cap';
      else size = 'Small Cap';
    } else if (meta.quoteTypeStr === 'ETF' || meta.quoteTypeStr === 'MUTUALFUND' || meta.sector === 'ETF / Fondo') {
      size = 'Broad Market'; // Fallback if no assets reported
    }
    
    // Style Classification
    let style = 'Unclassified';
    const pe = meta.trailingPE || meta.forwardPE;
    
    const categoryLower = (meta.categoryName || meta.sector || '').toLowerCase();
    const isFund = meta.quoteTypeStr === 'ETF' || meta.quoteTypeStr === 'MUTUALFUND' || meta.sector === 'ETF / Fondo';
    
    if (pe) {
      if (pe < 15) style = 'Value';
      else if (pe > 25) style = 'Growth';
      else style = 'Blend';
    } else if (meta.priceToBook) {
      if (meta.priceToBook < 2) style = 'Value';
      else if (meta.priceToBook > 5) style = 'Growth';
      else style = 'Blend';
    } else if (isFund) {
      if (categoryLower.includes('value')) style = 'Value';
      else if (categoryLower.includes('growth')) style = 'Growth';
      else if (categoryLower.includes('blend')) style = 'Blend';
      else style = meta.categoryName || meta.sector || 'Broad Market';
    } else {
      style = 'Blend'; // Fallback for unknown equities without PE/PB
    }

    if (sizeExposure[size] !== undefined) sizeExposure[size] += weight;
    if (styleExposure[style] !== undefined) styleExposure[style] += weight;

    return {
      symbol: sym,
      weight,
      marketCap: meta.marketCap,
      totalAssets: meta.totalAssets,
      quoteTypeStr: meta.quoteTypeStr,
      categoryName: meta.categoryName,
      pe: pe,
      priceToBook: meta.priceToBook,
      roe: meta.returnOnEquity,
      profitMargins: meta.profitMargins,
      size,
      style
    };
  });

  const sizeData = Object.entries(sizeExposure)
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0.001);
    
  const styleData = Object.entries(styleExposure)
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0.001);

  return (
    <div className="flex flex-col border border-[#141414] dark:border-zinc-700 bg-white dark:bg-zinc-900 h-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center p-3 w-full text-left bg-zinc-50 dark:bg-zinc-800/50 border-b border-[#141414] dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] dark:bg-zinc-800 dark:text-zinc-200 px-2 py-0.5 inline-flex items-center gap-2">
          <span>🧬 Factor Investing & Smart Beta Tilt</span>
        </h3>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {isOpen && (
        <div className="p-4 flex flex-col gap-6">
          <div className="flex bg-blue-50/50 p-3 border border-blue-100 text-xs text-blue-800 gap-2 items-start">
            <Info size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-1">Ben Felix Model & Factor Investing Theory</p>
              <p>
                Tilting a portfolio towards <strong>Small Cap</strong> and <strong>Value</strong> factors can historically capture risk premiums to boost expected returns over long periods. 
                However, this requires a long-term horizon and higher volatility tolerance. The Fama-French models emphasize Size, Value, and Quality/Profitability as robust sources of outperformance.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col h-[250px]">
              <h4 className="text-xs font-bold text-center uppercase mb-2 tracking-widest text-zinc-600 dark:text-zinc-400">Size Allocation</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sizeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                      if (percent <= 0.05) return null;
                      const radius = outerRadius * 1.25;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      return (
                        <g>
                          <text x={x} y={y} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.8} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="600" className="text-white dark:text-zinc-900">
                            {name} {(percent * 100).toFixed(0)}%
                          </text>
                          <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="600" className="text-zinc-900 dark:text-zinc-100">
                            {name} {(percent * 100).toFixed(0)}%
                          </text>
                        </g>
                      );
                    }}
                  >
                    {sizeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(SIZE_COLORS as any)[entry.name] || '#999'} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col h-[250px]">
              <h4 className="text-xs font-bold text-center uppercase mb-2 tracking-widest text-zinc-600 dark:text-zinc-400">Style Allocation (Value vs Growth)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={styleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                      if (percent <= 0.05) return null;
                      const radius = outerRadius * 1.25;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      return (
                        <g>
                          <text x={x} y={y} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.8} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="600" className="text-white dark:text-zinc-900">
                            {name} {(percent * 100).toFixed(0)}%
                          </text>
                          <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="600" className="text-zinc-900 dark:text-zinc-100">
                            {name} {(percent * 100).toFixed(0)}%
                          </text>
                        </g>
                      );
                    }}
                  >
                    {styleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(STYLE_COLORS as any)[entry.name] || ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#6366F1'][index % 6]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#141414] dark:border-zinc-700 mt-4">
            <table className="w-full text-xs text-left text-zinc-900 dark:text-zinc-300">
              <thead className="bg-[#141414] text-[#E4E3E0] dark:bg-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="p-2 border-r border-zinc-700">Asset</th>
                  <th className="p-2 border-r border-zinc-700">Weight</th>
                  <th className="p-2 border-r border-zinc-700 text-right">Market Cap</th>
                  <th className="p-2 border-r border-zinc-700 text-right">P/E Ratio</th>
                  <th className="p-2 border-r border-zinc-700 text-right">P/B Ratio</th>
                  <th className="p-2 border-r border-zinc-700 text-right">ROE</th>
                  <th className="p-2 border-r border-zinc-700">Size Factor</th>
                  <th className="p-2">Style Factor</th>
                </tr>
              </thead>
              <tbody>
                {assetDetails.map((asset, i) => (
                  <tr key={asset.symbol} className="border-b border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800/50">
                    <td className="p-2 border-r border-zinc-200 font-bold">{asset.symbol}</td>
                    <td className="p-2 border-r border-zinc-200">{(asset.weight * 100).toFixed(1)}%</td>
                    <td className="p-2 border-r border-zinc-200 text-right">
                      {asset.marketCap ? `$${(asset.marketCap / 1e9).toFixed(1)}B` : (asset.totalAssets ? `~$${(asset.totalAssets / 1e9).toFixed(1)}B` : 'N/A')}
                    </td>
                    <td className="p-2 border-r border-zinc-200 text-right">
                      {asset.pe ? asset.pe.toFixed(2) : 'N/A'}
                    </td>
                    <td className="p-2 border-r border-zinc-200 text-right">
                      {asset.priceToBook ? asset.priceToBook.toFixed(2) : 'N/A'}
                    </td>
                    <td className="p-2 border-r border-zinc-200 text-right">
                      {asset.roe ? `${(asset.roe * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="p-2 border-r border-zinc-200">{asset.size}</td>
                    <td className="p-2">{asset.style}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
