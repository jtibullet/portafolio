import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Fix raw >
text = text.replace("P(Return > 20%)", "P(Return &gt; 20%)")

# Find duplicates
# let's just delete the extra ones around line 177, 207

text = text.replace("  const [screenerData, setScreenerData] = useState<any[] | null>(null);\n", "", 1)
text = text.replace("  const [screenerTopAsset, setScreenerTopAsset] = useState<string | null>(null);\n", "", 1)

with open('src/App.tsx', 'w') as f:
    f.write(text)
