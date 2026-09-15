import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Replace the filter/sort logic
old_growth = r'const growth = unselected\.filter\(\(c: any\) =>\s*c\.correlation < 0\.4 &&\s*c\.sharpe > 1\.0 &&\s*c\.expectedGrowth > 0\s*\)\.sort\(\(a: any, b: any\) => b\.sharpe - a\.sharpe\)\.slice\(0, 5\);'
new_growth = """const growth = unselected.filter((c: any) => 
            c.drawdown >= -0.05 && 
            c.momentum20D > 0 && 
            c.correlation < 0.3
          ).sort((a: any, b: any) => a.correlation - b.correlation).slice(0, 20);"""

text = re.sub(old_growth, new_growth, text, flags=re.MULTILINE)

old_dip = r'const dip = unselected\.filter\(\(c: any\) =>\s*c\.correlation < 0\.4 &&\s*c\.sixMonthReturn <= -0\.15 &&\s*c\.expectedGrowth > 0\.05\s*\)\.sort\(\(a: any, b: any\) => b\.expectedGrowth - a\.expectedGrowth\)\.slice\(0, 5\);'
new_dip = """const dip = unselected.filter((c: any) => 
            c.drawdown <= -0.15 && 
            c.momentum20D > 0 && 
            c.correlation < 0.3
          ).sort((a: any, b: any) => b.momentum20D - a.momentum20D).slice(0, 20);"""

text = re.sub(old_dip, new_dip, text, flags=re.MULTILINE)

# Replace the UI tables
old_ui = r'\{/\*\s*AI ASSET RECOMMENDATIONS\s*\*/\}.*?(?=\{/\*\s*ALPHA EXECUTION\s*\*/\})'

new_ui = """{/* AI ASSET RECOMMENDATIONS */}
              <div className="bg-white p-4 border border-zinc-200 rounded-lg shadow-sm">
                <div 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setIsRecommendationsExpanded(!isRecommendationsExpanded)}
                >
                  <div className="font-semibold text-lg text-zinc-800">
                    <span className="flex items-center gap-2">💡 IA Asset Recommendations (Diversification & Buy The Dip)</span>
                  </div>
                  <div className="text-zinc-500 font-mono text-sm">
                    <span>{isRecommendationsExpanded ? '[-]' : '[+]'}</span>
                  </div>
                </div>
                
                {isRecommendationsExpanded && (
                  <div className="mt-6">
                    <div className="mb-4">
                      {isRecommendationsLoading ? (
                        <div className="bg-zinc-100 border border-zinc-200 p-4 rounded-md text-sm text-zinc-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="animate-spin text-lg">⏳</span> Scanning NASDAQ Universe...
                          </span>
                          <span className="text-zinc-500 text-xs">Downloading batches and calculating exact pairwise correlations...</span>
                        </div>
                      ) : recommendations ? (
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium text-zinc-800 mb-1">📈 Growth Diversifiers</h4>
                            <p className="text-xs text-zinc-500 mb-2">Assets near their 6-month highs with strong momentum and low correlation to your current portfolio.</p>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-zinc-200">
                                    <th className="py-2 px-3 font-semibold text-zinc-600">Asset</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Current Price</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">6M High</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Drawdown</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Momentum (20D)</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Correlation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recommendations.growth.length > 0 ? recommendations.growth.map((c: any, i: number) => (
                                    <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                                      <td className="py-2 px-3 font-mono font-medium text-blue-600">{c.symbol}</td>
                                      <td className="py-2 px-3 text-right">${c.currentPrice.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right">${c.sixMonthHigh.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right">{(c.drawdown * 100).toFixed(2)}%</td>
                                      <td className="py-2 px-3 text-right text-green-600">{(c.momentum20D * 100).toFixed(2)}%</td>
                                      <td className="py-2 px-3 text-right font-mono">{c.correlation.toFixed(2)}</td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={6} className="py-4 text-center text-zinc-500 text-xs">No assets match the Growth Diversifiers criteria at this time.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-zinc-800 mb-1">📉 Buy the Dip Opportunities</h4>
                            <p className="text-xs text-zinc-500 mb-2">Assets down over 15% from their 6-month peak, showing recent rebound momentum and low correlation.</p>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-zinc-200">
                                    <th className="py-2 px-3 font-semibold text-zinc-600">Asset</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Current Price</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">6M High</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Drawdown</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Momentum (20D)</th>
                                    <th className="py-2 px-3 font-semibold text-zinc-600 text-right">Correlation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recommendations.dip.length > 0 ? recommendations.dip.map((c: any, i: number) => (
                                    <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                                      <td className="py-2 px-3 font-mono font-medium text-blue-600">{c.symbol}</td>
                                      <td className="py-2 px-3 text-right">${c.currentPrice.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right">${c.sixMonthHigh.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right text-red-600">{(c.drawdown * 100).toFixed(2)}%</td>
                                      <td className="py-2 px-3 text-right text-green-600">{(c.momentum20D * 100).toFixed(2)}%</td>
                                      <td className="py-2 px-3 text-right font-mono">{c.correlation.toFixed(2)}</td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={6} className="py-4 text-center text-zinc-500 text-xs">No assets match the Buy the Dip criteria at this time.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 italic text-sm">Waiting for recommendation processing...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              """

text = re.sub(old_ui, new_ui, text, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(text)

