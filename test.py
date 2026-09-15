import re
with open('server.ts', 'r') as f:
    text = f.read()

# I want to return the uncorrelated tickers from global-radar so the UI can use them.
text = text.replace(
    "uncorrelated: uncorrelated.length,",
    "uncorrelated: uncorrelated.length,\n            uncorrelatedTickers: candidates,"
)

with open('server.ts', 'w') as f:
    f.write(text)
