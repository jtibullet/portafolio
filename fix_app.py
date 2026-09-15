import re
import time
import numpy as np
with open('src/App.tsx', 'r') as f:
    text = f.read()

# I deleted: text = text[:radar_ui_start] + text[radar_ui_end:]
# So right now at radar_ui_end, which is `{/* Methodology Modal */}`, the `historicalData` block is NOT closed!
# Let's insert the footer and closing tags right before `{/* Methodology Modal */}`

missing_tags = """
            <footer className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] font-mono uppercase text-zinc-500 gap-2">
              <div>Status: Math Engine Operational [Success]</div>
              <div>Rows: {historicalData.length} | Assets: {symbols.length} | Risk-Free: {(riskFreeRate * 100).toFixed(1)}%</div>
            </footer>
          </div>
        )}
"""

text = text.replace("{/* Methodology Modal */}", missing_tags + "        {/* Methodology Modal */}")

with open('src/App.tsx', 'w') as f:
    f.write(text)
