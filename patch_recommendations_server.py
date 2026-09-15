import re

with open('server.ts', 'r') as f:
    text = f.read()

new_universe = 'const CANDIDATE_UNIVERSE = [\n    "AAPL","MSFT","GOOG","AMZN","META","TSLA","NVDA","AVGO","PEP","COST","CSCO",\n    "TMUS","ADBE","TXN","CMCSA","QCOM","AMGN","INTU","INTC","AMAT","HON","ISRG",\n    "BKNG","SBUX","MDLZ","GILD","LRCX","ADI","REGN","VRTX","ADP","MU","PANW",\n    "SNPS","MELI","CDNS","KLAC","CSX","PYPL","MAR","MNST","ORLY","ASML","FTNT",\n    "LULU","NXPI","CTAS","CHTR","KDP","ODFL", "CRWD", "WDAY", "MRVL", "ROST", "KHC",\n    "PCAR", "DXCM", "PAYX", "CPRT", "IDXX", "AEP", "SIRI", "FAST", "EXC", "CEG",\n    "BIIB", "CTSH", "DDOG", "CSGP", "GEHC", "VRSK", "EA", "BKR", "FANG", "ON", "ANSS",\n    "MCHP", "CDW", "DLTR", "TEAM", "TTD", "WBD", "ZS", "ILMN", "WBA", "SPLK", "ALGN"\n  ];'

old_pattern = r'const CANDIDATE_UNIVERSE = \["AAPL", "MSFT", "AMZN", "TLT", "GLD"\];'
text = text.replace(old_pattern, new_universe)

# Now we need to update the logic to fetch 6 months of data, not 1 year, and compute 6m high, drawdown, momentum (20d).
# In server.ts:
# const startDate = subYears(endDate, 1);
# We change to 6 months.

text = text.replace('const startDate = subYears(endDate, 1);', 'const startDate = subMonths(endDate, 6);')

# We need to change the math in the server for each candidate:
math_block_old = """
            const sixMonthsAgoIdx = Math.floor(result.length / 2);
            const sixMonthPrice = result[sixMonthsAgoIdx].adjClose;
            const sixMonthReturn = (currentPrice - sixMonthPrice) / sixMonthPrice;
            
            return {
               symbol,
               expectedGrowth,
               sixMonthReturn,
               pricesByDate,
            };
"""

math_block_new = """
            // Calculate metrics for recommendations
            let sixMonthHigh = -Infinity;
            for (const row of result) {
              if (row.adjClose > sixMonthHigh) sixMonthHigh = row.adjClose;
            }
            
            const drawdown = (currentPrice - sixMonthHigh) / sixMonthHigh;
            
            // Momentum 20D
            const lookback = Math.min(20, result.length - 1);
            let momentum20D = 0;
            if (lookback > 0) {
              const oldPrice = result[result.length - 1 - lookback].adjClose;
              momentum20D = (currentPrice - oldPrice) / oldPrice;
            }

            return {
               symbol,
               currentPrice,
               sixMonthHigh,
               drawdown,
               momentum20D,
               pricesByDate,
            };
"""

text = text.replace(math_block_old, math_block_new)

with open('server.ts', 'w') as f:
    f.write(text)

