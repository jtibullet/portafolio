with open('raw_dashboard.tsx', 'r') as f:
    text = f.read()

core_start = text.find("{/* CORE METRICS TABLE */}")
corr_start = text.find("{/* CORRELATION HEATMAP */}")
opt_start = text.find("{/* OPTIMAL WEIGHTS PIE CHART */}")
eff_start = text.find("{/* EFFICIENT FRONTIER CHART */}")
sect_start = text.find("{/* SECTOR ALLOCATION BREAKDOWN */}")
port_start = text.find("{/* OPTIMIZED PORTFOLIO METRICS */}")

def extract_div(s, e=None):
    if e:
        return text[s:e]
    else:
        return text[s:]

# The layout is:
# <>
#   <div grid>
#     {/* CORE */} <div flex> ... </div>
#     {/* CORR */} <div flex> ... </div>
#   </div>
#   {quantStats.optimization && (
#     <>
#       <div grid>
#         {/* OPT */} <div flex> ... </div>
#         {/* EFF */} <div flex> ... </div>
#       </div>
#   )}
#   {/* SECT */} 
#   {/* PORT */}
# </ ... wait, sect and port are after `</>` ?

