with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "            {activeTab === 'dashboard' && (" in line:
        # we need to remove the wrong one at 1045
        if "historicalData" in lines[i+1]:
            del lines[i]
            break

# Now insert it at the right place
for i, line in enumerate(lines):
    if "                          <>" in line:
        lines.insert(i, "            {activeTab === 'dashboard' && (\n")
        break

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
