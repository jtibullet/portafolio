with open('src/App.tsx', 'r') as f:
    text = f.read()

import re

# 1. State variables
state_vars = """
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerData, setScreenerData] = useState<any[] | null>(null);
  const [screenerTopAsset, setScreenerTopAsset] = useState<string | null>(null);

  const fetchScreenerData = async (tickersToScan: string[]) => {
    if (!tickersToScan || tickersToScan.length === 0) return;
    setScreenerLoading(true);
    try {
      const res = await fetch("/api/alpha-screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: tickersToScan })
      });
      const data = await res.json();
      if (data.results) {
        data.results.sort((a: any, b: any) => b.prob20 - a.prob20);
        setScreenerData(data.results);
        if (data.results.length > 0) {
          setScreenerTopAsset(data.results[0].symbol);
        }
      }
    } catch (e) {
      console.log(e);
    }
    setScreenerLoading(false);
  };
"""

text = text.replace("  const [radarLoading, setRadarLoading] = useState(false);", state_vars + "\n  const [radarLoading, setRadarLoading] = useState(false);")

# 2. Automatically trigger fetchScreenerData when radar finishes
radar_fetch_replacement = """      setRadarResults(data);
      if (data.uncorrelatedTickers && data.uncorrelatedTickers.length > 0) {
        fetchScreenerData(data.uncorrelatedTickers);
      }"""
text = text.replace("      setRadarResults(data);", radar_fetch_replacement)

# 3. Restore UI inside radar tab
ui_code = """                    {/* Phase 2: Breeden-Litzenberger Options Engine */}
                    <div className="mt-8 border-t border-zinc-200 pt-8">
                      <h2 className="text-xl font-serif text-[#141414] mb-4">🔮 Phase 2: Breeden-Litzenberger Options Engine</h2>
                      <div className="bg-[#f9f9f9] border border-[#141414] border-l-4 border-l-purple-600 p-4 text-[#141414] text-sm font-serif mb-8">
                        <strong>Options-Implied Alpha Screener:</strong> This module takes the surviving uncorrelated assets and extracts the Risk-Neutral Density (RND) curve from the options volatility smile. The area under the curve to the right of +20% represents the market-implied true probability of a significant breakout.
                      </div>
                      
                      {screenerLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white border border-[#141414]">
                          <Loader2 className="w-8 h-8 animate-spin text-[#141414] mb-4" />
                          <p className="text-xs font-mono uppercase">Extracting Risk-Neutral Densities (RND)...</p>
                        </div>
                      ) : screenerData && screenerData.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Data Table */}
                          <div className="flex flex-col h-full bg-white border border-[#141414]">
                            <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">RND Probabilities</h3>
                            <div className="overflow-x-auto p-4">
                              <table className="w-full text-[10px] font-mono text-left whitespace-nowrap">
                                <thead>
                                  <tr className="border-b-2 border-[#141414]">
                                    <th className="py-2 px-1">Ticker</th>
                                    <th className="py-2 px-1 text-right">Spot Price</th>
                                    <th className="py-2 px-1 text-right">Days to Exp</th>
                                    <th className="py-2 px-1 text-right">P(Return > 20%)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {screenerData.map((res: any) => (
                                    <tr 
                                      key={res.symbol} 
                                      className={`border-b border-zinc-200 cursor-pointer transition-colors ${screenerTopAsset === res.symbol ? 'bg-purple-50' : 'hover:bg-zinc-50'}`}
                                      onClick={() => setScreenerTopAsset(res.symbol)}
                                    >
                                      <td className="py-2 px-1 font-bold">{res.symbol}</td>
                                      <td className="py-2 px-1 text-right">${res.S.toFixed(2)}</td>
                                      <td className="py-2 px-1 text-right">{(res.T * 365).toFixed(0)}</td>
                                      <td className={`py-2 px-1 text-right font-bold ${res.prob20 > 0.70 ? 'text-green-600' : ''}`}>
                                        {(res.prob20 * 100).toFixed(2)}%
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                            
                          {/* Chart */}
                          {screenerTopAsset && (
                            <div className="flex flex-col h-full bg-white border border-[#141414]">
                              <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Risk-Neutral Density: {screenerTopAsset}</h3>
                              <div className="flex-1 p-4 min-h-[300px]">
                                {(() => {
                                  const asset = screenerData.find(a => a.symbol === screenerTopAsset);
                                  if (!asset) return null;
                                  
                                  const targetK = asset.S * 1.2; // +20%
                                  const chartData = asset.densities.map((d: any) => ({
                                    strike: d.k,
                                    density: d.density,
                                    tail: d.k >= targetK ? d.density : 0
                                  }));
                                  
                                  return (
                                    <ResponsiveContainer width="100%" height={300}>
                                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis 
                                          dataKey="strike" 
                                          tickFormatter={(v) => `$${v.toFixed(0)}`}
                                          tick={{ fontSize: 10, fill: '#666' }}
                                          domain={['dataMin', 'dataMax']}
                                          type="number"
                                        />
                                        <YAxis hide />
                                        <Tooltip 
                                          formatter={(val: number) => [val.toFixed(4), 'Density']}
                                          labelFormatter={(label: number) => `Strike: $${label.toFixed(2)}`}
                                          contentStyle={{ borderRadius: 0, fontSize: '10px', border: '1px solid #141414' }}
                                        />
                                        {/* Reference line for +20% */}
                                        <ReferenceLine x={targetK} stroke="#141414" strokeDasharray="3 3" />
                                        <ReferenceLine x={asset.S} stroke="#999" strokeDasharray="3 3" />
                                        
                                        <Area type="monotone" dataKey="density" stroke="#141414" fill="#f4f4f5" strokeWidth={2} />
                                        <Area type="monotone" dataKey="tail" stroke="none" fill="#22c55e" fillOpacity={0.3} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  );
                                })()}
                              </div>
                              <div className="p-4 bg-zinc-50 border-t border-[#141414] text-xs font-mono text-zinc-600">
                                Dotted lines mark Current Spot and +20% Target. Green shaded area represents the probability of expiring above the +20% target.
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center p-8 bg-white border border-[#141414] text-zinc-500 font-mono text-xs">
                          No RND data available.
                        </div>
                      )}
                    </div>
"""

text = text.replace("                    {/* Data Table */}", ui_code + "\n                    {/* Data Table */}")

with open('src/App.tsx', 'w') as f:
    f.write(text)
