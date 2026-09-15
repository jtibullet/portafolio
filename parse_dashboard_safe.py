import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

start_idx = text.find("            {activeTab === 'dashboard' && (\n                          <>")
end_idx = text.find("            {/* PROBABILISTIC SCENARIOS */}")

print("Start idx:", start_idx)
print("End idx:", end_idx)

# extract the section between start_idx and end_idx
dash_text = text[start_idx:end_idx]

core = dash_text[dash_text.find('{/* CORE METRICS TABLE */}'):dash_text.find('{/* CORRELATION HEATMAP */}')]
core = core.replace('<div className="flex flex-col">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

corr = dash_text[dash_text.find('{/* CORRELATION HEATMAP */}'):dash_text.find('                </div>\n            {quantStats.optimization && (')]
corr = corr.replace('<div className="flex flex-col">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

opt = dash_text[dash_text.find('{/* OPTIMAL WEIGHTS PIE CHART */}'):dash_text.find('{/* EFFICIENT FRONTIER CHART */}')]
opt = opt.replace('<div className="flex flex-col xl:col-span-1">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

eff = dash_text[dash_text.find('{/* EFFICIENT FRONTIER CHART */}'):dash_text.find('                </div>\n                {/* SECTOR ALLOCATION BREAKDOWN */}')]
eff = eff.replace('<div className="flex flex-col xl:col-span-2">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

sect = dash_text[dash_text.find('{/* SECTOR ALLOCATION BREAKDOWN */}'):dash_text.find('                {/* OPTIMIZED PORTFOLIO METRICS */}')]
sect = sect.replace('<div className="flex flex-col mt-8 border border-[#141414] bg-white">', '<div className="flex flex-col border border-[#141414] bg-white">', 1)

port = dash_text[dash_text.find('{/* OPTIMIZED PORTFOLIO METRICS */}'):dash_text.rfind('              </>\n            )}')]
port = port.replace('<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-8">', '<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 h-full">')

new_dash = """
            {activeTab === 'dashboard' && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={dashboardWidgets} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 xl:grid-cols-6 gap-8 pb-8">
                    {dashboardWidgets.map(id => {
                      if (id === 'coreMetrics') return (
                        <SortableWidget key={id} id={id} className="col-span-1 xl:col-span-3">
                          __CORE__
                        </SortableWidget>
                      );
                      if (id === 'correlationHeatmap') return (
                        <SortableWidget key={id} id={id} className="col-span-1 xl:col-span-3">
                          __CORR__
                        </SortableWidget>
                      );
                      if (id === 'optimalWeights' && quantStats.optimization) return (
                        <SortableWidget key={id} id={id} className="col-span-1 xl:col-span-2">
                          __OPT__
                        </SortableWidget>
                      );
                      if (id === 'efficientFrontier' && quantStats.optimization) return (
                        <SortableWidget key={id} id={id} className="col-span-1 xl:col-span-4">
                          __EFF__
                        </SortableWidget>
                      );
                      if (id === 'sectorBreakdown' && metadata) return (
                        <SortableWidget key={id} id={id} className="col-span-1 xl:col-span-6">
                          __SECT__
                        </SortableWidget>
                      );
                      if (id === 'portfolioMetrics' && quantStats.optimization) return (
                        <SortableWidget key={id} id={id} className="col-span-1 xl:col-span-6">
                          __PORT__
                        </SortableWidget>
                      );
                      return null;
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
"""

new_dash = new_dash.replace('__CORE__', core.strip())
new_dash = new_dash.replace('__CORR__', corr.strip())
new_dash = new_dash.replace('__OPT__', opt.strip())
new_dash = new_dash.replace('__EFF__', eff.strip())
new_dash = new_dash.replace('__SECT__', sect.strip())
new_dash = new_dash.replace('__PORT__', port.strip())

new_text = text[:start_idx] + new_dash.strip() + "\n            " + text[end_idx:]

with open('src/App.tsx', 'w') as f:
    f.write(new_text)

print("Safely replaced dashboard layout")
