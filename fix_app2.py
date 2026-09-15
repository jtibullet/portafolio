with open('src/App.tsx', 'r') as f:
    text = f.read()

import re
radar_code = """  const runRadar = async () => {
    setRadarLoading(true);
    try {
      const res = await fetch("/api/global-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioTickers: selectedTickers })
      });
      const data = await res.json();
      setRadarResults(data);
    } catch (e) {
      console.log(e);
    }
    setRadarLoading(false);
  };
"""

text = text.replace("  const handleFetchData = async () => {", radar_code + "\n  const handleFetchData = async () => {")

with open('src/App.tsx', 'w') as f:
    f.write(text)
