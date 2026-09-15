import re

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'const quote = await yahooFinance.quote("CLP=X");',
    'const quote = await yahooFinance.quote("CLP=X", {}, { validateResult: false });'
)

content = content.replace(
    'const chartRes = await yahooFinance.chart(symbol as string, {\n                period1,\n                period2,\n                interval: "1d"\n              });',
    'const chartRes = await yahooFinance.chart(symbol as string, {\n                period1,\n                period2,\n                interval: "1d"\n              }, { validateResult: false });'
)

content = content.replace(
    'const profile = await yahooFinance.quoteSummary(symbol as string, { modules: ["price", "summaryProfile", "quoteType", "fundProfile", "financialData", "defaultKeyStatistics", "summaryDetail"] });',
    'const profile = await yahooFinance.quoteSummary(symbol as string, { modules: ["price", "summaryProfile", "quoteType", "fundProfile", "financialData", "defaultKeyStatistics", "summaryDetail"] }, { validateResult: false });'
)

content = content.replace(
    'const q = await yahooFinance.quote(symbol as string);',
    'const q = await yahooFinance.quote(symbol as string, {}, { validateResult: false });'
)

content = content.replace(
    'const chartRes = await yahooFinance.chart(symbol, { period1, period2, interval: "1d" });',
    'const chartRes = await yahooFinance.chart(symbol, { period1, period2, interval: "1d" }, { validateResult: false });'
)

content = content.replace(
    'const profile = await yahooFinance.quoteSummary(symbol, { modules: ["financialData", "price"] }).catch(() => ({}));',
    'const profile = await yahooFinance.quoteSummary(symbol, { modules: ["financialData", "price"] }, { validateResult: false }).catch(() => ({}));'
)

content = content.replace(
    'const searchRes = await yahooFinance.search(symbol, { newsCount: 3 });',
    'const searchRes = await yahooFinance.search(symbol, { newsCount: 3 }, { validateResult: false });'
)

with open('server.ts', 'w') as f:
    f.write(content)
