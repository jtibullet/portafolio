import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# We know the bad code is inside `<SortableWidget key={id} id={id} className="col-span-1 xl:col-span-3 h-full">`
# and it starts with `{/* CORRELATION HEATMAP */}`

# Let's extract the clean corr from raw_dashboard.tsx
with open('raw_dashboard.tsx', 'r') as f:
    raw = f.read()

corr_start = raw.find('{/* CORRELATION HEATMAP */}')
# Find the end of the flex-col for corr
# We know the table is wrapped in a div, then the flex-col div is closed.
# We can just look for the last `</table>\n                    </div>\n                  </div>`
table_end = raw.find('</table>', corr_start)
corr_end = raw.find('</div>', table_end)
corr_end = raw.find('</div>', corr_end + 1)
corr_end = corr_end + 6 # include the </div>

clean_corr = raw[corr_start:corr_end]
clean_corr = clean_corr.replace('<div className="flex flex-col">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

# Now find where the bad corr is in src/App.tsx
bad_corr_start = text.find('{/* CORRELATION HEATMAP */}')
# The bad corr includes `{quantStats.optimization && (` and goes all the way until the start of `{/* OPTIMAL WEIGHTS PIE CHART */}`?
# No, in src/App.tsx, it's inside the SortableWidget.
# We can just find the end of SortableWidget for correlationHeatmap.
bad_corr_end = text.find('</SortableWidget>', bad_corr_start)

# Replace the bad corr with clean corr
new_text = text[:bad_corr_start] + clean_corr + "\n                        " + text[bad_corr_end:]

with open('src/App.tsx', 'w') as f:
    f.write(new_text)

print("Fixed corr")
