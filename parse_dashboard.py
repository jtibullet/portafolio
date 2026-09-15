import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# We need to extract the exact components from raw_dashboard.tsx
with open('raw_dashboard.tsx', 'r') as f:
    dash_text = f.read()

# The widgets to extract:
# coreMetrics:
core = dash_text[dash_text.find('{/* CORE METRICS TABLE */}'):dash_text.find('{/* CORRELATION HEATMAP */}')]
core = core.replace('<div className="flex flex-col">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

# we need to remove the layout grid wrap `div class=grid`
corr = dash_text[dash_text.find('{/* CORRELATION HEATMAP */}'):dash_text.find('                </div>\n            {quantStats.optimization && (')]
corr = corr.replace('<div className="flex flex-col">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

opt = dash_text[dash_text.find('{/* OPTIMAL WEIGHTS PIE CHART */}'):dash_text.find('{/* EFFICIENT FRONTIER CHART */}')]
opt = opt.replace('<div className="flex flex-col xl:col-span-1">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

eff = dash_text[dash_text.find('{/* EFFICIENT FRONTIER CHART */}'):dash_text.find('                </div>\n                {/* SECTOR ALLOCATION BREAKDOWN */}')]
eff = eff.replace('<div className="flex flex-col xl:col-span-2">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

sect = dash_text[dash_text.find('{/* SECTOR ALLOCATION BREAKDOWN */}'):dash_text.find('                {/* OPTIMIZED PORTFOLIO METRICS */}')]
sect = sect.replace('<div className="flex flex-col mt-8 border border-[#141414] bg-white">', '<div className="flex flex-col border border-[#141414] bg-white">', 1)
# remove the conditional `{metadata && (` around it
sect = sect.replace('{metadata && (', '').replace(')}', '', 1) 
# wait, replacing the last `)}` is tricky. Let's just keep it inside the SortableWidget.

port = dash_text[dash_text.find('{/* OPTIMIZED PORTFOLIO METRICS */}'):dash_text.rfind('              </>\n            )}')]
# port is already a grid, it doesn't have an outer div wrapping it. Let's wrap it.
port = port.replace('<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-8">', '<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 h-full">')


# Now we construct the new dashboard code:
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

new_dash = new_dash.replace('__CORE__', core)
new_dash = new_dash.replace('__CORR__', corr)
new_dash = new_dash.replace('__OPT__', opt)
new_dash = new_dash.replace('__EFF__', eff)
new_dash = new_dash.replace('__PORT__', port)

# wait, we need to handle Sector Allocation Breakdown differently because it uses metadata.
# Let's add it to the state array and render it too.
# But `dashboardWidgets` might not have `sectorBreakdown` in state currently.
# The user wants to reorder the widgets. We can just append it to the map.

print("Length of new dash:", len(new_dash))

start_idx = text.find("{activeTab === 'dashboard' && (")
end_idx = text.find("{/* PROBABILISTIC SCENARIOS */}")

new_text = text[:start_idx] + new_dash.strip() + "\n            " + text[end_idx:]

with open('src/App.tsx', 'w') as f:
    f.write(new_text)

print("Replaced dashboard layout")
