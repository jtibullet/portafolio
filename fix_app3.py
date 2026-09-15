with open('src/App.tsx', 'r') as f:
    text = f.read()

import re
old_fetch = re.search(r'  const fetchScreenerData = async \(\) => \{.*?\n  \};\n', text, re.DOTALL)
if old_fetch:
    text = text.replace(old_fetch.group(0), '')

text = text.replace("fetchScreenerData();", "runRadar();")

# I should also remove the remaining screener variables if any
# Wait, I didn't remove `const [screenerData, setScreenerData] = useState<any[]>([]);` ? Let's see.

with open('src/App.tsx', 'w') as f:
    f.write(text)
