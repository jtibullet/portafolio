with open('src/App.tsx', 'r') as f:
    text = f.read()

with open('raw_dashboard.tsx', 'r') as f:
    raw = f.read()

eff_start = raw.find('{/* EFFICIENT FRONTIER CHART */}')
# Find the end of the flex-col for eff
table_end = raw.find('</ComposedChart>', eff_start)
eff_end = raw.find('</div>', table_end)
eff_end = raw.find('</div>', eff_end + 1)
eff_end = raw.find('</div>', eff_end + 1)
eff_end = eff_end + 6

clean_eff = raw[eff_start:eff_end]
clean_eff = clean_eff.replace('<div className="flex flex-col xl:col-span-2">', '<div className="flex flex-col h-full bg-white border border-[#141414]">', 1)

bad_eff_start = text.find('{/* EFFICIENT FRONTIER CHART */}')
bad_eff_end = text.find('</SortableWidget>', bad_eff_start)

new_text = text[:bad_eff_start] + clean_eff + "\n                        " + text[bad_eff_end:]

with open('src/App.tsx', 'w') as f:
    f.write(new_text)

print("Fixed eff")
