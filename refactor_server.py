import re

with open('server.ts', 'r') as f:
    text = f.read()

# Remove alpha-screener endpoint
screener_pattern = r'app\.post\("/api/alpha-screener".*?\n  \}\);\n'
text = re.sub(screener_pattern, '', text, flags=re.DOTALL)

# Remove radarCache, radarCacheTime, getReturns, getCorrelation, and global-radar endpoint
radar_stuff_pattern = r'// Global Cache for Radar\nlet radarCache: any = null;\nlet radarCacheTime = 0;\n\nfunction getReturns\(prices: number\[\]\): number\[\] \{.*?\napp\.post\("/api/global-radar".*?\n\}\);\n'
text = re.sub(radar_stuff_pattern, '', text, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(text)
