import re

with open('server.ts', 'r') as f:
    content = f.read()

new_init = """const loggerOptions = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
const yfOptions = { logger: loggerOptions, validation: { logErrors: false } };
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance(yfOptions) : new YahooFinance.default(yfOptions);
yahooFinance.suppressNotices = true;"""

content = content.replace("const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : new YahooFinance.default();", new_init)

with open('server.ts', 'w') as f:
    f.write(content)
