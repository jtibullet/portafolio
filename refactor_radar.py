import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# 1. Remove state variables for radar and screener
states_to_remove = """  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerData, setScreenerData] = useState<any[] | null>(null);

  const fetchScreenerData = async (tickersToScan: string[]) => {
    if (!tickersToScan || tickersToScan.length === 0) return;
    setScreenerLoading(true);
    try {
      const res = await fetch("/api/alpha-screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: tickersToScan })
      });
      const data = await res.json();
      if (data.results) {
        data.results.sort((a: any, b: any) => b.prob20 - a.prob20);
        setScreenerData(data.results);
        if (data.results.length > 0) {
          setScreenerTopAsset(data.results[0].symbol);
        }
      }
    } catch (e) {
      console.log(e);
    }
    setScreenerLoading(false);
  };

  const [radarLoading, setRadarLoading] = useState(false);
  const [radarResults, setRadarResults] = useState<any>(null);
  const [radarDropThreshold, setRadarDropThreshold] = useState<number>(5);
  const [radarProbThreshold, setRadarProbThreshold] = useState<number>(70);
  const [screenerTopAsset, setScreenerTopAsset] = useState<string | null>(null);"""

if states_to_remove in text:
    text = text.replace(states_to_remove, "")
else:
    print("Could not find states to remove, falling back to regex")
    text = re.sub(r'const \[screenerLoading.*?const \[screenerTopAsset, setScreenerTopAsset\] = useState<string \| null>\(null\);', '', text, flags=re.DOTALL)

# 2. Remove runRadar function
radar_fn = re.search(r'const runRadar = async \(\) => \{.*?\n  \};', text, flags=re.DOTALL)
if radar_fn:
    text = text.replace(radar_fn.group(0), "")
else:
    print("Could not find runRadar function")

# 3. Remove Radar Tab Button
radar_btn_pattern = r'<button\s+onClick=\{\(\) => \{ setActiveTab\(\'radar\'\);.*?🌍 Global Radar\s+</button>'
text = re.sub(radar_btn_pattern, '', text, flags=re.DOTALL)

# 4. Change activeTab type to remove 'radar'
text = text.replace("const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'ai' | 'validation' | 'radar'>('dashboard');", "const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'ai' | 'validation'>('dashboard');")

# 5. Remove Radar Section UI
radar_ui_start = text.find("{activeTab === 'radar' && (")
if radar_ui_start != -1:
    radar_ui_end = text.find("{/* Methodology Modal */}", radar_ui_start)
    if radar_ui_end != -1:
        # We need to backtrack a bit to keep the `</div>` tags balanced. Let's rely on finding the `<footer` of the previous block
        # Actually it's easier to just chop it properly.
        text = text[:radar_ui_start] + text[radar_ui_end:]
    else:
        print("Could not find end of radar UI")

with open('src/App.tsx', 'w') as f:
    f.write(text)
